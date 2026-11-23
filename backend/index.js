import express from "express";
import { config } from "./src/config.js";
import { pool } from "./src/db/pool.js";
import { startMaintenance } from "./src/jobs/maintenance.js";
import { HttpError } from "./src/lib/errors.js";
import { loadSession } from "./src/middleware/auth.js";
import { csrfGuard, securityHeaders } from "./src/middleware/security.js";
import authRoutes from "./src/routes/authRoutes.js";
import publicRoutes from "./src/routes/publicRoutes.js";
import staffRoutes from "./src/routes/staffRoutes.js";

const app = express();

app.disable("x-powered-by");
// The Next.js rewrite proxies requests, so trust it for the real client IP (used by rate limiting).
app.set("trust proxy", config.trustProxy);

// No CORS: the browser reaches this API only through the Next.js /api rewrite (same origin).
app.use(securityHeaders);
app.use(express.json({ limit: "10kb" }));
app.use(csrfGuard);
app.use(loadSession);

app.get("/api/health", (req, res) => res.json({ ok: true }));
app.use("/api/auth", authRoutes);
app.use("/api/branches", publicRoutes);
app.use("/api/staff", staffRoutes);

app.use((req, res) => res.status(404).json({ error: "Not found." }));

// Errors: show safe messages only, never stack traces or database details.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
    if (err instanceof HttpError) {
        return res.status(err.status).json({ error: err.message, ...(err.field ? { field: err.field } : {}) });
    }
    if (err.type === "entity.parse.failed") return res.status(400).json({ error: "Request body is not valid JSON." });
    if (err.type === "entity.too.large") return res.status(413).json({ error: "Request body is too large." });

    // Log the code and message only: pg error details can contain row values such as emails.
    console.error(`Unhandled error on ${req.method} ${req.path}:`, err.code ?? "", err.message);
    res.status(500).json({ error: "Something went wrong. Please try again." });
});

const server = app.listen(config.port, () => {
    console.log(`QueueWise API listening on http://localhost:${config.port}`);
});
startMaintenance();

function shutdown() {
    server.close(() => pool.end().finally(() => process.exit(0)));
    // SSE connections stay open; don't wait on them forever.
    setTimeout(() => process.exit(0), 5_000).unref();
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
