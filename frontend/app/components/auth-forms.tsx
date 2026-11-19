"use client";

import Link from "next/link";
import { useState } from "react";
import { card, inputClass, labelClass, primaryButton } from "../lib/styles";
import { useRouter } from "next/navigation";

// Client-side checks are for user feedback only. The backend must validate everything again,
// hash passwords, rate-limit attempts, and return generic errors (never "email not found").

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const usernamePattern = /^[A-Za-z0-9_]{3,30}$/;
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

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        // console.log('Hello!');
        event.preventDefault();
        const next: Errors = {};
        if (!emailPattern.test(email.trim())) next.email = "Enter a valid email address.";
        if (!password) next.password = "Enter your password.";
        setErrors(next);
        if (Object.values(next).some(Boolean)) return;

        // TODO(backend): POST { email, password, remember } over HTTPS; set an HttpOnly, Secure, SameSite session cookie.
        // Never store the password or session token in localStorage.

        const res = await fetch("http://localhost:4000/api/login", {
            method: "POST",
            headers: { "Content-Type": "application/json"},
            body: JSON.stringify({ email: email, password: password })
        });

        const data = await res.json();

        if(!res.ok){
            alert(data.error);
            return;
        }

        console.log("Logged in as:", data.user);
        // setNotice(BACKEND_PENDING);
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

const initialSignupForm = { organization: "", firstName: "", lastName: "", username: "", email: "", password: "", confirm: "" };

export function SignupForm() {
    const [form, setForm] = useState(initialSignupForm);
    const [agree, setAgree] = useState(false);
    const [errors, setErrors] = useState<Errors>({});
    const [notice, setNotice] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    

    function set(field: keyof typeof form) {
        return (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [field]: e.target.value }));
    }

    const strength = [/.{12,}/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].filter((r) => r.test(form.password)).length;

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const next: Errors = {};
        if (form.organization.trim().length < 2) next.organization = "Enter your organization's name.";
        if (form.firstName.trim().length < 2) next.firstName = "Enter your first name.";
        if (form.lastName.trim().length < 2) next.lastName = "Enter your last name.";
        if (!usernamePattern.test(form.username.trim())) next.username = "Use 3–30 letters, numbers, or underscores.";
        if (!emailPattern.test(form.email.trim())) next.email = "Enter a valid email address.";
        if (form.password.length < MIN_PASSWORD_LENGTH) next.password = `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
        if (form.confirm !== form.password) next.confirm = "Passwords don't match.";
        if (!agree) next.agree = "Please accept the terms to continue.";
        setErrors(next);
        if (Object.values(next).some(Boolean)) return;

        setNotice("Account created! Redirecting to login…");
        setTimeout(() => router.push("/login"), 1500);
        setLoading(true);

        try {
            const res = await fetch("http://localhost:4000/api/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    firstName: form.firstName.trim(),
                    lastName: form.lastName.trim(),
                    username: form.username.trim(),
                    email: form.email.trim(),
                    password: form.password,
                    confirmPassword: form.confirm,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                setNotice(data.error || "Something went wrong. Please try again.");
                return;
            }

            // Don't store the token in localStorage. Move to HttpOnly cookies when you harden auth.
            setForm(initialSignupForm);
            setAgree(false);
            setNotice("Account created! You can now log in.");
        } catch {
            setNotice("Couldn't reach the server. Please try again.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} noValidate className={`${card} p-6 sm:p-8 flex flex-col gap-4`}>
            <Field id="organization" label="Organization name" error={errors.organization}>
                <input id="organization" type="text" autoComplete="organization" maxLength={100} value={form.organization} onChange={set("organization")} placeholder="e.g. City Health Office" className={inputClass} {...errorProps("organization", errors.organization)} />
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field id="firstName" label="First name" error={errors.firstName}>
                    <input id="firstName" type="text" autoComplete="given-name" maxLength={50} value={form.firstName} onChange={set("firstName")} className={inputClass} {...errorProps("firstName", errors.firstName)} />
                </Field>

                <Field id="lastName" label="Last name" error={errors.lastName}>
                    <input id="lastName" type="text" autoComplete="family-name" maxLength={50} value={form.lastName} onChange={set("lastName")} className={inputClass} {...errorProps("lastName", errors.lastName)} />
                </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field id="username" label="Username" error={errors.username}>
                    <input id="username" type="text" autoComplete="username" maxLength={30} value={form.username} onChange={set("username")} className={inputClass} {...errorProps("username", errors.username)} />
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

            <button type="submit" disabled={loading} className={`${primaryButton} w-full py-2.5 hover:scale-105 disabled:opacity-60 disabled:hover:scale-100 disabled:cursor-not-allowed`}>
                {loading ? "Creating account…" : "Create Account →"}
            </button>
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