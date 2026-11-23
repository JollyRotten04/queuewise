// Periodic clean-up: expired sessions/reset links, and erasing visitor personal data after the retention period.
import { config } from "../config.js";
import { pool } from "../db/pool.js";

const HOUR = 60 * 60 * 1000;

async function runMaintenance() {
    try {
        await pool.query("DELETE FROM sessions WHERE expires_at < now()");
        await pool.query("DELETE FROM password_resets WHERE expires_at < now() - interval '1 day'");
        const erased = await pool.query(
            `UPDATE tickets SET customer_name = NULL, phone = NULL
             WHERE created_at < now() - make_interval(days => $1) AND (customer_name IS NOT NULL OR phone IS NOT NULL)`,
            [config.dataRetentionDays],
        );
        if (erased.rowCount) console.log(`Erased visitor details from ${erased.rowCount} old ticket(s).`);
    } catch (error) {
        console.error("Maintenance job failed:", error.code ?? "", error.message);
    }
}

export function startMaintenance() {
    runMaintenance();
    return setInterval(runMaintenance, HOUR).unref();
}
