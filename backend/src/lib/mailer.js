// Placeholder email delivery.
// TODO: connect a real email provider before production. Until then, in development only, the reset link is printed
// to the server console so the flow can be tested. That link is a secret: never enable this in production.
import { config } from "../config.js";

export async function sendPasswordResetEmail(to, link) {
    if (config.isProduction) {
        console.warn("Password reset requested, but email delivery is not configured. No email was sent.");
        return;
    }
    console.info(`[dev only] Password reset link for ${to.replace(/^(.).*(@.*)$/, "$1***$2")}: ${link}`);
}
