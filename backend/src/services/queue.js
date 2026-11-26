// Core queue logic shared by the public and staff routes. All SQL is parameterized.
import { timingSafeEqual } from "node:crypto";
import { pool, withTransaction } from "../db/pool.js";
import { HttpError } from "../lib/errors.js";
import { hashToken, newToken } from "../lib/tokens.js";

// ---------- The line ----------
// Walk-ins are in line as soon as they join. Appointments are in line only once checked in (by the visitor
// during the check-in window, or by staff).
const IN_LINE = "t.status = 'waiting' AND (t.scheduled_for IS NULL OR t.checked_in_at IS NOT NULL)";
// Booked for today but not checked in yet, so not in line.
const AWAITING_CHECK_IN = "t.status = 'waiting' AND t.scheduled_for IS NOT NULL AND t.checked_in_at IS NULL";

// Calling order:
//   1. Priority lane (seniors, PWDs, pregnant, urgent).
//   2. Checked-in appointments whose booked time has come, so they're served on time.
//   3. Everyone else, longest waiting first. (An appointment that checked in early sits here until its time,
//      so it can still be served early when counters are free.)
// queue_at is the join time for walk-ins and the booked time for appointments.
const QUEUE_TIER = "CASE WHEN t.priority <> 'none' THEN 0 WHEN t.scheduled_for IS NOT NULL AND t.scheduled_for <= now() THEN 1 ELSE 2 END";
const QUEUE_ORDER = `${QUEUE_TIER}, t.queue_at, t.created_at, t.id`;

// Wait in minutes, from joining the line (or the booked time) to being called. Never negative: an appointment
// served before its time counts as zero wait.
const WAIT_MINUTES = "GREATEST(0, extract(epoch FROM (t.called_at - t.queue_at)) / 60)";

export const SLOT_TIMES = Array.from({ length: 18 }, (_, i) => {
    const minutes = 8 * 60 + i * 30;
    return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
});
export const MAX_BOOKING_DAYS = 30;
export const SLOT_CAPACITY = 4;
const MAX_TICKETS_PER_PREFIX_PER_DAY = 9999;

// Appointment check-in window around the booked time. Missing it expires the booking as a no-show.
export const CHECK_IN_EARLY_MINUTES = 15;
export const CHECK_IN_LATE_MINUTES = 15;

export const MAX_COUNTERS = 99;

// "YYYY-MM-DD" for the current day in the branch's timezone.
export function todayIn(timezone) {
    return new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

export function addDays(day, days) {
    const date = new Date(`${day}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
}

function timeIn(date, timezone) {
    return date.toLocaleTimeString("en-US", { timeZone: timezone, hour: "numeric", minute: "2-digit" });
}

function checkInWindow(scheduledFor) {
    const at = new Date(scheduledFor).getTime();
    return {
        opensAt: new Date(at - CHECK_IN_EARLY_MINUTES * 60_000),
        closesAt: new Date(at + CHECK_IN_LATE_MINUTES * 60_000),
    };
}

// All counters serve all services from one shared line, so a wait estimate is the total service time of everyone
// ahead, split across the branch's counters.
function estimateMinutes(minutesAhead, counterCount) {
    return Math.ceil(minutesAhead / Math.max(counterCount, 1));
}

export async function getBranchBySlug(slug) {
    const { rows } = await pool.query("SELECT id, name, slug, timezone, counter_count FROM branches WHERE slug = $1", [slug]);
    return rows[0] ?? null;
}

export async function getCounterCount(branchId, db = pool) {
    const { rows } = await db.query("SELECT counter_count FROM branches WHERE id = $1", [branchId]);
    return rows[0]?.counter_count ?? 0;
}

// Everyone in line right now and their combined expected service time.
async function branchLoad(branchId, today) {
    const { rows } = await pool.query(
        `SELECT count(*)::int AS waiting, COALESCE(sum(s.avg_service_minutes), 0)::int AS minutes
         FROM tickets t JOIN services s ON s.id = t.service_id
         WHERE t.branch_id = $1 AND t.day = $2 AND ${IN_LINE}`,
        [branchId, today],
    );
    return rows[0];
}

async function latestCalled(branchId, today) {
    const { rows } = await pool.query(
        "SELECT number FROM tickets WHERE branch_id = $1 AND day = $2 AND called_at IS NOT NULL ORDER BY called_at DESC LIMIT 1",
        [branchId, today],
    );
    return rows[0]?.number ?? null;
}

// ---------- Public ----------

export async function listServices(branch) {
    const today = todayIn(branch.timezone);
    const [{ rows }, load] = await Promise.all([
        pool.query(
            `SELECT s.id, s.code, s.name, s.description, s.icon, s.prefix, s.is_open,
                    (SELECT count(*)::int FROM tickets t
                      WHERE t.service_id = s.id AND t.day = $2 AND ${IN_LINE}) AS waiting,
                    (SELECT t.number FROM tickets t
                      WHERE t.service_id = s.id AND t.day = $2 AND t.called_at IS NOT NULL
                      ORDER BY t.called_at DESC LIMIT 1) AS now_serving
             FROM services s WHERE s.branch_id = $1 ORDER BY s.sort_order, s.name`,
            [branch.id, today],
        ),
        branchLoad(branch.id, today),
    ]);
    // One shared line: a new walk-in waits behind everyone, whichever service they pick.
    const estimatedWaitMinutes = estimateMinutes(load.minutes, branch.counter_count);
    return rows.map((s) => ({
        id: s.id,
        code: s.code,
        name: s.name,
        description: s.description,
        icon: s.icon,
        prefix: s.prefix,
        isOpen: s.is_open,
        waiting: s.waiting,
        nowServing: s.now_serving,
        estimatedWaitMinutes,
    }));
}

export function createTicket(branch, details) {
    return withTransaction((client) => insertTicket(client, branch, details));
}

// Creates a ticket inside the caller's transaction (shared by joining and rescheduling).
async function insertTicket(client, branch, { serviceId, mode, date, time, name, phone, priority }) {
    const today = todayIn(branch.timezone);
    const serviceResult = await client.query(
        "SELECT id, prefix, is_open FROM services WHERE id = $1 AND branch_id = $2",
        [serviceId, branch.id],
    );
    const service = serviceResult.rows[0];
    if (!service) throw new HttpError(400, "That service isn't available at this branch.", "serviceId");
    if (!service.is_open) throw new HttpError(409, "This queue is paused right now. Please try again later.", "serviceId");

    let scheduledFor = null;
    let day = today;

    if (mode === "appointment") {
        if (date < today || date > addDays(today, MAX_BOOKING_DAYS)) {
            throw new HttpError(400, `Choose a date within the next ${MAX_BOOKING_DAYS} days.`, "date");
        }
        const slot = await client.query(
            "SELECT ($1::date + $2::time) AT TIME ZONE $3 AS at, (($1::date + $2::time) AT TIME ZONE $3) > now() AS future",
            [date, time, branch.timezone],
        );
        if (!slot.rows[0].future) throw new HttpError(400, "That time has already passed. Choose a later slot.", "time");
        scheduledFor = slot.rows[0].at;
        day = date;

        // Serialize bookings for this slot so two people can't both take the last place.
        await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`${service.id}|${scheduledFor.toISOString()}`]);
        const taken = await client.query(
            "SELECT count(*)::int AS n FROM tickets WHERE service_id = $1 AND scheduled_for = $2 AND status NOT IN ('cancelled')",
            [service.id, scheduledFor],
        );
        if (taken.rows[0].n >= SLOT_CAPACITY) throw new HttpError(409, "That time slot is full. Please choose another.", "time");
    }

    const prefix = priority !== "none" ? "P" : service.prefix;
    const sequence = await client.query(
        `INSERT INTO ticket_sequences (branch_id, prefix, day, last_value) VALUES ($1, $2, $3, 1)
         ON CONFLICT (branch_id, prefix, day) DO UPDATE SET last_value = ticket_sequences.last_value + 1
         RETURNING last_value`,
        [branch.id, prefix, day],
    );
    const value = sequence.rows[0].last_value;
    if (value > MAX_TICKETS_PER_PREFIX_PER_DAY) throw new HttpError(409, "This queue is full for the day.");
    const number = `${prefix}-${String(value).padStart(3, "0")}`;

    const token = newToken();
    const inserted = await client.query(
        `INSERT INTO tickets (branch_id, service_id, number, day, customer_name, phone, priority, scheduled_for, queue_at, access_token_hash)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, COALESCE($8, now()), $9)
         RETURNING id`,
        [branch.id, service.id, number, day, name, phone, priority, scheduledFor, hashToken(token)],
    );

    return { id: inserted.rows[0].id, number, day, token, scheduledFor };
}

// Moves a booking that hasn't checked in yet to a new date/time, in one transaction: the old booking is cancelled
// and a new ticket is issued for the new slot (numbers are per day). If the new slot is full or invalid, nothing changes.
export function rescheduleAppointment(branch, number, ownerCookie, { date, time }) {
    if (!ownerCookie) throw new HttpError(404, "This appointment can't be changed from this device.");
    return withTransaction(async (client) => {
        const { rows } = await client.query(
            `SELECT id, service_id, customer_name, phone, priority, scheduled_for, access_token_hash
             FROM tickets
             WHERE id = $1 AND branch_id = $2 AND number = $3
               AND status = 'waiting' AND scheduled_for IS NOT NULL AND checked_in_at IS NULL
             FOR UPDATE`,
            [ownerCookie.id, branch.id, number],
        );
        const old = rows[0];
        if (!old || !ownsTicket(ownerCookie, old)) throw new HttpError(404, "This appointment can't be changed from this device.");

        const slot = await client.query("SELECT ($1::date + $2::time) AT TIME ZONE $3 AS at", [date, time, branch.timezone]);
        if (slot.rows[0].at.getTime() === old.scheduled_for.getTime()) {
            throw new HttpError(400, "That's already your appointment time. Choose a different slot.", "time");
        }

        // Cancel first so the old booking doesn't count against the new slot; a later error rolls this back.
        await client.query("UPDATE tickets SET status = 'cancelled', finished_at = now() WHERE id = $1", [old.id]);
        return insertTicket(client, branch, {
            serviceId: old.service_id,
            mode: "appointment",
            date,
            time,
            name: old.customer_name,
            phone: old.phone,
            priority: old.priority,
        });
    });
}

function ownsTicket(ownerCookie, ticket) {
    if (!ownerCookie || ownerCookie.id !== ticket.id) return false;
    const presented = hashToken(ownerCookie.token);
    return presented.length === ticket.access_token_hash.length && timingSafeEqual(presented, ticket.access_token_hash);
}

// "scheduled" = a booking that hasn't checked in yet (not in line).
function publicStatus(ticket) {
    return ticket.status === "waiting" && ticket.scheduled_for && !ticket.checked_in_at ? "scheduled" : ticket.status;
}

// The ticket this browser holds (from its ticket cookie) if it's still active: booked, in line, or called.
// Used to stop one visitor holding several places in line at once.
export async function getActiveTicketForOwner(branch, ownerCookie) {
    if (!ownerCookie) return null;
    const { rows } = await pool.query(
        `SELECT id, number, day::text AS day, status, scheduled_for, checked_in_at, access_token_hash
         FROM tickets
         WHERE id = $1 AND branch_id = $2 AND status IN ('waiting', 'called') AND day >= $3`,
        [ownerCookie.id, branch.id, todayIn(branch.timezone)],
    );
    const ticket = rows[0];
    if (!ticket || !ownsTicket(ownerCookie, ticket)) return null;
    return { number: ticket.number, day: ticket.day, status: publicStatus(ticket) };
}

// Public ticket status. Never includes the visitor's name or phone.
// Numbers restart every day, so a ticket is identified by number + day (default: today).
export async function getTicketStatus(branch, number, requestedDay, ownerCookie) {
    const today = todayIn(branch.timezone);
    const day = requestedDay ?? today;
    if (day < today || day > addDays(today, MAX_BOOKING_DAYS)) return null;
    const { rows } = await pool.query(
        `SELECT t.id, t.number, t.status, t.priority, t.scheduled_for, t.checked_in_at, t.counter, t.recall_count,
                t.access_token_hash, s.name AS service_name, s.code AS service_code
         FROM tickets t JOIN services s ON s.id = t.service_id
         WHERE t.branch_id = $1 AND t.number = $2 AND t.day = $3`,
        [branch.id, number, day],
    );
    const ticket = rows[0];
    if (!ticket) return null;

    const status = publicStatus(ticket);
    let ahead = null;
    let minutesAhead = 0;
    if (status === "waiting" && day === today) {
        // Position in the branch's single shared line, using exactly the order Call Next uses.
        const position = await pool.query(
            `WITH line AS (
                SELECT t.id,
                       row_number() OVER w - 1 AS ahead,
                       COALESCE(sum(s.avg_service_minutes) OVER (w ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING), 0) AS minutes
                FROM tickets t JOIN services s ON s.id = t.service_id
                WHERE t.branch_id = $1 AND t.day = $2 AND ${IN_LINE}
                WINDOW w AS (ORDER BY ${QUEUE_ORDER})
             )
             SELECT ahead::int, minutes::int FROM line WHERE id = $3`,
            [branch.id, today, ticket.id],
        );
        ahead = position.rows[0]?.ahead ?? 0;
        minutesAhead = position.rows[0]?.minutes ?? 0;
    }

    let checkIn = null;
    if (ticket.scheduled_for) {
        const { opensAt, closesAt } = checkInWindow(ticket.scheduled_for);
        const now = Date.now();
        checkIn = {
            opensAt,
            closesAt,
            isOpen: status === "scheduled" && now >= opensAt.getTime() && now <= closesAt.getTime(),
            checkedInAt: ticket.checked_in_at,
        };
    }

    return {
        number: ticket.number,
        day,
        status,
        service: { name: ticket.service_name, code: ticket.service_code },
        priority: ticket.priority,
        ahead,
        estimatedMinutes: ahead === null ? null : estimateMinutes(minutesAhead, branch.counter_count),
        nowServing: await latestCalled(branch.id, today),
        counter: ticket.counter,
        recallCount: ticket.recall_count,
        scheduledFor: ticket.scheduled_for,
        checkIn,
        isOwner: ownsTicket(ownerCookie, ticket),
    };
}

// Visitor checks in for their own appointment (proved by the ticket cookie), only inside the check-in window.
export async function checkInByOwner(branch, number, ownerCookie) {
    if (!ownerCookie) throw new HttpError(404, "This ticket can't be checked in from this device.");
    return withTransaction(async (client) => {
        const { rows } = await client.query(
            `SELECT id, status, scheduled_for, checked_in_at, access_token_hash FROM tickets
             WHERE id = $1 AND branch_id = $2 AND number = $3 FOR UPDATE`,
            [ownerCookie.id, branch.id, number],
        );
        const ticket = rows[0];
        if (!ticket || !ownsTicket(ownerCookie, ticket)) throw new HttpError(404, "This ticket can't be checked in from this device.");
        if (!ticket.scheduled_for) throw new HttpError(409, "Walk-in tickets are already in line.");
        if (ticket.checked_in_at) throw new HttpError(409, "You're already checked in.");
        if (ticket.status !== "waiting") throw new HttpError(409, "This booking is no longer active. Please join the queue again.");

        const { opensAt, closesAt } = checkInWindow(ticket.scheduled_for);
        const now = Date.now();
        if (now < opensAt.getTime()) {
            throw new HttpError(409, `Check-in opens at ${timeIn(opensAt, branch.timezone)}, ${CHECK_IN_EARLY_MINUTES} minutes before your appointment.`);
        }
        if (now > closesAt.getTime()) {
            throw new HttpError(409, "Your check-in window has passed. Please see the staff or join the queue as a walk-in.");
        }

        await client.query("UPDATE tickets SET checked_in_at = now() WHERE id = $1", [ticket.id]);
    });
}

export async function cancelTicket(branch, number, ownerCookie) {
    if (!ownerCookie) return false;
    const { rowCount } = await pool.query(
        `UPDATE tickets SET status = 'cancelled', finished_at = now()
         WHERE id = $1 AND branch_id = $2 AND number = $3 AND access_token_hash = $4 AND status = 'waiting'`,
        [ownerCookie.id, branch.id, number, hashToken(ownerCookie.token)],
    );
    return rowCount === 1;
}

// Lobby display: one card per counter with the ticket it's serving. Numbers and counters only, never names.
export async function getDisplay(branch) {
    const today = todayIn(branch.timezone);
    const [called, upNext] = await Promise.all([
        pool.query(
            `SELECT t.counter, t.number, t.called_at FROM tickets t
             WHERE t.branch_id = $1 AND t.day = $2 AND t.status = 'called' AND t.counter IS NOT NULL`,
            [branch.id, today],
        ),
        pool.query(
            `SELECT t.number FROM tickets t
             WHERE t.branch_id = $1 AND t.day = $2 AND ${IN_LINE}
             ORDER BY ${QUEUE_ORDER} LIMIT 6`,
            [branch.id, today],
        ),
    ]);
    const servingAt = new Map(called.rows.map((r) => [r.counter, { number: r.number, calledAt: r.called_at }]));
    // A counter still serving after the count was lowered stays visible until it finishes.
    const highest = Math.max(branch.counter_count, ...called.rows.map((r) => r.counter));
    return {
        branch: { name: branch.name },
        counters: Array.from({ length: highest }, (_, i) => ({ counter: i + 1, serving: servingAt.get(i + 1) ?? null })),
        upNext: upNext.rows.map((r) => r.number),
    };
}

// Bookings whose check-in window closed without a check-in become no-shows. Returns the affected branch ids.
export async function expireMissedCheckIns() {
    const { rows } = await pool.query(
        `UPDATE tickets t SET status = 'no_show', finished_at = now()
         WHERE ${AWAITING_CHECK_IN} AND t.scheduled_for + make_interval(mins => $1) < now()
         RETURNING t.branch_id`,
        [CHECK_IN_LATE_MINUTES],
    );
    return [...new Set(rows.map((r) => r.branch_id))];
}

// ---------- Staff (always scoped to the signed-in user's branch) ----------

async function todayStats(branch, today) {
    const { rows } = await pool.query(
        `SELECT count(*) FILTER (WHERE ${IN_LINE})::int AS waiting_now,
                count(*) FILTER (WHERE ${AWAITING_CHECK_IN})::int AS scheduled_later,
                count(*) FILTER (WHERE t.status = 'completed')::int AS served_today,
                count(*) FILTER (WHERE t.status = 'no_show')::int AS no_shows,
                count(*) FILTER (WHERE t.status = 'completed' AND t.priority <> 'none')::int AS priority_served,
                COALESCE(round(avg(${WAIT_MINUTES}) FILTER (WHERE t.called_at IS NOT NULL)), 0)::int AS avg_wait_minutes
         FROM tickets t WHERE t.branch_id = $1 AND t.day = $2`,
        [branch.id, today],
    );
    const s = rows[0];
    return {
        waitingNow: s.waiting_now,
        scheduledLater: s.scheduled_later,
        servedToday: s.served_today,
        noShows: s.no_shows,
        avgWaitMinutes: s.avg_wait_minutes,
        priorityServed: s.priority_served,
    };
}

function staffTicket(row) {
    return {
        id: row.id,
        number: row.number,
        customerName: row.customer_name,
        service: { id: row.service_id, name: row.service_name },
        priority: row.priority,
        status: row.status,
        queueAt: row.queue_at,
        scheduledFor: row.scheduled_for,
        checkedInAt: row.checked_in_at,
        counter: row.counter,
        recallCount: row.recall_count,
        calledAt: row.called_at,
    };
}

const STAFF_TICKET_COLUMNS = `t.id, t.number, t.customer_name, t.service_id, s.name AS service_name, t.priority, t.status,
    t.queue_at, t.scheduled_for, t.checked_in_at, t.counter, t.recall_count, t.called_at`;

export async function getOverview(user, branch) {
    const today = todayIn(branch.timezone);
    const [stats, waiting, active, appointments, services, counterCount] = await Promise.all([
        todayStats(branch, today),
        pool.query(
            `SELECT ${STAFF_TICKET_COLUMNS} FROM tickets t JOIN services s ON s.id = t.service_id
             WHERE t.branch_id = $1 AND t.day = $2 AND ${IN_LINE}
             ORDER BY ${QUEUE_ORDER} LIMIT 100`,
            [branch.id, today],
        ),
        // Every counter that is serving someone right now in this branch.
        pool.query(
            `SELECT ${STAFF_TICKET_COLUMNS}, (t.called_by = $3 OR $4) AS can_act
             FROM tickets t JOIN services s ON s.id = t.service_id
             WHERE t.branch_id = $1 AND t.day = $2 AND t.status = 'called'
             ORDER BY t.counter`,
            [branch.id, today, user.id, user.role === "admin"],
        ),
        // Today's bookings that haven't checked in yet, earliest first.
        pool.query(
            `SELECT ${STAFF_TICKET_COLUMNS} FROM tickets t JOIN services s ON s.id = t.service_id
             WHERE t.branch_id = $1 AND t.day = $2 AND ${AWAITING_CHECK_IN}
             ORDER BY t.scheduled_for, t.created_at LIMIT 100`,
            [branch.id, today],
        ),
        pool.query("SELECT id, name, is_open FROM services WHERE branch_id = $1 ORDER BY sort_order, name", [branch.id]),
        getCounterCount(branch.id),
    ]);
    return {
        stats,
        waiting: waiting.rows.map(staffTicket),
        // Only the staff member who called a ticket (or an admin) can recall/complete it.
        active: active.rows.map((row) => ({ ...staffTicket(row), canAct: row.can_act })),
        appointments: appointments.rows.map(staffTicket),
        checkInWindow: { earlyMinutes: CHECK_IN_EARLY_MINUTES, lateMinutes: CHECK_IN_LATE_MINUTES },
        services: services.rows.map((s) => ({ id: s.id, name: s.name, isOpen: s.is_open })),
        counterCount,
    };
}

// Staff check in a visitor who arrived at the desk. Allowed any time on the day (staff discretion), before expiry.
export async function checkInByStaff(branch, ticketId) {
    const today = todayIn(branch.timezone);
    const { rows } = await pool.query(
        `UPDATE tickets t SET checked_in_at = now()
         FROM services s
         WHERE t.id = $1 AND t.branch_id = $2 AND t.day = $3 AND ${AWAITING_CHECK_IN} AND s.id = t.service_id
         RETURNING ${STAFF_TICKET_COLUMNS}`,
        [ticketId, branch.id, today],
    );
    if (!rows[0]) throw new HttpError(404, "That booking isn't waiting for check-in today.");
    return staffTicket(rows[0]);
}

export async function callNext(user, branch, { serviceId, counter }) {
    const today = todayIn(branch.timezone);
    try {
        return await withTransaction(async (client) => {
            const counterCount = await getCounterCount(branch.id, client);
            if (counter > counterCount) {
                throw new HttpError(409, `Counter ${counter} isn't open. This branch has ${counterCount} open ${counterCount === 1 ? "counter" : "counters"}.`);
            }

            const busy = await client.query(
                "SELECT number FROM tickets WHERE branch_id = $1 AND day = $2 AND counter = $3 AND status = 'called'",
                [branch.id, today, counter],
            );
            if (busy.rowCount) {
                throw new HttpError(409, `Counter ${counter} is still serving ${busy.rows[0].number}. Complete or mark it first, or switch to another counter.`);
            }

            // SKIP LOCKED lets several counters call at once without ever getting the same ticket.
            const next = await client.query(
                `SELECT t.id FROM tickets t JOIN services s ON s.id = t.service_id
                 WHERE t.branch_id = $1 AND t.day = $2 AND ${IN_LINE} AND s.is_open
                   AND ($3::uuid IS NULL OR t.service_id = $3)
                 ORDER BY ${QUEUE_ORDER} LIMIT 1
                 FOR UPDATE OF t SKIP LOCKED`,
                [branch.id, today, serviceId],
            );
            if (!next.rowCount) throw new HttpError(404, "No one is waiting right now.");

            const { rows } = await client.query(
                `UPDATE tickets t SET status = 'called', called_at = now(), called_by = $2, counter = $3
                 FROM services s WHERE t.id = $1 AND s.id = t.service_id
                 RETURNING ${STAFF_TICKET_COLUMNS}`,
                [next.rows[0].id, user.id, counter],
            );
            return staffTicket(rows[0]);
        });
    } catch (error) {
        if (error.code === "23505" && error.constraint === "tickets_one_call_per_counter_idx") {
            throw new HttpError(409, `Counter ${counter} is already serving someone. Complete or mark it first, or switch to another counter.`);
        }
        throw error;
    }
}

const ACTIONS = {
    recall: "recall_count = t.recall_count + 1",
    complete: "status = 'completed', finished_at = now()",
    "no-show": "status = 'no_show', finished_at = now()",
};

export async function actOnTicket(user, branch, ticketId, action) {
    const { rows } = await pool.query(
        `UPDATE tickets t SET ${ACTIONS[action]}
         FROM services s
         WHERE t.id = $1 AND t.branch_id = $2 AND t.status = 'called' AND s.id = t.service_id
           AND (t.called_by = $3 OR $4)
         RETURNING ${STAFF_TICKET_COLUMNS}`,
        [ticketId, branch.id, user.id, user.role === "admin"],
    );
    if (!rows[0]) throw new HttpError(404, "That ticket isn't being served, or another staff member called it.");
    return staffTicket(rows[0]);
}

export async function listQueues(branch) {
    const today = todayIn(branch.timezone);
    const { rows } = await pool.query(
        `SELECT s.id, s.code, s.name, s.icon, s.prefix, s.avg_service_minutes, s.is_open,
                (SELECT count(*)::int FROM tickets t
                  WHERE t.service_id = s.id AND t.day = $2 AND ${IN_LINE}) AS waiting,
                (SELECT t.number FROM tickets t WHERE t.service_id = s.id AND t.day = $2 AND t.called_at IS NOT NULL
                  ORDER BY t.called_at DESC LIMIT 1) AS now_serving,
                (SELECT COALESCE(round(avg(${WAIT_MINUTES})), 0)::int FROM tickets t
                  WHERE t.service_id = s.id AND t.day = $2 AND t.called_at IS NOT NULL) AS avg_wait_minutes
         FROM services s WHERE s.branch_id = $1 ORDER BY s.sort_order, s.name`,
        [branch.id, today],
    );
    return rows.map((s) => ({
        id: s.id,
        code: s.code,
        name: s.name,
        icon: s.icon,
        prefix: s.prefix,
        avgServiceMinutes: s.avg_service_minutes,
        isOpen: s.is_open,
        waiting: s.waiting,
        nowServing: s.now_serving,
        avgWaitMinutes: s.avg_wait_minutes,
    }));
}

export async function updateService(branch, serviceId, { isOpen, avgServiceMinutes }) {
    const { rowCount } = await pool.query(
        `UPDATE services SET is_open = COALESCE($3, is_open), avg_service_minutes = COALESCE($4, avg_service_minutes)
         WHERE id = $1 AND branch_id = $2`,
        [serviceId, branch.id, isOpen, avgServiceMinutes],
    );
    if (!rowCount) throw new HttpError(404, "Service not found.");
}

export async function setCounterCount(branch, counterCount) {
    await pool.query("UPDATE branches SET counter_count = $2 WHERE id = $1", [branch.id, counterCount]);
}

export async function getAnalytics(branch) {
    const today = todayIn(branch.timezone);
    const [stats, hourly, byService] = await Promise.all([
        todayStats(branch, today),
        pool.query(
            `SELECT extract(hour FROM t.called_at AT TIME ZONE $3)::int AS hour,
                    round(avg(${WAIT_MINUTES}))::int AS minutes
             FROM tickets t WHERE t.branch_id = $1 AND t.day = $2 AND t.called_at IS NOT NULL
             GROUP BY 1 ORDER BY 1`,
            [branch.id, today, branch.timezone],
        ),
        pool.query(
            `SELECT s.name, count(t.id) FILTER (WHERE t.status = 'completed')::int AS served
             FROM services s LEFT JOIN tickets t ON t.service_id = s.id AND t.day = $2
             WHERE s.branch_id = $1 GROUP BY s.id ORDER BY s.sort_order, s.name`,
            [branch.id, today],
        ),
    ]);
    return {
        stats,
        hourlyWait: hourly.rows,
        servedByService: byService.rows,
    };
}
