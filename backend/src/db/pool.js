import pg from "pg";
import { config } from "../config.js";

export const pool = new pg.Pool({
    connectionString: config.databaseUrl,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    // Stops a slow or runaway query from holding a connection forever.
    statement_timeout: 10_000,
});

// Log only the error code/message: pg error details can contain row values (emails, names).
pool.on("error", (err) => console.error("Postgres pool error:", err.code ?? "", err.message));

export async function withTransaction(work) {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const result = await work(client);
        await client.query("COMMIT");
        return result;
    } catch (error) {
        await client.query("ROLLBACK").catch(() => {});
        throw error;
    } finally {
        client.release();
    }
}
