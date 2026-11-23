import { config } from "../config.js";

export function parseCookies(header) {
    const cookies = {};
    if (!header) return cookies;
    for (const part of header.split(";")) {
        const index = part.indexOf("=");
        if (index < 1) continue;
        const name = part.slice(0, index).trim();
        const raw = part.slice(index + 1).trim();
        try {
            cookies[name] = decodeURIComponent(raw);
        } catch {
            // Ignore malformed cookie values.
        }
    }
    return cookies;
}

// HttpOnly so page scripts (and any XSS) can't read it; SameSite=Lax blocks cross-site POSTs from sending it.
export function setCookie(res, name, value, { maxAgeSeconds, path = "/" }) {
    const parts = [
        `${name}=${encodeURIComponent(value)}`,
        `Path=${path}`,
        `Max-Age=${maxAgeSeconds}`,
        "HttpOnly",
        "SameSite=Lax",
    ];
    if (config.cookieSecure) parts.push("Secure");
    res.append("Set-Cookie", parts.join("; "));
}

export function clearCookie(res, name, path = "/") {
    setCookie(res, name, "", { maxAgeSeconds: 0, path });
}
