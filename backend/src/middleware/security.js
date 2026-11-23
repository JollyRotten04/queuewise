import { config } from "../config.js";

// The API only returns JSON, so lock everything else down.
export function securityHeaders(req, res, next) {
    res.set({
        "X-Content-Type-Options": "nosniff",
        "Referrer-Policy": "no-referrer",
        "X-Frame-Options": "DENY",
        "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
        "Cross-Origin-Resource-Policy": "same-origin",
        "Cache-Control": "no-store",
    });
    next();
}

const UNSAFE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

// CSRF defence on top of SameSite=Lax cookies: reject writes from other origins, and require a JSON body
// (plain HTML forms on other sites can't send application/json without a CORS preflight, which this API never allows).
export function csrfGuard(req, res, next) {
    if (!UNSAFE_METHODS.has(req.method)) return next();

    const origin = req.get("origin");
    if (origin && !config.appOrigins.includes(origin)) {
        return res.status(403).json({ error: "This request is not allowed from this origin." });
    }
    if (!req.is("application/json")) {
        return res.status(415).json({ error: "Send requests as JSON (Content-Type: application/json)." });
    }
    next();
}
