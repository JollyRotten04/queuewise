import { pool } from "../db/pool.js";
import { parseCookies } from "../lib/cookies.js";
import { hashToken, isTokenShaped } from "../lib/tokens.js";

export const SESSION_COOKIE = "qw_session";

// Looks up the session on every request (no caching), so logout and password resets take effect immediately.
export async function loadSession(req, res, next) {
    const token = parseCookies(req.headers.cookie)[SESSION_COOKIE];
    if (!isTokenShaped(token)) return next();

    const { rows } = await pool.query(
        `SELECT u.id, u.email, u.name, u.role, b.id AS branch_id, b.name AS branch_name, b.slug AS branch_slug, b.timezone
         FROM sessions s
         JOIN users u ON u.id = s.user_id
         JOIN branches b ON b.id = u.branch_id
         WHERE s.token_hash = $1 AND s.expires_at > now()`,
        [hashToken(token)],
    );

    const row = rows[0];
    if (row) {
        req.user = { id: row.id, email: row.email, name: row.name, role: row.role };
        req.branch = { id: row.branch_id, name: row.branch_name, slug: row.branch_slug, timezone: row.timezone };
        req.sessionTokenHash = hashToken(token);
    }
    next();
}

export function requireAuth(req, res, next) {
    if (!req.user) return res.status(401).json({ error: "Please log in to continue." });
    next();
}

export function requireRole(role) {
    return (req, res, next) => {
        if (!req.user) return res.status(401).json({ error: "Please log in to continue." });
        if (req.user.role !== role) return res.status(403).json({ error: "You don't have permission to do that." });
        next();
    };
}
