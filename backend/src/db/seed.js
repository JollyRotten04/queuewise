// Creates the public demo branch ("main") with default services, and optionally a demo admin.
import { config } from "../config.js";
import { pool, withTransaction } from "./pool.js";
import { insertDefaultServices } from "../services/defaults.js";
import { hashPassword } from "../lib/password.js";
import { EMAIL_PATTERN } from "../lib/validate.js";

const adminEmail = (process.env.SEED_ADMIN_EMAIL ?? "").trim().toLowerCase();
const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "";

try {
    await withTransaction(async (client) => {
        let { rows } = await client.query("SELECT id FROM branches WHERE slug = 'main'");
        let branchId = rows[0]?.id;

        if (!branchId) {
            const org = await client.query("INSERT INTO organizations (name) VALUES ('QueueWise Demo') RETURNING id");
            ({ rows } = await client.query(
                "INSERT INTO branches (organization_id, name, slug, timezone) VALUES ($1, 'Main Branch', 'main', $2) RETURNING id",
                [org.rows[0].id, config.defaultTimezone],
            ));
            branchId = rows[0].id;
            console.log("Created branch 'main'.");
        }

        await insertDefaultServices(client, branchId);

        if (adminEmail || adminPassword) {
            if (!EMAIL_PATTERN.test(adminEmail) || adminPassword.length < 12) {
                throw new Error("SEED_ADMIN_EMAIL must be a valid email and SEED_ADMIN_PASSWORD at least 12 characters.");
            }
            const result = await client.query(
                `INSERT INTO users (branch_id, email, name, password_hash, role)
                 VALUES ($1, $2, 'Demo Admin', $3, 'admin')
                 ON CONFLICT (email) DO NOTHING`,
                [branchId, adminEmail, await hashPassword(adminPassword)],
            );
            console.log(result.rowCount ? "Created demo admin user." : "Demo admin already exists; left unchanged.");
        }
    });
    console.log("Seed complete.");
} catch (error) {
    console.error("Seed failed:", error.code ?? "", error.message);
    process.exitCode = 1;
} finally {
    await pool.end();
}
