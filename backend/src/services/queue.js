// Core queue logic shared by the public and staff routes. All SQL is parameterized.
import { timingSafeEqual } from "node:crypto";
import { pool, withTransaction } from "../db/pool.js";
import { HttpError } from "../lib/errors.js";
import { hashToken, newToken } from "../lib/tokens.js";

// Priority tickets first, then whoever has been in line longest.
const QUEUE_ORDER = "(t.priority <> 'none') DESC, t.queue_at ASC, t.created_at ASC, t.id ASC";

export const SLOT_TIMES = Array.from({ length: 18 }, (_, i) => {
    const minutes = 8 * 60 + i * 30;
    return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
});
export const MAX_BOOKING_DAYS = 30;
export const SLOT_CAPACITY = 4;
const MAX_TICKETS_PER_PREFIX_PER_DAY = 9999;

// "YYYY-MM-DD" for the current day in the branch's timezone.
export function todayIn(timezone) {
    return new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

export function addDays(day, days) {
    const date = new Date(`${day}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
}

function estimateMinutes(ahead, avgServiceMinutes, openCounters) {
    return Math.ceil((ahead * avgServiceMinutes) / Math.max(openCounters, 1));
}

export async function getBranchBySlug(slug) {
    const { rows } = await pool.query("SELECT id, name, slug, timezone FROM branches WHERE slug = $1", [slug]);
    return rows[0] ?? null;
}

// ---------- Public ----------

export async function listServices(branch) {
    const today = todayIn(branch.timezone);
    const { rows } = await pool.query(
        `SELECT s.id, s.code, s.name, s.description, s.icon, s.prefix, s.avg_service_minutes, s.open_counters, s.is_open,
                (SELECT count(*)::int FROM tickets t
                  WHERE t.service_id = s.id AND t.day = $2 AND t.status = 'waiting' AND t.queue_at <= now()) AS waiting,
                (SELECT t.number FROM tickets t
                  WHERE t.service_id = s.id AND t.day = $2 AND t.called_at IS NOT NULL
                  ORDER BY t.called_at DESC LIMIT 1) AS now_serving
         FROM services s WHERE s.branch_id = $1 ORDER BY s.sort_order, s.name`,
        [branch.id, today],
    );
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
        estimatedWaitMinutes: estimateMinutes(s.waiting, s.avg_service_minutes, s.open_counters),
    }));
}

export async function createTicket(branch, { serviceId, mode, date, time, name, phone, priority }) {
    const today = todayIn(branch.timezone);

    return withTransaction(async (client) => {
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
    });
}

function ownsTicket(ownerCookie, ticket) {
    if (!ownerCookie || ownerCookie.id !== ticket.id) return false;
    const presented = hashToken(ownerCookie.token);
    return presented.length === ticket.access_token_hash.length && timingSafeEqual(presented, ticket.access_token_hash);
}

// The ticket this browser holds (from its ticket cookie) if it's still active: waiting, booked for later, or called.
// Used to stop one visitor holding several places in line at once.
export async function getActiveTicketForOwner(branch, ownerCookie) {
    if (!ownerCookie) return null;
    const { rows } = await pool.query(
        `SELECT id, number, day::text AS day, status, (queue_at > now()) AS is_future, access_token_hash
         FROM tickets
         WHERE id = $1 AND branch_id = $2 AND status IN ('waiting', 'called') AND day >= $3`,
        [ownerCookie.id, branch.id, todayIn(branch.timezone)],
    );
    const ticket = rows[0];
    if (!ticket || !ownsTicket(ownerCookie, ticket)) return null;
    return {
        number: ticket.number,
        day: ticket.day,
        status: ticket.status === "waiting" && ticket.is_future ? "scheduled" : ticket.status,
    };
}

// Public ticket status. Never includes the visitor's name or phone.
// Numbers restart every day, so a ticket is identified by number + day (default: today).
export async function getTicketStatus(branch, number, requestedDay, ownerCookie) {
    const today = todayIn(branch.timezone);
    const day = requestedDay ?? today;
    if (day < today || day > addDays(today, MAX_BOOKING_DAYS)) return null;
    const { rows } = await pool.query(
        `SELECT t.id, t.number, t.status, t.priority, t.queue_at, t.created_at, t.scheduled_for, t.counter, t.recall_count,
                t.service_id, t.access_token_hash, (t.queue_at > now()) AS is_future,
                s.name AS service_name, s.code AS service_code, s.avg_service_minutes, s.open_counters
         FROM tickets t JOIN services s ON s.id = t.service_id
         WHERE t.branch_id = $1 AND t.number = $2 AND t.day = $3`,
        [branch.id, number, day],
    );
    const ticket = rows[0];
    if (!ticket) return null;

    const isWaitingNow = ticket.status === "waiting" && !ticket.is_future;
    let ahead = null;
    if (isWaitingNow) {
        const aheadResult = await pool.query(
            `SELECT count(*)::int AS ahead FROM tickets t
             WHERE t.service_id = $1 AND t.day = $2 AND t.status = 'waiting' AND t.queue_at <= now() AND t.id <> $3
               AND ((t.priority <> 'none') > $4
                    OR ((t.priority <> 'none') = $4 AND (t.queue_at, t.created_at, t.id) < ($5, $6, $3)))`,
            [ticket.service_id, today, ticket.id, ticket.priority !== "none", ticket.queue_at, ticket.created_at],
        );
        ahead = aheadResult.rows[0].ahead;
    }

    const serving = await pool.query(
        `SELECT number FROM tickets WHERE service_id = $1 AND day = $2 AND called_at IS NOT NULL ORDER BY called_at DESC LIMIT 1`,
        [ticket.service_id, today],
    );

    return {
        number: ticket.number,
        day,
        status: ticket.status === "waiting" && ticket.is_future ? "scheduled" : ticket.status,
        service: { name: ticket.service_name, code: ticket.service_code },
        priority: ticket.priority,
        ahead,
        estimatedMinutes: ahead === null ? null : estimateMinutes(ahead, ticket.avg_service_minutes, ticket.open_counters),
        nowServing: serving.rows[0]?.number ?? null,
        counter: ticket.counter,
        recallCount: ticket.recall_count,
        scheduledFor: ticket.scheduled_for,
        isOwner: ownsTicket(ownerCookie, ticket),
    };
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

// Lobby display: ticket numbers and counters only, never names.
export async function getDisplay(branch) {
    const today = todayIn(branch.timezone);
    const services = await pool.query(
        `SELECT s.id, s.code, s.name,
                (SELECT json_build_object('number', t.number, 'counter', t.counter, 'calledAt', t.called_at)
                   FROM tickets t WHERE t.service_id = s.id AND t.day = $2 AND t.called_at IS NOT NULL
                   ORDER BY t.called_at DESC LIMIT 1) AS serving
         FROM services s WHERE s.branch_id = $1 ORDER BY s.sort_order, s.name`,
        [branch.id, today],
    );
    const upNext = await pool.query(
        `SELECT t.number FROM tickets t
         WHERE t.branch_id = $1 AND t.day = $2 AND t.status = 'waiting' AND t.queue_at <= now()
         ORDER BY ${QUEUE_ORDER} LIMIT 6`,
        [branch.id, today],
    );
    return {
        branch: { name: branch.name },
        services: services.rows.map((s) => ({ id: s.id, code: s.code, name: s.name, serving: s.serving })),
        upNext: upNext.rows.map((r) => r.number),
    };
}

// ---------- Staff (always scoped to the signed-in user's branch) ----------

async function todayStats(branch, today) {
    const { rows } = await pool.query(
        `SELECT count(*) FILTER (WHERE status = 'waiting' AND queue_at <= now())::int AS waiting_now,
                count(*) FILTER (WHERE status = 'waiting' AND queue_at > now())::int AS scheduled_later,
                count(*) FILTER (WHERE status = 'completed')::int AS served_today,
                count(*) FILTER (WHERE status = 'no_show')::int AS no_shows,
                count(*) FILTER (WHERE status = 'completed' AND priority <> 'none')::int AS priority_served,
                COALESCE(round(avg(extract(epoch FROM (called_at - queue_at)) / 60) FILTER (WHERE called_at IS NOT NULL)), 0)::int AS avg_wait_minutes
         FROM tickets WHERE branch_id = $1 AND day = $2`,
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
        counter: row.counter,
        recallCount: row.recall_count,
        calledAt: row.called_at,
    };
}

const STAFF_TICKET_COLUMNS = `t.id, t.number, t.customer_name, t.service_id, s.name AS service_name, t.priority, t.status,
    t.queue_at, t.counter, t.recall_count, t.called_at`;

export async function getOverview(user, branch) {
    const today = todayIn(branch.timezone);
    const [stats, waiting, active, services] = await Promise.all([
        todayStats(branch, today),
        pool.query(
            `SELECT ${STAFF_TICKET_COLUMNS} FROM tickets t JOIN services s ON s.id = t.service_id
             WHERE t.branch_id = $1 AND t.day = $2 AND t.status = 'waiting' AND t.queue_at <= now()
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
        pool.query("SELECT id, name, is_open, open_counters FROM services WHERE branch_id = $1 ORDER BY sort_order, name", [branch.id]),
    ]);
    return {
        stats,
        waiting: waiting.rows.map(staffTicket),
        // Only the staff member who called a ticket (or an admin) can recall/complete it.
        active: active.rows.map((row) => ({ ...staffTicket(row), canAct: row.can_act })),
        services: services.rows.map((s) => ({ id: s.id, name: s.name, isOpen: s.is_open, openCounters: s.open_counters })),
    };
}

export async function callNext(user, branch, { serviceId, counter }) {
    const today = todayIn(branch.timezone);
    try {
        return await withTransaction(async (client) => {
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
                 WHERE t.branch_id = $1 AND t.day = $2 AND t.status = 'waiting' AND t.queue_at <= now() AND s.is_open
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
        `SELECT s.id, s.code, s.name, s.icon, s.prefix, s.avg_service_minutes, s.open_counters, s.is_open,
                (SELECT count(*)::int FROM tickets t
                  WHERE t.service_id = s.id AND t.day = $2 AND t.status = 'waiting' AND t.queue_at <= now()) AS waiting,
                (SELECT t.number FROM tickets t WHERE t.service_id = s.id AND t.day = $2 AND t.called_at IS NOT NULL
                  ORDER BY t.called_at DESC LIMIT 1) AS now_serving,
                (SELECT COALESCE(round(avg(extract(epoch FROM (t.called_at - t.queue_at)) / 60)), 0)::int FROM tickets t
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
        openCounters: s.open_counters,
        isOpen: s.is_open,
        waiting: s.waiting,
        nowServing: s.now_serving,
        avgWaitMinutes: s.avg_wait_minutes,
    }));
}

export async function updateService(branch, serviceId, { isOpen, openCounters, avgServiceMinutes }) {
    const { rowCount } = await pool.query(
        `UPDATE services SET is_open = COALESCE($3, is_open), open_counters = COALESCE($4, open_counters),
                avg_service_minutes = COALESCE($5, avg_service_minutes)
         WHERE id = $1 AND branch_id = $2`,
        [serviceId, branch.id, isOpen, openCounters, avgServiceMinutes],
    );
    if (!rowCount) throw new HttpError(404, "Service not found.");
}

export async function getAnalytics(branch) {
    const today = todayIn(branch.timezone);
    const [stats, hourly, byService] = await Promise.all([
        todayStats(branch, today),
        pool.query(
            `SELECT extract(hour FROM called_at AT TIME ZONE $3)::int AS hour,
                    round(avg(extract(epoch FROM (called_at - queue_at)) / 60))::int AS minutes
             FROM tickets WHERE branch_id = $1 AND day = $2 AND called_at IS NOT NULL
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
