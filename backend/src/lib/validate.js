// Server-side validation. Every value from the client goes through one of these before use.
import { HttpError } from "./errors.js";

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const NAME_PATTERN = /^[\p{L}][\p{L} .'-]{1,59}$/u;
export const PHONE_PATTERN = /^\+?[0-9][0-9 -]{6,14}$/;
export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const SLUG_PATTERN = /^[a-z0-9]([a-z0-9-]{0,48}[a-z0-9])?$/;
export const TICKET_NUMBER_PATTERN = /^[A-Z]-[0-9]{3,4}$/;

export const PRIORITIES = ["none", "senior", "pwd", "pregnant", "urgent"];
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 128;

export function body(req) {
    const value = req.body;
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        throw new HttpError(400, "Request body must be a JSON object.");
    }
    return value;
}

export function string(value, field, { min = 1, max = 255, pattern, optional = false, label = field } = {}) {
    if (value === undefined || value === null || value === "") {
        if (optional) return null;
        throw new HttpError(400, `${label} is required.`, field);
    }
    if (typeof value !== "string") throw new HttpError(400, `${label} must be text.`, field);
    const trimmed = value.trim();
    if (trimmed.length < min || trimmed.length > max) {
        throw new HttpError(400, `${label} must be ${min} to ${max} characters.`, field);
    }
    if (pattern && !pattern.test(trimmed)) throw new HttpError(400, `${label} is not valid.`, field);
    return trimmed;
}

export function email(value, field = "email") {
    return string(value, field, { max: 254, pattern: EMAIL_PATTERN, label: "Email" }).toLowerCase();
}

// Passwords are not trimmed: spaces are allowed and significant.
export function password(value, field = "password") {
    if (typeof value !== "string") throw new HttpError(400, "Password is required.", field);
    if (value.length < PASSWORD_MIN || value.length > PASSWORD_MAX) {
        throw new HttpError(400, `Password must be ${PASSWORD_MIN} to ${PASSWORD_MAX} characters.`, field);
    }
    return value;
}

export function integer(value, field, { min, max, optional = false }) {
    if (value === undefined || value === null) {
        if (optional) return null;
        throw new HttpError(400, `${field} is required.`, field);
    }
    if (!Number.isInteger(value) || value < min || value > max) {
        throw new HttpError(400, `${field} must be a whole number from ${min} to ${max}.`, field);
    }
    return value;
}

export function boolean(value, field, { optional = false } = {}) {
    if (value === undefined || value === null) {
        if (optional) return null;
        throw new HttpError(400, `${field} is required.`, field);
    }
    if (typeof value !== "boolean") throw new HttpError(400, `${field} must be true or false.`, field);
    return value;
}

export function oneOf(value, field, allowed) {
    if (!allowed.includes(value)) throw new HttpError(400, `${field} is not valid.`, field);
    return value;
}

export function uuid(value, field, { optional = false } = {}) {
    if ((value === undefined || value === null) && optional) return null;
    if (typeof value !== "string" || !UUID_PATTERN.test(value)) throw new HttpError(400, `${field} is not valid.`, field);
    return value.toLowerCase();
}
