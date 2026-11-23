// Visitor-facing endpoints: no login needed. Mounted at /api/branches.
// Nothing here returns visitor names or phone numbers.
import express from "express";
import { clearCookie, parseCookies, setCookie } from "../lib/cookies.js";
import { HttpError } from "../lib/errors.js";
import { onBranchChange, notifyBranch } from "../lib/events.js";
import { rateLimit } from "../lib/rate-limit.js";
import { isTokenShaped } from "../lib/tokens.js";
import * as v from "../lib/validate.js";
import * as queue from "../services/queue.js";

const router = express.Router();
const MINUTE = 60 * 1000;

// Proves which ticket this browser created, so only its owner can cancel it.
const TICKET_COOKIE = "qw_ticket";
const TICKET_COOKIE_PATH = "/api/branches";
const DAY_SECONDS = 24 * 60 * 60;

function readTicketCookie(req) {
    const raw = parseCookies(req.headers.cookie)[TICKET_COOKIE];
    if (typeof raw !== "string") return null;
    const [id, token] = raw.split(".");
    if (!v.UUID_PATTERN.test(id ?? "") || !isTokenShaped(token)) return null;
    return { id: id.toLowerCase(), token };
}

function ticketNumber(value) {
    const number = typeof value === "string" ? value.toUpperCase() : "";
    if (!v.TICKET_NUMBER_PATTERN.test(number)) throw new HttpError(404, "Ticket not found.");
    return number;
}

router.param("slug", (req, res, next, slug) => {
    if (!v.SLUG_PATTERN.test(slug)) return next(new HttpError(404, "Branch not found."));
    queue.getBranchBySlug(slug)
        .then((branch) => {
            if (!branch) return next(new HttpError(404, "Branch not found."));
            req.publicBranch = branch;
            next();
        })
        .catch(next);
});

const readLimit = rateLimit("public-read", { windowMs: MINUTE, max: 120 });

router.get("/:slug", readLimit, async (req, res) => {
    const branch = req.publicBranch;
    res.json({
        branch: { name: branch.name, slug: branch.slug, timezone: branch.timezone },
        services: await queue.listServices(branch),
        booking: { slots: queue.SLOT_TIMES, maxDays: queue.MAX_BOOKING_DAYS, today: queue.todayIn(branch.timezone) },
    });
});

// A lobby kiosk shares one IP across many visitors, so this limit is generous but still caps abuse.
router.post("/:slug/tickets", rateLimit("join", { windowMs: 10 * MINUTE, max: 30 }), async (req, res) => {
    const input = v.body(req);
    const mode = v.oneOf(input.mode, "mode", ["walk-in", "appointment"]);
    const details = {
        serviceId: v.uuid(input.serviceId, "serviceId"),
        mode,
        name: v.string(input.name, "name", { min: 2, max: 60, pattern: v.NAME_PATTERN, label: "Name" }),
        phone: v.string(input.phone, "phone", { max: 16, pattern: v.PHONE_PATTERN, optional: true, label: "Mobile number" }),
        priority: v.oneOf(input.priority ?? "none", "priority", v.PRIORITIES),
        date: null,
        time: null,
    };
    if (input.consent !== true) throw new HttpError(400, "Consent is required to join the queue.", "consent");
    if (mode === "appointment") {
        details.date = v.string(input.date, "date", { pattern: /^\d{4}-\d{2}-\d{2}$/, label: "Date" });
        details.time = v.oneOf(input.time, "time", queue.SLOT_TIMES);
    }

    const branch = req.publicBranch;

    // One active ticket per browser: finish, cancel or miss the current one before taking another.
    const active = await queue.getActiveTicketForOwner(branch, readTicketCookie(req));
    if (active) {
        return res.status(409).json({
            error: `You already have ticket ${active.number}. Cancel it or wait until you're served before taking another.`,
            field: "activeTicket",
            activeTicket: active,
        });
    }

    const ticket = await queue.createTicket(branch, details);

    const lifetime = ticket.scheduledFor
        ? Math.min(Math.ceil((ticket.scheduledFor.getTime() - Date.now()) / 1000) + DAY_SECONDS, 32 * DAY_SECONDS)
        : DAY_SECONDS;
    setCookie(res, TICKET_COOKIE, `${ticket.id}.${ticket.token}`, { maxAgeSeconds: lifetime, path: TICKET_COOKIE_PATH });

    notifyBranch(branch.id);
    res.status(201).json({ number: ticket.number, day: ticket.day, scheduledFor: ticket.scheduledFor });
});

// Lets the join page show "you already have a ticket" instead of the form.
router.get("/:slug/my-ticket", readLimit, async (req, res) => {
    res.json({ ticket: await queue.getActiveTicketForOwner(req.publicBranch, readTicketCookie(req)) });
});

router.get("/:slug/tickets/:number", readLimit, async (req, res) => {
    const dayParam = req.query.day;
    const day = dayParam === undefined ? null : typeof dayParam === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dayParam) ? dayParam : "invalid";
    if (day === "invalid") throw new HttpError(404, "Ticket not found.");
    const status = await queue.getTicketStatus(req.publicBranch, ticketNumber(req.params.number), day, readTicketCookie(req));
    if (!status) throw new HttpError(404, "Ticket not found.");
    res.json(status);
});

router.post("/:slug/tickets/:number/cancel", rateLimit("cancel", { windowMs: 10 * MINUTE, max: 20 }), async (req, res) => {
    const cancelled = await queue.cancelTicket(req.publicBranch, ticketNumber(req.params.number), readTicketCookie(req));
    if (!cancelled) throw new HttpError(404, "This ticket can't be cancelled from this device.");
    clearCookie(res, TICKET_COOKIE, TICKET_COOKIE_PATH);
    notifyBranch(req.publicBranch.id);
    res.json({ status: "cancelled" });
});

router.get("/:slug/display", readLimit, async (req, res) => {
    res.json(await queue.getDisplay(req.publicBranch));
});

// Server-Sent Events: tells open pages "something changed" so they re-fetch. Carries no data.
const MAX_STREAMS_TOTAL = 1000;
const MAX_STREAMS_PER_IP = 10;
let openStreams = 0;
const streamsByIp = new Map();

router.get("/:slug/events", (req, res) => {
    const ip = req.ip;
    const perIp = streamsByIp.get(ip) ?? 0;
    if (openStreams >= MAX_STREAMS_TOTAL || perIp >= MAX_STREAMS_PER_IP) {
        return res.status(429).json({ error: "Too many live connections." });
    }
    openStreams += 1;
    streamsByIp.set(ip, perIp + 1);

    res.set({
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
    });
    res.flushHeaders();
    res.write("retry: 5000\n\n");

    let pending = null;
    const unsubscribe = onBranchChange(req.publicBranch.id, () => {
        // Coalesce bursts of changes into one message.
        pending ??= setTimeout(() => {
            pending = null;
            res.write("event: change\ndata: {}\n\n");
        }, 250);
    });
    const heartbeat = setInterval(() => res.write(": ping\n\n"), 25_000);

    req.on("close", () => {
        clearInterval(heartbeat);
        clearTimeout(pending);
        unsubscribe();
        openStreams -= 1;
        const remaining = (streamsByIp.get(ip) ?? 1) - 1;
        if (remaining > 0) streamsByIp.set(ip, remaining);
        else streamsByIp.delete(ip);
    });
});

export default router;
