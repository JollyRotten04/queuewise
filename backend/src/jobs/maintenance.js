// Background jobs:
//   - every minute: tell open pages when bookings reach their time (they join the line automatically)
//   - every hour: delete expired sessions/reset links, and erase visitor personal data after the retention period
import { config } from "../config.js";
import { pool } from "../db/pool.js";
import { notifyBranch } from "../lib/events.js";
import { branchesWithBookingsJustDue } from "../services/queue.js";

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

async function runBookingsDue() {
    try {
        // Look back a little over a minute so a slow tick doesn't skip anyone.
        const branchIds = await branchesWithBookingsJustDue(75);
        // Let open ticket pages and dashboards refresh so the booking shows up in line.
        for (const branchId of branchIds) notifyBranch(branchId);
    } catch (error) {
        console.error("Bookings-due job failed:", error.code ?? "", error.message);
    }
}

async function runMaintenance() {
    try {
        await pool.query("DELETE FROM sessions WHERE expires_at < now()");
        await pool.query("DELETE FROM password_resets WHERE expires_at < now() - interval '1 day'");
        // Retention counts from the visit (the booked time for appointments), not from when the ticket was made,
        // so a booking made weeks ahead keeps its name until after the visit.
        const erased = await pool.query(
            `UPDATE tickets SET customer_name = NULL, phone = NULL
             WHERE GREATEST(created_at, COALESCE(scheduled_for, created_at)) < now() - make_interval(days => $1)
               AND (customer_name IS NOT NULL OR phone IS NOT NULL)`,
            [config.dataRetentionDays],
        );
        if (erased.rowCount) console.log(`Erased visitor details from ${erased.rowCount} old ticket(s).`);
    } catch (error) {
        console.error("Maintenance job failed:", error.code ?? "", error.message);
    }
}

export function startMaintenance() {
    runBookingsDue();
    runMaintenance();
    setInterval(runBookingsDue, MINUTE).unref();
    setInterval(runMaintenance, HOUR).unref();
}
