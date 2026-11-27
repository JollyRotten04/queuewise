"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { card, dangerButton, primaryButton, secondaryButton } from "../lib/styles";
import { ApiError, api, branchPath, errorMessage, useBranchSlug, useLiveRefresh } from "../lib/api";
import { DAY_PATTERN, statusLabels, type TicketInfo, type TicketStatus as Status } from "../lib/types";
import RescheduleForm from "./reschedule-form";

const steps = ["Joined", "Waiting", "Called", "Served"];

const stepIndex: Record<Status, number> = {
    scheduled: 0,
    waiting: 1,
    called: 2,
    completed: 3,
    cancelled: 1,
    no_show: 2,
};

export function TicketNotFound() {
    return (
        <div className="bg-white dark:bg-zinc-900 shadow-lg rounded-xl p-8 flex flex-col items-center gap-3 text-center">
            <p className="text-3xl" aria-hidden="true">🎫</p>
            <p className="text-sm font-semibold text-black dark:text-zinc-50">We couldn&apos;t find that ticket</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">The link may be incomplete or the ticket may have expired. Open the join page to see your current ticket.</p>
            <Link href="/join" className={`${primaryButton} mt-2`}>Go to Join Page</Link>
        </div>
    );
}

function clock(iso: string) {
    return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

// Booked visitors join the line by themselves at their time. Arriving early, they can check in to join sooner.
function CheckInPanel({ checkIn, scheduledFor, isOwner, checkingIn, onCheckIn }: {
    checkIn: NonNullable<TicketInfo["checkIn"]>;
    scheduledFor: string;
    isOwner: boolean;
    checkingIn: boolean;
    onCheckIn: () => void;
}) {
    const day = new Date(scheduledFor).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });

    return (
        <div className={`${card} p-6 flex flex-col gap-4 border ${checkIn.isOpen ? "border-violet-400 dark:border-violet-500/60" : "border-transparent"}`}>
            <div className="flex items-start gap-3">
                <span className="bg-violet-200/80 dark:bg-violet-500/20 text-violet-600 dark:text-violet-300 h-10 aspect-square flex items-center justify-center rounded-xl text-lg shrink-0" aria-hidden="true">✓</span>
                <div className="flex flex-col gap-1">
                    <h2 className="text-sm font-semibold text-black dark:text-zinc-50">
                        {checkIn.isOpen ? "Here early? You can check in now" : "You'll join the line automatically"}
                    </h2>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400">
                        At <span className="font-semibold text-zinc-800 dark:text-zinc-200">{day}, {clock(scheduledFor)}</span> you join the line by yourself and are called ahead of walk-ins.
                        Please be at the branch by then. If you arrive early, checking in adds you to the line now, so you may be served sooner when the counters are free.
                    </p>
                </div>
            </div>

            {checkIn.isOpen && isOwner && (
                <button type="button" onClick={onCheckIn} disabled={checkingIn} className={`${primaryButton} w-full py-3 text-sm hover:scale-105`}>
                    {checkingIn ? "Checking in…" : "I'm Here Early — Check In"}
                </button>
            )}
            {!checkIn.isOpen && isOwner && (
                <p className="text-xs rounded-lg bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-300 px-3 py-2">
                    Arriving early? An early check-in button appears here at {clock(checkIn.opensAt)}. You don&apos;t need to do anything otherwise.
                </p>
            )}
            {!isOwner && (
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Arriving early? Check in from the phone that booked this ticket, or ask the front desk.</p>
            )}
        </div>
    );
}

function statusMessage(ticket: TicketInfo) {
    switch (ticket.status) {
        case "scheduled":
            return `Appointment on ${new Date(ticket.scheduledFor ?? "").toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}`;
        case "no_show":
            return "You missed your call. Please rejoin the queue.";
        case "waiting":
            return ticket.ahead === 0 ? "You're next! Please stay nearby." : `${ticket.ahead} ${ticket.ahead === 1 ? "person" : "people"} ahead of you`;
        case "called":
            return `🔔 It's your turn! Please proceed to Counter ${ticket.counter ?? ""}.`;
        case "cancelled":
            return "This ticket has been cancelled.";
        case "completed":
            return "Thanks for visiting. You've been served.";
    }
}

export default function TicketStatus({ ticketNumber }: { ticketNumber: string }) {
    const slug = useBranchSlug();
    const dayParam = useSearchParams().get("d");
    const day = dayParam && DAY_PATTERN.test(dayParam) ? dayParam : null;

    const [ticket, setTicket] = useState<TicketInfo | null>(null);
    const [notFound, setNotFound] = useState(false);
    const [error, setError] = useState("");
    const [peakAhead, setPeakAhead] = useState(0);
    const [confirmCancel, setConfirmCancel] = useState(false);
    const [cancelling, setCancelling] = useState(false);
    const [checkingIn, setCheckingIn] = useState(false);
    const [rescheduling, setRescheduling] = useState(false);

    const ticketPath = `${branchPath(slug)}/tickets/${encodeURIComponent(ticketNumber)}`;

    const load = useCallback(() => {
        api<TicketInfo>(`${ticketPath}${day ? `?day=${day}` : ""}`)
            .then((data) => {
                setTicket(data);
                setNotFound(false);
                setError("");
                if (data.ahead !== null) setPeakAhead((peak) => Math.max(peak, data.ahead ?? 0));
            })
            .catch((err) => {
                if (err instanceof ApiError && err.status === 404) setNotFound(true);
                else setError(errorMessage(err));
            });
    }, [ticketPath, day]);

    useEffect(() => {
        load();
    }, [load]);
    useLiveRefresh(slug, load);

    async function handleCancel() {
        setCancelling(true);
        try {
            await api(`${ticketPath}/cancel`, { method: "POST", body: {} });
            setConfirmCancel(false);
            load();
        } catch (err) {
            setError(errorMessage(err));
        } finally {
            setCancelling(false);
        }
    }

    async function handleCheckIn() {
        setCheckingIn(true);
        setError("");
        try {
            await api(`${ticketPath}/check-in`, { method: "POST", body: {} });
            load();
        } catch (err) {
            setError(errorMessage(err));
        } finally {
            setCheckingIn(false);
        }
    }

    if (notFound) return <TicketNotFound />;
    if (!ticket) {
        return error ? (
            <p role="alert" className="text-sm rounded-xl bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-300 p-4">{error}</p>
        ) : (
            <div className="h-64 rounded-xl bg-white dark:bg-zinc-900 shadow-lg animate-pulse" aria-hidden="true" />
        );
    }

    const called = ticket.status === "called";
    const waiting = ticket.status === "waiting";
    const progress = peakAhead > 0 && ticket.ahead !== null ? Math.round(((peakAhead - ticket.ahead) / peakAhead) * 100) : waiting ? 100 : 0;
    const currentStep = stepIndex[ticket.status];
    const isClosed = ["cancelled", "completed", "no_show"].includes(ticket.status);
    const canCancel = ticket.isOwner && (waiting || ticket.status === "scheduled");
    // Only bookings that haven't checked in yet can move; once checked in, the visitor is already in line.
    const isBooking = ticket.status === "scheduled";
    const canReschedule = ticket.isOwner && isBooking;
    const wasBooking = ticket.scheduledFor !== null;

    return (
        <div className="flex flex-col gap-6 w-full">

            <div className={`${card} overflow-hidden`}>
                <div className={`px-6 py-8 sm:px-10 flex flex-col items-center gap-2 text-center ${called ? "bg-violet-600" : "bg-violet-50 dark:bg-violet-500/10"}`}>
                    <p className={`text-xs font-semibold uppercase tracking-wide ${called ? "text-violet-100" : "text-violet-600 dark:text-violet-300"}`}>
                        {ticket.service.name}
                    </p>

                    <p className={`text-6xl sm:text-7xl font-bold tracking-tight ${called ? "text-white" : "text-black dark:text-zinc-50"}`}>
                        {ticket.number}
                    </p>

                    <p role="status" aria-live="polite" className={`text-sm font-semibold ${called ? "text-white" : "text-zinc-700 dark:text-zinc-300"}`}>
                        {statusMessage(ticket)}
                    </p>
                </div>

                <div className="grid grid-cols-3 divide-x divide-zinc-200 dark:divide-zinc-700 border-t border-zinc-200 dark:border-zinc-700">
                    <div className="flex flex-col items-center p-4 gap-1">
                        <span className="text-xs text-zinc-500 dark:text-zinc-400">Ahead of you</span>
                        <span className="text-xl font-bold text-black dark:text-zinc-50">{waiting ? ticket.ahead : "—"}</span>
                    </div>

                    <div className="flex flex-col items-center p-4 gap-1">
                        <span className="text-xs text-zinc-500 dark:text-zinc-400">Est. wait</span>
                        <span className="text-xl font-bold text-black dark:text-zinc-50">{waiting ? `~${ticket.estimatedMinutes}m` : "—"}</span>
                    </div>

                    <div className="flex flex-col items-center p-4 gap-1">
                        <span className="text-xs text-zinc-500 dark:text-zinc-400">Now serving</span>
                        <span className="text-xl font-bold text-violet-600 dark:text-violet-400">{ticket.nowServing ?? "—"}</span>
                    </div>
                </div>

                {waiting && (
                    <div className="px-6 pb-6">
                        <div className="h-2 w-full rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden" role="progressbar" aria-label="Queue progress" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
                            <div className="h-full rounded-full bg-violet-500 transition-all duration-700" style={{ width: `${Math.max(progress, 4)}%` }} />
                        </div>
                    </div>
                )}
            </div>

            {ticket.status === "scheduled" && ticket.checkIn && (
                <CheckInPanel checkIn={ticket.checkIn} scheduledFor={ticket.scheduledFor ?? ticket.checkIn.opensAt} isOwner={ticket.isOwner} checkingIn={checkingIn} onCheckIn={handleCheckIn} />
            )}

            <div className={`${card} p-6`}>
                <h2 className="text-sm font-semibold text-black dark:text-zinc-50 mb-4">Ticket progress</h2>

                <ol className="grid grid-cols-4 gap-2">
                    {steps.map((label, index) => {
                        const reached = index <= currentStep && ticket.status !== "cancelled";
                        return (
                            <li key={label} className="flex flex-col items-center gap-2 text-center">
                                <span className={`h-8 aspect-square rounded-full flex items-center justify-center text-xs font-bold ${reached ? "bg-violet-600 text-white" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400"}`}>
                                    {reached && index < currentStep ? "✓" : index + 1}
                                </span>
                                <span className={`text-xs font-semibold ${reached ? "text-zinc-700 dark:text-zinc-200" : "text-zinc-400"}`}>{label}</span>
                            </li>
                        );
                    })}
                </ol>

                <p className="mt-4 text-xs text-zinc-500 dark:text-zinc-400">
                    Status: <span className="font-semibold text-zinc-700 dark:text-zinc-200">{statusLabels[ticket.status]}</span>
                    {ticket.recallCount > 0 && called && ` · Called ${ticket.recallCount + 1} times`}. Keep this page open; it updates automatically.
                </p>
            </div>

            {error && <p role="alert" className="text-xs rounded-lg bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-300 px-3 py-2">{error}</p>}

            <div className="flex flex-col sm:flex-row gap-3 sm:justify-between">
                <Link href={`/join?${new URLSearchParams({ b: slug })}`} className={`${secondaryButton} hover:scale-105`}>← Back to Join</Link>

                {(canReschedule || canCancel) && !confirmCancel && !rescheduling && (
                    <div className="flex flex-col sm:flex-row gap-3">
                        {canReschedule && (
                            <button type="button" onClick={() => setRescheduling(true)} className={`${secondaryButton} hover:scale-105`}>Reschedule</button>
                        )}
                        {canCancel && (
                            <button type="button" onClick={() => setConfirmCancel(true)} className={dangerButton}>{isBooking ? "Cancel Appointment" : "Cancel My Ticket"}</button>
                        )}
                    </div>
                )}

                {isClosed && (
                    <Link href={`/join?${new URLSearchParams({ b: slug })}`} className={`${primaryButton} hover:scale-105`}>{wasBooking && ticket.status === "cancelled" ? "Book a New Time" : "Get a New Ticket"}</Link>
                )}
            </div>

            {rescheduling && canReschedule && (
                <RescheduleForm slug={slug} ticketNumber={ticket.number} onClose={() => setRescheduling(false)} />
            )}

            {confirmCancel && (
                <div role="alertdialog" aria-labelledby="cancel-title" className={`${card} p-6 flex flex-col gap-4 border border-red-200 dark:border-red-900`}>
                    <div className="flex flex-col gap-1">
                        <p id="cancel-title" className="text-sm font-semibold text-black dark:text-zinc-50">{isBooking ? `Cancel appointment ${ticket.number}?` : `Cancel ticket ${ticket.number}?`}</p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                            {isBooking
                                ? "Your booked time will be released for someone else. This can't be undone, but you can book again afterwards. To keep a booking and just change the time, use Reschedule instead."
                                : "You will lose your place in line. This can't be undone."}
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
                        <button type="button" onClick={() => setConfirmCancel(false)} className={`${secondaryButton} hover:scale-105`}>{isBooking ? "Keep Appointment" : "Keep My Ticket"}</button>
                        <button type="button" onClick={handleCancel} disabled={cancelling} className="inline-flex items-center justify-center bg-red-600 rounded-full px-4 py-2 text-white text-xs font-semibold cursor-pointer hover:scale-105 transition-transform duration-300 disabled:opacity-60">
                            {cancelling ? "Cancelling…" : "Yes, Cancel"}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
