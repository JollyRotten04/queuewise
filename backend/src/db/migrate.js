import { readFile } from "node:fs/promises";
import { pool } from "./pool.js";

const sql = await readFile(new URL("./schema.sql", import.meta.url), "utf8");

try {
    await pool.query(sql);
    console.log("Database schema is up to date.");
} catch (error) {
    console.error("Migration failed:", error.code ?? "", error.message);
    process.exitCode = 1;
} finally {
    await pool.end();
}
