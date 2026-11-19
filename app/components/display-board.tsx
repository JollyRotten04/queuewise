"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { getService, mockQueues, mockTickets, type ServiceId } from "../lib/mock-data";

const counters: Record<ServiceId, string> = {
    general: "Counter 1",
    documents: "Counter 3",
    priority: "Counter 2",
};

// Demo only: how often the mock board advances.
const MOCK_TICK_MS = 10000;

function subscribeToClock(callback: () => void) {
    const timer = setInterval(callback, 1000);
    return () => clearInterval(timer);
}

function getTimeString() {
    return new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function nextNumber(ticket: string) {
    return `${ticket[0]}-${String(Number(ticket.slice(2)) + 1).padStart(3, "0")}`;
}

export default function DisplayBoard() {
    // TODO(backend): subscribe to live "now serving" events (SSE/WebSocket). Only send ticket numbers and counters
    // to this screen — never visitor names, since it is shown publicly in the lobby.
    const [serving, setServing] = useState(() => mockQueues.map((q) => ({ serviceId: q.serviceId, number: q.nowServing ?? "—" })));
    const [highlight, setHighlight] = useState<ServiceId | null>(null);
    const time = useSyncExternalStore(subscribeToClock, getTimeString, () => "");

    useEffect(() => {
        let index = 0;
        const timer = setInterval(() => {
            const serviceId = mockQueues[index % mockQueues.length].serviceId;
            index += 1;
            setServing((list) => list.map((s) => (s.serviceId === serviceId && s.number !== "—" ? { ...s, number: nextNumber(s.number) } : s)));
            setHighlight(serviceId);
        }, MOCK_TICK_MS);
        return () => clearInterval(timer);
    }, []);

    const upNext = mockTickets.slice(0, 6).map((t) => t.number);

    return (
        <div className="flex flex-col flex-1 gap-6 lg:gap-8">

            <div className="flex items-center justify-between gap-4">
                <div className="flex flex-col">
                    <p className="text-2xl sm:text-4xl font-bold text-black dark:text-zinc-50">Queue<span className="text-violet-600 dark:text-violet-400">Wise</span></p>
                    <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400">Main Branch · Now Serving</p>
                </div>
                <p className="text-3xl sm:text-5xl font-bold text-black dark:text-zinc-50 tabular-nums" suppressHydrationWarning>{time}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
                {serving.map((item) => {
                    const service = getService(item.serviceId);
                    const isNew = highlight === item.serviceId;
                    return (
                        <div
                            key={item.serviceId}
                            className={`flex flex-col items-center justify-center gap-2 rounded-xl shadow-lg p-6 lg:p-10 text-center transition-colors duration-500 ${isNew ? "bg-violet-600" : "bg-white dark:bg-zinc-900"}`}
                        >
                            <p className={`text-sm lg:text-lg font-semibold ${isNew ? "text-violet-100" : "text-violet-600 dark:text-violet-300"}`}>{service.name}</p>
                            <p className={`text-6xl lg:text-8xl font-bold tracking-tight ${isNew ? "text-white" : "text-black dark:text-zinc-50"}`}>{item.number}</p>
                            <p className={`text-base lg:text-2xl font-semibold ${isNew ? "text-white" : "text-zinc-700 dark:text-zinc-300"}`}>→ {counters[item.serviceId]}</p>
                        </div>
                    );
                })}
            </div>

            {/* Announce changes for screen readers without repeating the clock every second. */}
            <p className="sr-only" aria-live="polite">
                {highlight && `Now serving ${serving.find((s) => s.serviceId === highlight)?.number} at ${counters[highlight]}`}
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6 flex-1">
                <div className="lg:col-span-2 bg-white dark:bg-zinc-900 shadow-lg rounded-xl p-6 flex flex-col gap-4">
                    <p className="text-sm lg:text-lg font-semibold text-black dark:text-zinc-50">Up Next</p>
                    <ul className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                        {upNext.map((number) => (
                            <li key={number} className="rounded-lg bg-zinc-50 dark:bg-zinc-800 py-3 text-center text-lg lg:text-2xl font-bold text-black dark:text-zinc-50">{number}</li>
                        ))}
                    </ul>
                    <p className="text-xs lg:text-sm text-zinc-500 dark:text-zinc-400">☆ Priority tickets (P) are called first. Please have your ticket ready.</p>
                </div>

                <div className="bg-violet-50 dark:bg-violet-500/10 shadow-lg rounded-xl p-6 flex flex-col items-center justify-center gap-2 text-center">
                    <p className="text-4xl" aria-hidden="true">📱</p>
                    <p className="text-sm lg:text-lg font-semibold text-black dark:text-zinc-50">Not in line yet?</p>
                    <p className="text-xs lg:text-sm text-zinc-600 dark:text-zinc-400">Scan the QR code at the kiosk or open <span className="font-semibold text-violet-600 dark:text-violet-400">/join</span> on your phone.</p>
                </div>
            </div>
        </div>
    );
}
