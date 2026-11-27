"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { card, dangerButton, primaryButton, secondaryButton } from "../../lib/styles";
import { api, errorMessage, useLiveRefresh } from "../../lib/api";
import { priorityLabels, type Overview, type StaffTicket } from "../../lib/types";
import StatCard from "./stat-card";
import CounterPicker from "./counter-picker";
import { useLoginRedirect } from "./staff-menu";

// The counter number is a per-device preference, so it lives in localStorage (it is not sensitive).
const COUNTER_KEY = "qw_counter";
const MAX_COUNTER = 99;

function subscribeCounter(callback: () => void) {
    window.addEventListener("storage", callback);
    return () => window.removeEventListener("storage", callback);
}

function readCounter() {
    try {
        const value = Number(localStorage.getItem(COUNTER_KEY));
        // 0 = nothing chosen yet on this device.
        return Number.isInteger(value) && value >= 1 && value <= MAX_COUNTER ? value : 0;
    } catch {
        return 0;
    }
}

function saveCounter(value: number) {
    try {
        localStorage.setItem(COUNTER_KEY, String(value));
        window.dispatchEvent(new StorageEvent("storage", { key: COUNTER_KEY }));
    } catch {
        // Storage unavailable; the choice just won't be remembered.
    }
}

function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

// Walk-ins: when they joined. Appointments: their booked time, marked when they checked in ahead of it.
function joinedLabel(ticket: StaffTicket) {
    if (!ticket.scheduledFor) return formatTime(ticket.queueAt);
    const early = ticket.checkedInAt && new Date(ticket.checkedInAt) < new Date(ticket.scheduledFor);
    return early ? `Early · booked ${formatTime(ticket.scheduledFor)}` : `Booked ${formatTime(ticket.scheduledFor)}`;
}

export default function QueueBoard() {
    const redirectIfLoggedOut = useLoginRedirect();
    const [overview, setOverview] = useState<Overview | null>(null);
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState("Ready to serve.");
    const [error, setError] = useState("");
    const storedCounter = useSyncExternalStore(subscribeCounter, readCounter, () => 0);

    // Counters on offer = the branch's open counters (set on the Queues page); each one serves every service.
    // A counter still serving someone stays listed even if the count was lowered, so that visitor can be finished.
    const highestBusy = Math.max(0, ...(overview?.active ?? []).map((t) => t.counter ?? 0));
    const counters = Array.from({ length: Math.min(Math.max(overview?.counterCount ?? 0, highestBusy), MAX_COUNTER) }, (_, i) => i + 1);
    const busyCounters = new Set((overview?.active ?? []).map((t) => t.counter));
    // Keep this device's choice if it still exists; otherwise start on the first vacant counter.
    const counter: number | null = counters.includes(storedCounter)
        ? storedCounter
        : counters.find((n) => !busyCounters.has(n)) ?? counters[0] ?? null;

    const load = useCallback(() => {
        api<Overview>("/staff/overview")
            .then((data) => {
                setOverview(data);
                setError("");
            })
            .catch((err) => {
                if (!redirectIfLoggedOut(err)) setError(errorMessage(err));
            });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        load();
    }, [load]);
    useLiveRefresh(overview?.branch.slug ?? null, load, 10000);

    async function run(action: () => Promise<StaffTicket>, describe: (ticket: StaffTicket) => string) {
        setBusy(true);
        setError("");
        try {
            const ticket = await action();
            setMessage(describe(ticket));
            load();
        } catch (err) {
            if (!redirectIfLoggedOut(err)) setError(errorMessage(err));
        } finally {
            setBusy(false);
        }
    }

    // Whoever the selected counter is serving; other counters keep their own tickets.
    const current = overview?.active.find((t) => t.counter === counter) ?? null;
    const canAct = !!current?.canAct;

    const callNext = () => {
        if (counter === null) return;
        // Remember the counter used, so the selection doesn't jump to "first vacant" once this one is busy.
        saveCounter(counter);
        return run(
            () => api<StaffTicket>("/staff/call-next", { method: "POST", body: { counter } }),
            (t) => `Called ${t.number} to Counter ${t.counter}.`,
        );
    };
    const act = (action: "recall" | "complete" | "no-show", describe: (t: StaffTicket) => string) =>
        current && run(() => api<StaffTicket>(`/staff/tickets/${current.id}/${action}`, { method: "POST", body: {} }), describe);
    // Early check-in for a booked visitor who arrived before their time: adds them to the line now.
    const checkIn = (ticket: StaffTicket) =>
        run(() => api<StaffTicket>(`/staff/tickets/${ticket.id}/check-in`, { method: "POST", body: {} }), (t) => `${t.number} checked in early and added to the line.`);

    if (!overview) {
        return error ? (
            <p role="alert" className="text-sm rounded-xl bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-300 p-4">{error}</p>
        ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse" aria-hidden="true">
                {[0, 1, 2, 3].map((i) => <div key={i} className="h-28 rounded-xl bg-white dark:bg-zinc-900 shadow-lg" />)}
            </div>
        );
    }

    const { stats, waiting, branch } = overview;
    const joinLink = `/join?${new URLSearchParams({ b: branch.slug })}`;

    return (
        <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Waiting now" value={String(stats.waitingNow)} hint={stats.scheduledLater ? `+${stats.scheduledLater} booked later today` : "Across all services"} icon="⏱" />
                <StatCard label="Served today" value={String(stats.servedToday)} hint="Since opening" icon="✓" />
                <StatCard label="Avg. wait" value={`${stats.avgWaitMinutes} min`} hint="Join to call" icon="🗠" />
                <StatCard label="No-shows" value={String(stats.noShows)} hint="Missed their call" icon="✕" />
            </div>

            <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Visitors join at <Link href={joinLink} className="font-semibold text-violet-600 dark:text-violet-400 hover:underline">{joinLink}</Link> · Branch code <span className="font-mono font-semibold text-zinc-700 dark:text-zinc-300">{branch.slug}</span>
            </p>

            {error && <p role="alert" className="text-xs rounded-lg bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-300 px-3 py-2">{error}</p>}

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

                <section className={`${card} p-6 flex flex-col gap-5`} aria-labelledby="now-serving-title">
                    <div className="flex items-center justify-between gap-3">
                        <h2 id="now-serving-title" className="text-sm font-semibold text-black dark:text-zinc-50">Now Serving</h2>
                        <CounterPicker counters={counters} selected={counter} active={overview.active} onSelect={saveCounter} />
                    </div>

                    {counters.length === 0 && (
                        <p className="text-xs rounded-lg bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-300 px-3 py-2">
                            No counters are open. Open at least one on the <Link href="/dashboard/queues" className="font-semibold underline">Queues page</Link>.
                        </p>
                    )}

                    <div className="flex flex-col items-center gap-1 rounded-xl bg-violet-50 dark:bg-violet-500/10 py-8 px-4 text-center">
                        <p className="text-5xl font-bold text-black dark:text-zinc-50">{current?.number ?? "—"}</p>
                        {current ? (
                            <>
                                <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">{current.customerName ?? "Visitor"}</p>
                                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                    {current.service.name}
                                    {current.priority !== "none" && ` · ${priorityLabels[current.priority]}`}
                                    {current.recallCount > 0 && ` · Recalled ${current.recallCount}×`}
                                </p>
                            </>
                        ) : (
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">{counter === null ? "Choose a counter to start" : `Counter ${counter} is vacant`}</p>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <button type="button" onClick={callNext} disabled={busy || counter === null || !!current || waiting.length === 0} className={`${primaryButton} col-span-2 py-2.5 hover:scale-105`}>
                            Call Next →
                        </button>
                        <button type="button" onClick={() => act("recall", (t) => `Recalled ${t.number}.`)} disabled={busy || !canAct} className={`${secondaryButton} hover:scale-105`}>Recall</button>
                        <button type="button" onClick={() => act("complete", (t) => `${t.number} marked as served.`)} disabled={busy || !canAct} className={`${secondaryButton} hover:scale-105`}>Complete</button>
                        <button type="button" onClick={() => act("no-show", (t) => `${t.number} marked as no-show.`)} disabled={busy || !canAct} className={`${dangerButton} col-span-2`}>Mark No-show</button>
                    </div>

                    {current && !canAct && (
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">Another staff member called this ticket, so only they or an admin can finish it.</p>
                    )}

                    <p role="status" aria-live="polite" className="text-xs text-zinc-500 dark:text-zinc-400">{message}</p>
                </section>

                <section className={`${card} p-6 flex flex-col gap-4 xl:col-span-2 min-w-0`} aria-labelledby="waiting-title">
                    <div className="flex items-center justify-between">
                        <h2 id="waiting-title" className="text-sm font-semibold text-black dark:text-zinc-50">Waiting List</h2>
                        <span className="text-xs text-zinc-500">{waiting.length} waiting</span>
                    </div>

                    {waiting.length === 0 ? (
                        <p className="text-sm text-zinc-500 dark:text-zinc-400 py-8 text-center">The queue is empty.</p>
                    ) : (
                        <>
                            {/* Table on larger screens */}
                            <div className="hidden md:block overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead>
                                        <tr className="text-xs text-zinc-500 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-700">
                                            <th scope="col" className="py-2 pr-4 font-semibold">Ticket</th>
                                            <th scope="col" className="py-2 pr-4 font-semibold">Name</th>
                                            <th scope="col" className="py-2 pr-4 font-semibold">Service</th>
                                            <th scope="col" className="py-2 pr-4 font-semibold">Lane</th>
                                            <th scope="col" className="py-2 font-semibold text-right">Joined</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {waiting.map((ticket) => (
                                            <tr key={ticket.id} className="border-b border-zinc-100 dark:border-zinc-800 last:border-0">
                                                <td className="py-3 pr-4 font-bold text-black dark:text-zinc-50">{ticket.number}</td>
                                                <td className="py-3 pr-4 text-zinc-700 dark:text-zinc-300">{ticket.customerName ?? "—"}</td>
                                                <td className="py-3 pr-4 text-zinc-700 dark:text-zinc-300">{ticket.service.name}</td>
                                                <td className="py-3 pr-4"><PriorityTag ticket={ticket} /></td>
                                                <td className="py-3 text-right text-zinc-500 dark:text-zinc-400 tabular-nums whitespace-nowrap">{joinedLabel(ticket)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Cards on phones */}
                            <ul className="md:hidden flex flex-col gap-3">
                                {waiting.map((ticket) => (
                                    <li key={ticket.id} className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 dark:border-zinc-700 p-3">
                                        <div className="flex flex-col min-w-0">
                                            <span className="text-sm font-bold text-black dark:text-zinc-50">{ticket.number} <span className="font-normal text-zinc-500">· {joinedLabel(ticket)}</span></span>
                                            <span className="text-xs text-zinc-600 dark:text-zinc-400 truncate">{ticket.customerName ?? "—"} · {ticket.service.name}</span>
                                        </div>
                                        <PriorityTag ticket={ticket} />
                                    </li>
                                ))}
                            </ul>
                        </>
                    )}
                </section>
            </div>

            <AppointmentList appointments={overview.appointments} window={overview.checkInWindow} lineIsEmpty={waiting.length === 0} busy={busy} onCheckIn={checkIn} />
        </>
    );
}

function subscribeHalfMinute(callback: () => void) {
    const timer = setInterval(callback, 30_000);
    return () => clearInterval(timer);
}

// Current time, refreshed every 30 seconds (stable between renders, so it's safe to read during render).
function useNow() {
    return useSyncExternalStore(subscribeHalfMinute, () => Math.floor(Date.now() / 30_000) * 30_000, () => 0);
}

function AppointmentList({ appointments, window, lineIsEmpty, busy, onCheckIn }: {
    appointments: StaffTicket[];
    window: Overview["checkInWindow"];
    lineIsEmpty: boolean;
    busy: boolean;
    onCheckIn: (ticket: StaffTicket) => void;
}) {
    const now = useNow();

    function state(ticket: StaffTicket) {
        const at = new Date(ticket.scheduledFor ?? 0).getTime();
        if (now >= at - window.earlyMinutes * 60_000) return { label: "Due soon", className: "bg-violet-200/80 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300", icon: "◔" };
        return { label: "Later today", className: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300", icon: "◷" };
    }

    return (
        <section className={`${card} p-6 flex flex-col gap-4`} aria-labelledby="appointments-title">
            <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between gap-3">
                    <h2 id="appointments-title" className="text-sm font-semibold text-black dark:text-zinc-50">Upcoming Appointments</h2>
                    <span className="text-xs text-zinc-500">{appointments.length} later today</span>
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Bookings join the line automatically at their time and are called ahead of walk-ins. If someone arrives early,
                    Check in early adds them now, behind everyone already waiting, so they&apos;re served early only when the line is free.
                </p>
            </div>

            {appointments.length > 0 && lineIsEmpty && (
                <p className="text-xs rounded-lg bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-300 px-3 py-2">
                    The line is empty, so an early arrival you check in now can be called right away.
                </p>
            )}

            {appointments.length === 0 ? (
                <p className="text-sm text-zinc-500 dark:text-zinc-400 py-4 text-center">No more upcoming appointments today.</p>
            ) : (
                <ul className="flex flex-col divide-y divide-zinc-100 dark:divide-zinc-800">
                    {appointments.map((ticket) => {
                        const s = state(ticket);
                        return (
                            <li key={ticket.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
                                <span className="w-20 shrink-0 whitespace-nowrap text-sm font-bold text-black dark:text-zinc-50 tabular-nums">{formatTime(ticket.scheduledFor ?? ticket.queueAt)}</span>
                                <div className="flex flex-col min-w-0 flex-1 basis-40">
                                    <span className="text-sm font-semibold text-black dark:text-zinc-50">
                                        {ticket.number} <span className="font-normal text-zinc-600 dark:text-zinc-400">· {ticket.customerName ?? "—"}</span>
                                    </span>
                                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                                        {ticket.service.name}{ticket.priority !== "none" && ` · ${priorityLabels[ticket.priority]}`}
                                    </span>
                                </div>
                                <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg whitespace-nowrap ${s.className}`}>
                                    <span aria-hidden="true">{s.icon}</span>{s.label}
                                </span>
                                <button type="button" onClick={() => onCheckIn(ticket)} disabled={busy} className={`${secondaryButton} hover:scale-105`}>
                                    Check in early
                                </button>
                            </li>
                        );
                    })}
                </ul>
            )}
        </section>
    );
}

function PriorityTag({ ticket }: { ticket: StaffTicket }) {
    if (ticket.priority === "none") {
        return <span className="text-xs text-zinc-500 dark:text-zinc-400">Regular</span>;
    }
    return (
        <span className="inline-flex items-center gap-1 bg-violet-200/80 dark:bg-violet-500/20 text-violet-600 dark:text-violet-300 text-xs font-semibold px-2 py-1 rounded-lg whitespace-nowrap">
            <span aria-hidden="true">☆</span>{priorityLabels[ticket.priority]}
        </span>
    );
}
