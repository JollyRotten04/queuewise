// Simple fixed-window rate limiter kept in memory.
// Limitation: counts are per server process and reset on restart. If you run several instances, move this to Redis
// or Postgres so the limits are shared.

const buckets = new Map();

setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets) {
        if (bucket.resetAt <= now) buckets.delete(key);
    }
}, 60_000).unref();

// Returns seconds to wait if the limit is exceeded, otherwise 0.
export function hit(name, key, { windowMs, max }) {
    const now = Date.now();
    const id = `${name}:${key}`;
    let bucket = buckets.get(id);
    if (!bucket || bucket.resetAt <= now) {
        bucket = { count: 0, resetAt: now + windowMs };
        buckets.set(id, bucket);
    }
    bucket.count += 1;
    return bucket.count > max ? Math.ceil((bucket.resetAt - now) / 1000) : 0;
}

export function rateLimit(name, { windowMs, max }) {
    return (req, res, next) => {
        const retryAfter = hit(name, req.ip, { windowMs, max });
        if (retryAfter) {
            res.set("Retry-After", String(retryAfter));
            return res.status(429).json({ error: "Too many requests. Please wait a moment and try again." });
        }
        next();
    };
}
