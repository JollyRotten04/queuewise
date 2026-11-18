"use client";

import { useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { inputClass, labelClass, primaryButton, card } from "../lib/styles";
import { services, priorityLabels, getService, type PriorityCategory, type ServiceId } from "../lib/mock-data";

type VisitMode = "walk-in" | "appointment";

interface FormErrors {
    name?: string;
    phone?: string;
    date?: string;
    time?: string;
    consent?: string;
}

const namePattern = /^[\p{L}][\p{L} .'-]{1,59}$/u;
const phonePattern = /^\+?[0-9][0-9 -]{6,14}$/;

const timeSlots = Array.from({ length: 18 }, (_, i) => {
    const totalMinutes = 8 * 60 + i * 30;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const value = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
    const label = `${((hours + 11) % 12) + 1}:${String(minutes).padStart(2, "0")} ${hours < 12 ? "AM" : "PM"}`;
    return { value, label };
});

function subscribeNoop() {
    return () => {};
}

function toDateInputValue(date: Date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export default function JoinForm() {
    const router = useRouter();
    const [serviceId, setServiceId] = useState<ServiceId>("general");
    const [mode, setMode] = useState<VisitMode>("walk-in");
    const [priority, setPriority] = useState<PriorityCategory>("none");
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [date, setDate] = useState("");
    const [time, setTime] = useState("");
    const [consent, setConsent] = useState(false);
    const [errors, setErrors] = useState<FormErrors>({});
    const [submitting, setSubmitting] = useState(false);
    // Read on the client only so the page can be prerendered without reading the current time on the server.
    const minDate = useSyncExternalStore(subscribeNoop, () => toDateInputValue(new Date()), () => undefined);

    function validate(): FormErrors {
        const next: FormErrors = {};
        const trimmedName = name.trim();
        if (!namePattern.test(trimmedName)) next.name = "Enter your name (2 to 60 letters).";
        if (phone.trim() && !phonePattern.test(phone.trim())) next.phone = "Enter a valid mobile number, or leave it blank.";
        if (mode === "appointment") {
            if (!date) next.date = "Choose a date.";
            else if (minDate && date < minDate) next.date = "Choose today or a future date.";
            if (!time) next.time = "Choose a time slot.";
        }
        if (!consent) next.consent = "Please agree so we can process your ticket.";
        return next;
    }

    function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const nextErrors = validate();
        setErrors(nextErrors);
        if (Object.keys(nextErrors).length > 0) return;

        setSubmitting(true);
        // TODO(backend): POST { serviceId, mode, priority, name, phone, date, time } to the join-queue endpoint.
        // The server must re-validate every field; the checks above are for user feedback only.
        // Use the ticket number the server returns. This mock number is for the demo flow.
        const prefix = priority !== "none" ? "P" : getService(serviceId).prefix;
        const ticketNumber = `${prefix}-${String(Math.floor(Math.random() * 900) + 100)}`;
        router.push(`/ticket/${ticketNumber}`);
    }

    return (
        <form onSubmit={handleSubmit} noValidate className={`${card} flex flex-col gap-6 p-6 sm:p-8 w-full`}>

            <fieldset className="flex flex-col gap-3">
                <legend className="text-sm font-semibold text-black dark:text-zinc-50 mb-3">1. Choose a service</legend>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {services.map((service) => (
                        <label
                            key={service.id}
                            className={`flex flex-col gap-1 p-4 rounded-xl border cursor-pointer transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-violet-500 ${serviceId === service.id ? "border-violet-500 bg-violet-50 dark:bg-violet-500/10" : "border-zinc-200 dark:border-zinc-700 hover:border-violet-300"}`}
                        >
                            <input type="radio" name="service" value={service.id} checked={serviceId === service.id} onChange={() => setServiceId(service.id)} className="sr-only" />
                            <span className="text-violet-600 dark:text-violet-400 text-xl" aria-hidden="true">{service.icon}</span>
                            <span className="text-sm font-semibold text-black dark:text-zinc-50">{service.name}</span>
                            <span className="text-xs text-zinc-500 dark:text-zinc-400">{service.description}</span>
                        </label>
                    ))}
                </div>
            </fieldset>

            <fieldset className="flex flex-col gap-3">
                <legend className="text-sm font-semibold text-black dark:text-zinc-50 mb-3">2. Walk in or book ahead?</legend>

                <div className="inline-flex p-1 rounded-full bg-zinc-100 dark:bg-zinc-800 w-full sm:w-fit">
                    {(["walk-in", "appointment"] as const).map((option) => (
                        <label key={option} className={`flex-1 sm:flex-none text-center px-4 py-2 rounded-full text-xs font-semibold cursor-pointer transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-violet-500 ${mode === option ? "bg-violet-500 text-white shadow" : "text-zinc-700 dark:text-zinc-300"}`}>
                            <input type="radio" name="mode" value={option} checked={mode === option} onChange={() => setMode(option)} className="sr-only" />
                            {option === "walk-in" ? "Join now (walk-in)" : "Book an appointment"}
                        </label>
                    ))}
                </div>

                {mode === "appointment" && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1">
                            <label htmlFor="date" className={labelClass}>Date</label>
                            <input id="date" type="date" min={minDate} value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} aria-invalid={!!errors.date} aria-describedby={errors.date ? "date-error" : undefined} />
                            {errors.date && <p id="date-error" className="text-xs text-red-600">{errors.date}</p>}
                        </div>

                        <div className="flex flex-col gap-1">
                            <label htmlFor="time" className={labelClass}>Time slot</label>
                            <select id="time" value={time} onChange={(e) => setTime(e.target.value)} className={inputClass} aria-invalid={!!errors.time} aria-describedby={errors.time ? "time-error" : undefined}>
                                <option value="">Select a time</option>
                                {timeSlots.map((slot) => (
                                    <option key={slot.value} value={slot.value}>{slot.label}</option>
                                ))}
                            </select>
                            {errors.time && <p id="time-error" className="text-xs text-red-600">{errors.time}</p>}
                        </div>
                    </div>
                )}
            </fieldset>

            <fieldset className="flex flex-col gap-4">
                <legend className="text-sm font-semibold text-black dark:text-zinc-50 mb-3">3. Your details</legend>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1">
                        <label htmlFor="name" className={labelClass}>Name</label>
                        <input id="name" type="text" autoComplete="name" maxLength={60} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Juan Dela Cruz" className={inputClass} aria-invalid={!!errors.name} aria-describedby={errors.name ? "name-error" : undefined} />
                        {errors.name && <p id="name-error" className="text-xs text-red-600">{errors.name}</p>}
                    </div>

                    <div className="flex flex-col gap-1">
                        <label htmlFor="phone" className={labelClass}>Mobile number <span className="font-normal text-zinc-400">(optional, for SMS alerts)</span></label>
                        <input id="phone" type="tel" autoComplete="tel" inputMode="tel" maxLength={16} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="09XX XXX XXXX" className={inputClass} aria-invalid={!!errors.phone} aria-describedby={errors.phone ? "phone-error" : undefined} />
                        {errors.phone && <p id="phone-error" className="text-xs text-red-600">{errors.phone}</p>}
                    </div>
                </div>

                <div className="flex flex-col gap-1">
                    <label htmlFor="priority" className={labelClass}>Priority lane</label>
                    <select id="priority" value={priority} onChange={(e) => setPriority(e.target.value as PriorityCategory)} className={inputClass}>
                        {(Object.keys(priorityLabels) as PriorityCategory[]).map((key) => (
                            <option key={key} value={key}>{key === "none" ? "None (regular queue)" : priorityLabels[key]}</option>
                        ))}
                    </select>
                    {priority !== "none" && (
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">Please present a valid ID at the counter to confirm your priority.</p>
                    )}
                </div>
            </fieldset>

            <div className="flex flex-col gap-1">
                <label className="flex gap-2 items-start text-xs text-zinc-700 dark:text-zinc-300 cursor-pointer">
                    <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 accent-violet-600" aria-invalid={!!errors.consent} aria-describedby={errors.consent ? "consent-error" : undefined} />
                    I agree that my name and mobile number will be used only to manage my place in the queue.
                </label>
                {errors.consent && <p id="consent-error" className="text-xs text-red-600">{errors.consent}</p>}
            </div>

            <button type="submit" disabled={submitting} className={`${primaryButton} w-full sm:w-fit sm:self-end px-6 py-2.5 hover:scale-105`}>
                {submitting ? "Getting your ticket…" : mode === "walk-in" ? "Get My Ticket →" : "Book Appointment →"}
            </button>
        </form>
    );
}
