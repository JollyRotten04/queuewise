"use client";

import { useState } from "react";
import { card, inputClass, labelClass, primaryButton } from "../lib/styles";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_MESSAGE_LENGTH = 1000;

const topics = ["Book a demo", "Pricing question", "Technical support", "Partnership", "Other"];

type Errors = Partial<Record<"name" | "email" | "organization" | "message", string>>;

export default function ContactForm() {
    const [form, setForm] = useState({ name: "", email: "", organization: "", topic: topics[0], message: "" });
    const [errors, setErrors] = useState<Errors>({});
    const [sent, setSent] = useState(false);

    function set(field: keyof typeof form) {
        return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setForm((f) => ({ ...f, [field]: e.target.value }));
    }

    function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const next: Errors = {};
        if (form.name.trim().length < 2) next.name = "Enter your name.";
        if (!emailPattern.test(form.email.trim())) next.email = "Enter a valid email address.";
        if (form.organization.trim().length < 2) next.organization = "Enter your organization.";
        if (form.message.trim().length < 10) next.message = "Tell us a bit more (at least 10 characters).";
        setErrors(next);
        if (Object.keys(next).length > 0) return;

        // TODO(backend): POST to a contact endpoint. Validate and length-limit server-side, rate-limit or add bot protection,
        // and escape the message before showing it in any admin UI or email.
        setSent(true);
    }

    if (sent) {
        return (
            <div role="status" className={`${card} p-8 flex flex-col items-center gap-2 text-center h-full justify-center`}>
                <p className="text-3xl" aria-hidden="true">✉</p>
                <p className="text-sm font-semibold text-black dark:text-zinc-50">Thanks, we got your message!</p>
                <p className="text-xs text-zinc-600 dark:text-zinc-400">Our team will reply to {form.email.trim()} within one business day.</p>
            </div>
        );
    }

    const field = (id: keyof Errors) => ({ "aria-invalid": !!errors[id], "aria-describedby": errors[id] ? `contact-${id}-error` : undefined });
    const error = (id: keyof Errors) => errors[id] && <p id={`contact-${id}-error`} className="text-xs text-red-600">{errors[id]}</p>;

    return (
        <form onSubmit={handleSubmit} noValidate className={`${card} p-6 sm:p-8 flex flex-col gap-4`}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                    <label htmlFor="contact-name" className={labelClass}>Name</label>
                    <input id="contact-name" type="text" autoComplete="name" maxLength={80} value={form.name} onChange={set("name")} className={inputClass} {...field("name")} />
                    {error("name")}
                </div>

                <div className="flex flex-col gap-1">
                    <label htmlFor="contact-email" className={labelClass}>Work email</label>
                    <input id="contact-email" type="email" autoComplete="email" inputMode="email" maxLength={254} value={form.email} onChange={set("email")} className={inputClass} {...field("email")} />
                    {error("email")}
                </div>

                <div className="flex flex-col gap-1">
                    <label htmlFor="contact-organization" className={labelClass}>Organization</label>
                    <input id="contact-organization" type="text" autoComplete="organization" maxLength={100} value={form.organization} onChange={set("organization")} className={inputClass} {...field("organization")} />
                    {error("organization")}
                </div>

                <div className="flex flex-col gap-1">
                    <label htmlFor="contact-topic" className={labelClass}>Topic</label>
                    <select id="contact-topic" value={form.topic} onChange={set("topic")} className={inputClass}>
                        {topics.map((topic) => <option key={topic}>{topic}</option>)}
                    </select>
                </div>
            </div>

            <div className="flex flex-col gap-1">
                <div className="flex justify-between">
                    <label htmlFor="contact-message" className={labelClass}>Message</label>
                    <span className="text-xs text-zinc-400 tabular-nums">{form.message.length}/{MAX_MESSAGE_LENGTH}</span>
                </div>
                <textarea id="contact-message" rows={4} maxLength={MAX_MESSAGE_LENGTH} value={form.message} onChange={set("message")} placeholder="Tell us about your branch, daily visitors, and services." className={`${inputClass} resize-y`} {...field("message")} />
                {error("message")}
            </div>

            <button type="submit" className={`${primaryButton} w-full sm:w-fit sm:self-end px-6 py-2.5 hover:scale-105`}>Send Message →</button>
        </form>
    );
}
