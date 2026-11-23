// Staff accounts: register (creates an organization + branch), login, logout, current user, password reset.
// Mounted at /api/auth.
import express from "express";
import { randomBytes } from "node:crypto";
import { config } from "../config.js";
import { pool, withTransaction } from "../db/pool.js";
import { SESSION_COOKIE, requireAuth } from "../middleware/auth.js";
import { clearCookie, setCookie } from "../lib/cookies.js";
import { HttpError } from "../lib/errors.js";
import { sendPasswordResetEmail } from "../lib/mailer.js";
import { burnPasswordCheck, hashPassword, verifyPassword } from "../lib/password.js";
import { hit, rateLimit } from "../lib/rate-limit.js";
import { hashToken, isTokenShaped, newToken } from "../lib/tokens.js";
import * as v from "../lib/validate.js";
import { insertDefaultServices } from "../services/defaults.js";

const router = express.Router();

const SESSION_SECONDS = 8 * 60 * 60;
const REMEMBER_SECONDS = 30 * 24 * 60 * 60;
const RESET_MINUTES = 30;
const MINUTE = 60 * 1000;

async function startSession(res, userId, remember) {
    const token = newToken();
    const maxAge = remember ? REMEMBER_SECONDS : SESSION_SECONDS;
    await pool.query(
        "INSERT INTO sessions (token_hash, user_id, expires_at) VALUES ($1, $2, now() + make_interval(secs => $3))",
        [hashToken(token), userId, maxAge],
    );
    setCookie(res, SESSION_COOKIE, token, { maxAgeSeconds: maxAge });
}

function publicUser(user, branch) {
    return {
        user: { name: user.name, email: user.email, role: user.role },
        branch: { name: branch.name, slug: branch.slug, timezone: branch.timezone },
    };
}

function slugify(text) {
    const base = text
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 40)
        .replace(/-+$/, "");
    return base.length >= 2 ? base : "branch";
}

router.post("/register", rateLimit("register", { windowMs: 60 * MINUTE, max: 5 }), async (req, res) => {
    const input = v.body(req);
    const organization = v.string(input.organization, "organization", { min: 2, max: 100, label: "Organization name" });
    const name = v.string(input.name, "name", { min: 2, max: 80, pattern: v.NAME_PATTERN, label: "Full name" });
    const email = v.email(input.email);
    const password = v.password(input.password);
    const passwordHash = await hashPassword(password);

    let created;
    try {
        created = await withTransaction(async (client) => {
            const org = await client.query("INSERT INTO organizations (name) VALUES ($1) RETURNING id", [organization]);

            // Pick a unique public slug for the branch's join/display links.
            const base = slugify(organization);
            let branch;
            for (let attempt = 0; attempt < 5 && !branch; attempt += 1) {
                const slug = attempt === 0 ? base : `${base}-${randomBytes(2).toString("hex")}`;
                const result = await client.query(
                    `INSERT INTO branches (organization_id, name, slug, timezone) VALUES ($1, $2, $3, $4)
                     ON CONFLICT (slug) DO NOTHING RETURNING id, name, slug, timezone`,
                    [org.rows[0].id, organization, slug, config.defaultTimezone],
                );
                branch = result.rows[0];
            }
            if (!branch) throw new HttpError(500, "Could not create your branch. Please try again.");

            await insertDefaultServices(client, branch.id);

            const user = await client.query(
                `INSERT INTO users (branch_id, email, name, password_hash, role)
                 VALUES ($1, $2, $3, $4, 'admin') RETURNING id, name, email, role`,
                [branch.id, email, name, passwordHash],
            );
            return { user: user.rows[0], branch };
        });
    } catch (error) {
        if (error.code === "23505" && error.constraint === "users_email_key") {
            // Deliberately vague so the form can't be used to check which emails have accounts.
            throw new HttpError(400, "We couldn't create an account with those details. If you already have one, log in instead.");
        }
        throw error;
    }

    await startSession(res, created.user.id, false);
    res.status(201).json(publicUser(created.user, created.branch));
});

router.post("/login", rateLimit("login", { windowMs: 15 * MINUTE, max: 20 }), async (req, res) => {
    const input = v.body(req);
    const email = v.email(input.email);
    if (typeof input.password !== "string" || input.password.length === 0 || input.password.length > v.PASSWORD_MAX) {
        throw new HttpError(400, "Password is required.", "password");
    }
    const remember = input.remember === true;

    // Per-account limit as well as per-IP, to slow down guessing one account from many IPs.
    const retryAfter = hit("login-email", email, { windowMs: 15 * MINUTE, max: 10 });
    if (retryAfter) {
        res.set("Retry-After", String(retryAfter));
        throw new HttpError(429, "Too many login attempts. Please wait a few minutes and try again.");
    }

    const { rows } = await pool.query(
        `SELECT u.id, u.name, u.email, u.role, u.password_hash, b.name AS branch_name, b.slug, b.timezone
         FROM users u JOIN branches b ON b.id = u.branch_id WHERE u.email = $1`,
        [email],
    );
    const user = rows[0];
    const valid = user ? await verifyPassword(input.password, user.password_hash) : await burnPasswordCheck(input.password);
    if (!valid) throw new HttpError(401, "Invalid email or password.");

    await startSession(res, user.id, remember);
    res.json(publicUser(user, { name: user.branch_name, slug: user.slug, timezone: user.timezone }));
});

router.post("/logout", async (req, res) => {
    if (req.sessionTokenHash) {
        await pool.query("DELETE FROM sessions WHERE token_hash = $1", [req.sessionTokenHash]);
    }
    clearCookie(res, SESSION_COOKIE);
    res.status(204).end();
});

router.get("/me", requireAuth, (req, res) => {
    res.json(publicUser(req.user, req.branch));
});

router.post("/forgot-password", rateLimit("forgot", { windowMs: 60 * MINUTE, max: 5 }), async (req, res) => {
    const email = v.email(v.body(req).email);

    // Same response whether or not the account exists; the work happens after replying so timing doesn't reveal it either.
    res.status(202).json({ message: "If an account exists for that email, a reset link is on its way." });

    try {
        const { rows } = await pool.query("SELECT id, email FROM users WHERE email = $1", [email]);
        if (!rows[0]) return;
        const token = newToken();
        await pool.query(
            "INSERT INTO password_resets (token_hash, user_id, expires_at) VALUES ($1, $2, now() + make_interval(mins => $3))",
            [hashToken(token), rows[0].id, RESET_MINUTES],
        );
        await sendPasswordResetEmail(rows[0].email, `${config.appOrigins[0]}/reset-password?token=${token}`);
    } catch (error) {
        console.error("Password reset request failed:", error.code ?? "", error.message);
    }
});

router.post("/reset-password", rateLimit("reset", { windowMs: 60 * MINUTE, max: 10 }), async (req, res) => {
    const input = v.body(req);
    if (!isTokenShaped(input.token)) throw new HttpError(400, "This reset link is invalid or has expired.");
    const password = v.password(input.password);
    const passwordHash = await hashPassword(password);

    await withTransaction(async (client) => {
        const { rows } = await client.query(
            `SELECT user_id FROM password_resets
             WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now() FOR UPDATE`,
            [hashToken(input.token)],
        );
        if (!rows[0]) throw new HttpError(400, "This reset link is invalid or has expired.");
        const userId = rows[0].user_id;

        await client.query("UPDATE users SET password_hash = $1, updated_at = now() WHERE id = $2", [passwordHash, userId]);
        await client.query("UPDATE password_resets SET used_at = now() WHERE user_id = $1 AND used_at IS NULL", [userId]);
        // Sign out everywhere, in case someone else had access to the account.
        await client.query("DELETE FROM sessions WHERE user_id = $1", [userId]);
    });

    res.json({ message: "Your password has been reset. Please log in." });
});

export default router;
