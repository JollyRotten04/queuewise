// Password hashing with Node's built-in scrypt (no third-party package needed).
// Parameters follow OWASP's scrypt guidance (N=2^16, r=8, p=2, ~64 MiB per hash). That is deliberately slow and
// memory-hungry; the concurrency cap below plus route rate limits keep it from being used to exhaust server memory.
import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

const PARAMS = { N: 2 ** 16, r: 8, p: 2 };
const KEY_LENGTH = 64;
const MAX_MEM = 256 * 1024 * 1024;
const MAX_CONCURRENT_HASHES = 4;

let active = 0;
const waiting = [];

async function withSlot(work) {
    if (active >= MAX_CONCURRENT_HASHES) {
        await new Promise((resolve) => waiting.push(resolve));
    }
    active += 1;
    try {
        return await work();
    } finally {
        active -= 1;
        waiting.shift()?.();
    }
}

function derive(password, salt, { N, r, p }) {
    return withSlot(() => new Promise((resolve, reject) => {
        scrypt(password.normalize("NFKC"), salt, KEY_LENGTH, { N, r, p, maxmem: MAX_MEM }, (err, key) => (err ? reject(err) : resolve(key)));
    }));
}

export async function hashPassword(password) {
    const salt = randomBytes(16);
    const key = await derive(password, salt, PARAMS);
    return ["scrypt", PARAMS.N, PARAMS.r, PARAMS.p, salt.toString("base64"), key.toString("base64")].join("$");
}

export async function verifyPassword(password, stored) {
    const parts = stored.split("$");
    if (parts.length !== 6 || parts[0] !== "scrypt") return false;
    const [, N, r, p, saltB64, keyB64] = parts;
    const expected = Buffer.from(keyB64, "base64");
    const actual = await derive(password, Buffer.from(saltB64, "base64"), { N: Number(N), r: Number(r), p: Number(p) });
    return actual.length === expected.length && timingSafeEqual(actual, expected);
}

// Used when the email doesn't exist, so "unknown email" takes as long as "wrong password".
let dummyHash;
export async function burnPasswordCheck(password) {
    dummyHash ??= await hashPassword(randomBytes(16).toString("hex"));
    await verifyPassword(password, dummyHash);
    return false;
}
