"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { inputClass, labelClass, secondaryButton, card } from "../lib/styles";
import { TICKET_NUMBER_PATTERN } from "../lib/types";

export default function CheckTicketForm({ slug }: { slug: string }) {
    const router = useRouter();
    const [value, setValue] = useState("");
    const [error, setError] = useState("");

    function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const ticketNumber = value.trim().toUpperCase();
        if (!TICKET_NUMBER_PATTERN.test(ticketNumber)) {
            setError("Ticket numbers look like G-024, D-011, or P-003.");
            return;
        }
        setError("");
        router.push(`/ticket/${ticketNumber}?${new URLSearchParams({ b: slug })}`);
    }

    return (
        <form id="check-ticket" onSubmit={handleSubmit} noValidate className={`${card} flex flex-col gap-3 p-6 w-full scroll-mt-20`}>
            <div className="flex flex-col">
                <h2 className="text-sm font-semibold text-black dark:text-zinc-50">Already have a ticket?</h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Enter today&apos;s ticket number to see your live status.</p>
            </div>

            <div className="flex flex-col gap-1">
                <label htmlFor="ticket-number" className={labelClass}>Ticket number</label>
                <div className="flex flex-col sm:flex-row gap-3">
                    <input id="ticket-number" type="text" maxLength={6} autoComplete="off" value={value} onChange={(e) => setValue(e.target.value)} placeholder="G-024" className={`${inputClass} uppercase`} aria-invalid={!!error} aria-describedby={error ? "ticket-number-error" : undefined} />
                    <button type="submit" className={`${secondaryButton} shrink-0 hover:scale-105`}>Check Status</button>
                </div>
                {error && <p id="ticket-number-error" className="text-xs text-red-600">{error}</p>}
            </div>
        </form>
    );
}
