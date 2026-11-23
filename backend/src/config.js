// Reads and validates configuration once at startup. The server refuses to start with unsafe or missing settings.

const env = process.env;

function required(name) {
    const value = env[name];
    if (!value) {
        throw new Error(`Missing required environment variable ${name}. Copy backend/.env.example to backend/.env and fill it in.`);
    }
    return value;
}

function integer(name, fallback, { min, max }) {
    const raw = env[name];
    if (raw === undefined || raw === "") return fallback;
    const value = Number(raw);
    if (!Number.isInteger(value) || value < min || value > max) {
        throw new Error(`${name} must be a whole number between ${min} and ${max}.`);
    }
    return value;
}

function timezone(name, fallback) {
    const value = env[name] || fallback;
    try {
        new Intl.DateTimeFormat("en-US", { timeZone: value });
    } catch {
        throw new Error(`${name} must be a valid IANA timezone such as Asia/Manila.`);
    }
    return value;
}

function trustProxy(raw) {
    if (!raw) return "loopback";
    if (raw === "false") return false;
    if (/^\d+$/.test(raw)) return Number(raw);
    return raw;
}

const isProduction = env.NODE_ENV === "production";

export const config = Object.freeze({
    isProduction,
    port: integer("PORT", 4000, { min: 1, max: 65535 }),
    databaseUrl: required("DATABASE_URL"),
    appOrigins: (env.APP_ORIGIN || "http://localhost:3000").split(",").map((o) => o.trim()).filter(Boolean),
    cookieSecure: env.COOKIE_SECURE ? env.COOKIE_SECURE === "true" : isProduction,
    trustProxy: trustProxy(env.TRUST_PROXY),
    dataRetentionDays: integer("DATA_RETENTION_DAYS", 30, { min: 1, max: 3650 }),
    defaultTimezone: timezone("DEFAULT_TIMEZONE", "Asia/Manila"),
});

if (config.isProduction && !config.cookieSecure) {
    throw new Error("COOKIE_SECURE must be true in production so session cookies are only sent over HTTPS.");
}
