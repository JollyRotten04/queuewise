"use client";

import Link from "next/link";
import { useState } from "react";
import { card, inputClass, labelClass, primaryButton } from "../lib/styles";

// Client-side checks are for user feedback only. The backend must validate everything again,
// hash passwords, rate-limit attempts, and return generic errors (never "email not found").

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

type Errors = Record<string, string | undefined>;

function Field({ id, label, error, children, hint }: { id: string; label: string; error?: string; hint?: React.ReactNode; children: React.ReactNode }) {
    return (
        <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
                <label htmlFor={id} className={labelClass}>{label}</label>
                {hint}
            </div>
            {children}
            {error && <p id={`${id}-error`} className="text-xs text-red-600">{error}</p>}
        </div>
    );
}

function errorProps(id: string, error?: string) {
    return { "aria-invalid": !!error, "aria-describedby": error ? `${id}-error` : undefined };
}

function FormNotice({ message }: { message: string }) {
    if (!message) return null;
    return (
        <p role="status" className="text-xs rounded-lg bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-300 px-3 py-2">
            {message}
        </p>
    );
}

const BACKEND_PENDING = "Sign-in isn't connected yet. This form is ready for the backend.";

export function LoginForm() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [remember, setRemember] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [errors, setErrors] = useState<Errors>({});
    const [notice, setNotice] = useState("");

    function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const next: Errors = {};
        if (!emailPattern.test(email.trim())) next.email = "Enter a valid email address.";
        if (!password) next.password = "Enter your password.";
        setErrors(next);
        if (Object.values(next).some(Boolean)) return;

        // TODO(backend): POST { email, password, remember } over HTTPS; set an HttpOnly, Secure, SameSite session cookie.
        // Never store the password or session token in localStorage.
        setNotice(BACKEND_PENDING);
    }

    return (
        <form onSubmit={handleSubmit} noValidate className={`${card} p-6 sm:p-8 flex flex-col gap-4`}>
            <Field id="email" label="Work email" error={errors.email}>
                <input id="email" type="email" autoComplete="email" inputMode="email" maxLength={254} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@organization.com" className={inputClass} {...errorProps("email", errors.email)} />
            </Field>

            <Field id="password" label="Password" error={errors.password} hint={<Link href="/forgot-password" className="text-xs font-semibold text-violet-600 dark:text-violet-400 hover:underline">Forgot password?</Link>}>
                <div className="relative">
                    <input id="password" type={showPassword ? "text" : "password"} autoComplete="current-password" maxLength={128} value={password} onChange={(e) => setPassword(e.target.value)} className={`${inputClass} pr-16`} {...errorProps("password", errors.password)} />
                    <button type="button" onClick={() => setShowPassword((v) => !v)} aria-pressed={showPassword} className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-semibold text-violet-600 dark:text-violet-400 cursor-pointer px-2 py-1">
                        {showPassword ? "Hide" : "Show"}
                    </button>
                </div>
            </Field>

            <label className="flex gap-2 items-center text-xs text-zinc-700 dark:text-zinc-300 cursor-pointer w-fit">
                <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="accent-violet-600" />
                Keep me signed in on this device
            </label>

            <FormNotice message={notice} />

            <button type="submit" className={`${primaryButton} w-full py-2.5 hover:scale-105`}>Login →</button>
        </form>
    );
}

export function SignupForm() {
    const [form, setForm] = useState({ organization: "", name: "", email: "", password: "", confirm: "" });
    const [agree, setAgree] = useState(false);
    const [errors, setErrors] = useState<Errors>({});
    const [notice, setNotice] = useState("");

    function set(field: keyof typeof form) {
        return (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [field]: e.target.value }));
    }

    const strength = [/.{12,}/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].filter((r) => r.test(form.password)).length;

    function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const next: Errors = {};
        if (form.organization.trim().length < 2) next.organization = "Enter your organization's name.";
        if (form.name.trim().length < 2) next.name = "Enter your full name.";
        if (!emailPattern.test(form.email.trim())) next.email = "Enter a valid email address.";
        if (form.password.length < MIN_PASSWORD_LENGTH) next.password = `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
        if (form.confirm !== form.password) next.confirm = "Passwords don't match.";
        if (!agree) next.agree = "Please accept the terms to continue.";
        setErrors(next);
        if (Object.values(next).some(Boolean)) return;

        // TODO(backend): POST the form over HTTPS. Do not send `confirm`; the server enforces the password policy.
        setNotice("Sign-up isn't connected yet. This form is ready for the backend.");
    }

    return (
        <form onSubmit={handleSubmit} noValidate className={`${card} p-6 sm:p-8 flex flex-col gap-4`}>
            <Field id="organization" label="Organization name" error={errors.organization}>
                <input id="organization" type="text" autoComplete="organization" maxLength={100} value={form.organization} onChange={set("organization")} placeholder="e.g. City Health Office" className={inputClass} {...errorProps("organization", errors.organization)} />
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field id="name" label="Full name" error={errors.name}>
                    <input id="name" type="text" autoComplete="name" maxLength={80} value={form.name} onChange={set("name")} className={inputClass} {...errorProps("name", errors.name)} />
                </Field>

                <Field id="email" label="Work email" error={errors.email}>
                    <input id="email" type="email" autoComplete="email" inputMode="email" maxLength={254} value={form.email} onChange={set("email")} className={inputClass} {...errorProps("email", errors.email)} />
                </Field>
            </div>

            <Field id="password" label="Password" error={errors.password}>
                <input id="password" type="password" autoComplete="new-password" maxLength={128} value={form.password} onChange={set("password")} className={inputClass} {...errorProps("password", errors.password)} />
                {form.password && (
                    <div className="flex items-center gap-2 mt-1" aria-live="polite">
                        <div className="flex gap-1 flex-1" aria-hidden="true">
                            {[0, 1, 2, 3].map((i) => (
                                <span key={i} className={`h-1.5 flex-1 rounded-full ${i < strength ? "bg-violet-500" : "bg-zinc-200 dark:bg-zinc-700"}`} />
                            ))}
                        </div>
                        <span className="text-xs text-zinc-500 dark:text-zinc-400 w-14 text-right">{["Weak", "Weak", "Fair", "Good", "Strong"][strength]}</span>
                    </div>
                )}
            </Field>

            <Field id="confirm" label="Confirm password" error={errors.confirm}>
                <input id="confirm" type="password" autoComplete="new-password" maxLength={128} value={form.confirm} onChange={set("confirm")} className={inputClass} {...errorProps("confirm", errors.confirm)} />
            </Field>

            <div className="flex flex-col gap-1">
                <label className="flex gap-2 items-start text-xs text-zinc-700 dark:text-zinc-300 cursor-pointer">
                    <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5 accent-violet-600" {...errorProps("agree", errors.agree)} />
                    I agree to the Terms of Service and Privacy Policy.
                </label>
                {errors.agree && <p id="agree-error" className="text-xs text-red-600">{errors.agree}</p>}
            </div>

            <FormNotice message={notice} />

            <button type="submit" className={`${primaryButton} w-full py-2.5 hover:scale-105`}>Create Account →</button>
        </form>
    );
}

export function ForgotPasswordForm() {
    const [email, setEmail] = useState("");
    const [error, setError] = useState("");
    const [sent, setSent] = useState(false);

    function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!emailPattern.test(email.trim())) {
            setError("Enter a valid email address.");
            return;
        }
        setError("");
        // TODO(backend): request a single-use, short-lived reset link. Always show the same message whether or not the email exists.
        setSent(true);
    }

    if (sent) {
        return (
            <div role="status" className={`${card} p-6 sm:p-8 flex flex-col gap-2 text-center`}>
                <p className="text-3xl" aria-hidden="true">✉</p>
                <p className="text-sm font-semibold text-black dark:text-zinc-50">Check your inbox</p>
                <p className="text-xs text-zinc-600 dark:text-zinc-400">If an account exists for that email, we&apos;ve sent a link to reset your password.</p>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} noValidate className={`${card} p-6 sm:p-8 flex flex-col gap-4`}>
            <Field id="email" label="Work email" error={error}>
                <input id="email" type="email" autoComplete="email" inputMode="email" maxLength={254} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@organization.com" className={inputClass} {...errorProps("email", error)} />
            </Field>

            <button type="submit" className={`${primaryButton} w-full py-2.5 hover:scale-105`}>Send Reset Link</button>
        </form>
    );
}
