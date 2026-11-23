import { createHash, randomBytes } from "node:crypto";

// 256 bits of randomness, URL/cookie safe.
export function newToken() {
    return randomBytes(32).toString("base64url");
}

// Only hashes are stored in the database.
export function hashToken(token) {
    return createHash("sha256").update(token).digest();
}

export function isTokenShaped(value) {
    return typeof value === "string" && /^[A-Za-z0-9_-]{43}$/.test(value);
}
