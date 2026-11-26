// Staff dashboard endpoints. Every route needs a session, and every query is limited to the user's own branch.
// Mounted at /api/staff.
import express from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { notifyBranch } from "../lib/events.js";
import { rateLimit } from "../lib/rate-limit.js";
import * as v from "../lib/validate.js";
import * as queue from "../services/queue.js";

const router = express.Router();

router.use(requireAuth);
router.use(rateLimit("staff", { windowMs: 60 * 1000, max: 300 }));

router.get("/overview", async (req, res) => {
    res.json({ ...(await queue.getOverview(req.user, req.branch)), branch: { name: req.branch.name, slug: req.branch.slug } });
});

router.post("/call-next", async (req, res) => {
    const input = v.body(req);
    const ticket = await queue.callNext(req.user, req.branch, {
        serviceId: v.uuid(input.serviceId, "serviceId", { optional: true }),
        counter: v.integer(input.counter, "counter", { min: 1, max: 99 }),
    });
    notifyBranch(req.branch.id);
    res.json(ticket);
});

// Check in a booked visitor who arrived at the desk.
router.post("/tickets/:id/check-in", async (req, res) => {
    const ticket = await queue.checkInByStaff(req.branch, v.uuid(req.params.id, "id"));
    notifyBranch(req.branch.id);
    res.json(ticket);
});

router.post("/tickets/:id/:action", async (req, res) => {
    const id = v.uuid(req.params.id, "id");
    const action = v.oneOf(req.params.action, "action", ["recall", "complete", "no-show"]);
    const ticket = await queue.actOnTicket(req.user, req.branch, id, action);
    notifyBranch(req.branch.id);
    res.json(ticket);
});

async function queuesResponse(req) {
    const [services, counterCount] = await Promise.all([queue.listQueues(req.branch), queue.getCounterCount(req.branch.id)]);
    return {
        services,
        counterCount,
        canManage: req.user.role === "admin",
        branch: { name: req.branch.name, slug: req.branch.slug },
    };
}

router.get("/queues", async (req, res) => {
    res.json(await queuesResponse(req));
});

// Only admins can change queue settings.
router.patch("/services/:id", requireRole("admin"), async (req, res) => {
    const input = v.body(req);
    await queue.updateService(req.branch, v.uuid(req.params.id, "id"), {
        isOpen: v.boolean(input.isOpen, "isOpen", { optional: true }),
        avgServiceMinutes: v.integer(input.avgServiceMinutes, "avgServiceMinutes", { min: 1, max: 240, optional: true }),
    });
    notifyBranch(req.branch.id);
    res.json(await queuesResponse(req));
});

// How many counters the branch has open. Every counter serves every service.
router.patch("/counters", requireRole("admin"), async (req, res) => {
    const input = v.body(req);
    await queue.setCounterCount(req.branch, v.integer(input.counterCount, "counterCount", { min: 0, max: queue.MAX_COUNTERS }));
    notifyBranch(req.branch.id);
    res.json(await queuesResponse(req));
});

router.get("/analytics", async (req, res) => {
    res.json(await queue.getAnalytics(req.branch));
});

export default router;
