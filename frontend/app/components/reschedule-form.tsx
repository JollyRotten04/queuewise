"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { card, inputClass, labelClass, primaryButton, secondaryButton } from "../lib/styles";
import { ApiError, api, branchPath, errorMessage } from "../lib/api";
import type { BranchInfo } from "../lib/types";
import DatePicker from "./date-picker";
import { addDays, slotLabel } from "./join-form";

type Field = "date" | "time";

// Moves a booking to another date/time. The server releases the old slot and books the new one together,
// so if the new slot is full the visitor keeps their current appointment.
export default function RescheduleForm({ slug, ticketNumber, onClose }: { slug: string; ticketNumber: string; onClose: () => void }) {
    const router = useRouter();
    const [booking, setBooking] = useState<BranchInfo["booking"] | null>(null);
    const [date, setDate] = useState("");
    const [time, setTime] = useState("");
    const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
    const [formError, setFormError] = useState("");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        api<BranchInfo>(branchPath(slug))
            .then((info) => setBooking(info.booking))
            .catch((err) => setFormError(errorMessage(err)));
    }, [slug]);

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!booking) return;
        const maxDate = addDays(booking.today, booking.maxDays);
        const next: Partial<Record<Field, string>> = {};
        if (!date) next.date = "Choose a date.";
        else if (date < booking.today || date > maxDate) next.date = `Choose a date within the next ${booking.maxDays} days.`;
        if (!time) next.time = "Choose a time slot.";
        setErrors(next);
        setFormError("");
        if (Object.keys(next).length > 0) return;

        setSaving(true);
        try {
            const ticket = await api<{ number: string; day: string }>(`${branchPath(slug)}/tickets/${encodeURIComponent(ticketNumber)}/reschedule`, {
                method: "POST",
                body: { date, time },
            });
            // The new booking gets a new number (numbers are per day), so move to its page.
            const params = new URLSearchParams({ b: slug });
            if (ticket.day !== booking.today) params.set("d", ticket.day);
            router.replace(`/ticket/${ticket.number}?${params}`);
            // The ticket page stays mounted when only the URL changes, so close this panel explicitly.
            onClose();
        } catch (error) {
            if (error instanceof ApiError && (error.field === "date" || error.field === "time")) {
                setErrors({ [error.field]: error.message });
            } else {
                setFormError(errorMessage(error));
            }
            setSaving(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} noValidate aria-labelledby="reschedule-title" className={`${card} p-6 flex flex-col gap-4 border border-violet-200 dark:border-violet-500/40`}>
            <div className="flex flex-col gap-1">
                <h2 id="reschedule-title" className="text-sm font-semibold text-black dark:text-zinc-50">Choose a new time</h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Your current booking stays until the new one is confirmed. You&apos;ll get a new ticket number for the new time.
                </p>
            </div>

            {/* The date picker needs real min/max dates, so wait for the branch's booking rules. */}
            {!booking ? (
                !formError && <div className="h-16 rounded-lg bg-zinc-100 dark:bg-zinc-800 animate-pulse" aria-hidden="true" />
            ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                    <label htmlFor="reschedule-date" className={labelClass}>Date</label>
                    <DatePicker
                        id="reschedule-date"
                        value={date}
                        onChange={setDate}
                        min={booking.today}
                        max={addDays(booking.today, booking.maxDays)}
                        invalid={!!errors.date}
                        describedBy={errors.date ? "reschedule-date-error" : undefined}
                    />
                    {errors.date && <p id="reschedule-date-error" className="text-xs text-red-600">{errors.date}</p>}
                </div>

                <div className="flex flex-col gap-1">
                    <label htmlFor="reschedule-time" className={labelClass}>Time slot</label>
                    <select id="reschedule-time" value={time} onChange={(e) => setTime(e.target.value)} className={inputClass} aria-invalid={!!errors.time} aria-describedby={errors.time ? "reschedule-time-error" : undefined}>
                        <option value="">Select a time</option>
                        {booking.slots.map((slot) => <option key={slot} value={slot}>{slotLabel(slot)}</option>)}
                    </select>
                    {errors.time && <p id="reschedule-time-error" className="text-xs text-red-600">{errors.time}</p>}
                </div>
            </div>
            )}

            {formError && <p role="alert" className="text-xs rounded-lg bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-300 px-3 py-2">{formError}</p>}

            <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
                <button type="button" onClick={onClose} className={`${secondaryButton} hover:scale-105`}>Keep Current Time</button>
                <button type="submit" disabled={saving || !booking} className={`${primaryButton} px-6 hover:scale-105`}>
                    {saving ? "Moving your booking…" : "Confirm New Time"}
                </button>
            </div>
        </form>
    );
}
