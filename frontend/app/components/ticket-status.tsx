"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { card, dangerButton, primaryButton, secondaryButton } from "../lib/styles";
import { getServiceByPrefix, services, statusLabels, type TicketStatus } from "../lib/mock-data";

const steps: { key: TicketStatus | "joined"; label: string }[] = [
    { key: "joined", label: "Joined" },
    { key: "waiting", label: "Waiting" },
    { key: "called", label: "Called" },
    { key: "completed", label: "Served" },
];

const stepIndex: Record<TicketStatus, number> = {
    waiting: 1,
    called: 2,
    serving: 2,
    completed: 3,
    cancelled: 1,
    "no-show": 2,
};

// Demo only: how often the mock queue moves forward.
const MOCK_TICK_MS = 8000;

export default function TicketStatus({ ticketNumber }: { ticketNumber: string }) {
    const service = getServiceByPrefix(ticketNumber[0]) ?? services[0];
    const ticketDigits = Number(ticketNumber.slice(2));
    const startingPosition = (ticketDigits % 6) + 3;

    // TODO(backend): replace this mock state with the ticket from the API, kept live via SSE or WebSocket.
    const [position, setPosition] = useState(startingPosition);
    const [status, setStatus] = useState<TicketStatus>("waiting");
    const [confirmCancel, setConfirmCancel] = useState(false);

    useEffect(() => {
        if (status !== "waiting") return;
        const timer = setInterval(() => {
            setPosition((current) => {
                if (current <= 1) {
                    setStatus("called");
                    return 0;
                }
                return current - 1;
            });
        }, MOCK_TICK_MS);
        return () => clearInterval(timer);
    }, [status]);

    const estimatedMinutes = position * service.avgServiceMinutes;
    const nowServingNumber = Math.max(1, ticketDigits - position);
    const nowServing = `${ticketNumber[0]}-${String(nowServingNumber).padStart(3, "0")}`;
    const progress = Math.round(((startingPosition - position) / startingPosition) * 100);
    const currentStep = stepIndex[status];
    const isClosed = status === "cancelled" || status === "completed" || status === "no-show";

    function handleCancel() {
        // TODO(backend): call the cancel-ticket endpoint and only update the UI when it succeeds.
        setStatus("cancelled");
        setConfirmCancel(false);
    }

    return (
        <div className="flex flex-col gap-6 w-full">

            <div className={`${card} overflow-hidden`}>
                <div className={`px-6 py-8 sm:px-10 flex flex-col items-center gap-2 text-center ${status === "called" ? "bg-violet-600" : "bg-violet-50 dark:bg-violet-500/10"}`}>
                    <p className={`text-xs font-semibold uppercase tracking-wide ${status === "called" ? "text-violet-100" : "text-violet-600 dark:text-violet-300"}`}>
                        {service.name}
                    </p>

                    <p className={`text-6xl sm:text-7xl font-bold tracking-tight ${status === "called" ? "text-white" : "text-black dark:text-zinc-50"}`}>
                        {ticketNumber}
                    </p>

                    <p role="status" aria-live="polite" className={`text-sm font-semibold ${status === "called" ? "text-white" : "text-zinc-700 dark:text-zinc-300"}`}>
                        {status === "waiting" && (position === 1 ? "You're next! Please stay nearby." : `${position} people ahead of you`)}
                        {status === "called" && "🔔 It's your turn! Please proceed to Counter 2."}
                        {status === "cancelled" && "This ticket has been cancelled."}
                        {status === "completed" && "Thanks for visiting. You've been served."}
                        {status === "no-show" && "You missed your call. Please rejoin the queue."}
                    </p>
                </div>

                <div className="grid grid-cols-3 divide-x divide-zinc-200 dark:divide-zinc-700 border-t border-zinc-200 dark:border-zinc-700">
                    <div className="flex flex-col items-center p-4 gap-1">
                        <span className="text-xs text-zinc-500 dark:text-zinc-400">Position</span>
                        <span className="text-xl font-bold text-black dark:text-zinc-50">{status === "waiting" ? position : "—"}</span>
                    </div>

                    <div className="flex flex-col items-center p-4 gap-1">
                        <span className="text-xs text-zinc-500 dark:text-zinc-400">Est. wait</span>
                        <span className="text-xl font-bold text-black dark:text-zinc-50">{status === "waiting" ? `~${estimatedMinutes}m` : "—"}</span>
                    </div>

                    <div className="flex flex-col items-center p-4 gap-1">
                        <span className="text-xs text-zinc-500 dark:text-zinc-400">Now serving</span>
                        <span className="text-xl font-bold text-violet-600 dark:text-violet-400">{status === "waiting" ? nowServing : ticketNumber}</span>
                    </div>
                </div>

                {status === "waiting" && (
                    <div className="px-6 pb-6">
                        <div className="h-2 w-full rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden" role="progressbar" aria-label="Queue progress" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
                            <div className="h-full rounded-full bg-violet-500 transition-all duration-700" style={{ width: `${Math.max(progress, 4)}%` }} />
                        </div>
                    </div>
                )}
            </div>

            <div className={`${card} p-6`}>
                <h2 className="text-sm font-semibold text-black dark:text-zinc-50 mb-4">Ticket progress</h2>

                <ol className="grid grid-cols-4 gap-2">
                    {steps.map((step, index) => {
                        const reached = index <= currentStep && status !== "cancelled";
                        return (
                            <li key={step.key} className="flex flex-col items-center gap-2 text-center">
                                <span className={`h-8 aspect-square rounded-full flex items-center justify-center text-xs font-bold ${reached ? "bg-violet-600 text-white" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400"}`}>
                                    {reached && index < currentStep ? "✓" : index + 1}
                                </span>
                                <span className={`text-xs font-semibold ${reached ? "text-zinc-700 dark:text-zinc-200" : "text-zinc-400"}`}>{step.label}</span>
                            </li>
                        );
                    })}
                </ol>

                <p className="mt-4 text-xs text-zinc-500 dark:text-zinc-400">
                    Status: <span className="font-semibold text-zinc-700 dark:text-zinc-200">{statusLabels[status]}</span>. Keep this page open; it updates automatically.
                </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 sm:justify-between">
                <Link href="/join" className={`${secondaryButton} hover:scale-105`}>← Back to Join</Link>

                {!isClosed && !confirmCancel && (
                    <button type="button" onClick={() => setConfirmCancel(true)} className={dangerButton}>Cancel My Ticket</button>
                )}

                {isClosed && (
                    <Link href="/join" className={`${primaryButton} hover:scale-105`}>Get a New Ticket</Link>
                )}
            </div>

            {confirmCancel && (
                <div role="alertdialog" aria-labelledby="cancel-title" className={`${card} p-6 flex flex-col gap-4 border border-red-200 dark:border-red-900`}>
                    <div className="flex flex-col gap-1">
                        <p id="cancel-title" className="text-sm font-semibold text-black dark:text-zinc-50">Cancel ticket {ticketNumber}?</p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">You will lose your place in line. This can&apos;t be undone.</p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
                        <button type="button" onClick={() => setConfirmCancel(false)} className={`${secondaryButton} hover:scale-105`}>Keep My Ticket</button>
                        <button type="button" onClick={handleCancel} className="inline-flex items-center justify-center bg-red-600 rounded-full px-4 py-2 text-white text-xs font-semibold cursor-pointer hover:scale-105 transition-transform duration-300">Yes, Cancel</button>
                    </div>
                </div>
            )}
        </div>
    );
}
