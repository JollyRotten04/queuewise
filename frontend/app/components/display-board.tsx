"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { api, branchPath, errorMessage, useBranchSlug, useLiveRefresh } from "../lib/api";
import type { DisplayInfo } from "../lib/types";

function subscribeToClock(callback: () => void) {
    const timer = setInterval(callback, 1000);
    return () => clearInterval(timer);
}

function getTimeString() {
    return new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

// Shown on a public lobby screen: the API only sends ticket numbers and counters, never visitor names.
export default function DisplayBoard() {
    const slug = useBranchSlug();
    const [display, setDisplay] = useState<DisplayInfo | null>(null);
    const [error, setError] = useState("");
    const [highlight, setHighlight] = useState<string | null>(null);
    const lastServing = useRef<Map<string, string>>(new Map());
    const time = useSyncExternalStore(subscribeToClock, getTimeString, () => "");

    const load = useCallback(() => {
        api<DisplayInfo>(`${branchPath(slug)}/display`)
            .then((data) => {
                // Flash the card whose "now serving" number just changed.
                const previous = lastServing.current;
                const changed = data.services.find((s) => s.serving && previous.size > 0 && previous.get(s.id) !== s.serving.number);
                lastServing.current = new Map(data.services.map((s) => [s.id, s.serving?.number ?? ""]));
                if (changed) setHighlight(changed.id);
                setDisplay(data);
                setError("");
            })
            .catch((err) => setError(errorMessage(err)));
    }, [slug]);

    useEffect(() => {
        load();
    }, [load]);
    useLiveRefresh(slug, load, 10000);

    useEffect(() => {
        if (!highlight) return;
        const timer = setTimeout(() => setHighlight(null), 8000);
        return () => clearTimeout(timer);
    }, [highlight]);

    const highlighted = display?.services.find((s) => s.id === highlight);

    return (
        <div className="flex flex-col flex-1 gap-6 lg:gap-8">

            <div className="flex items-center justify-between gap-4">
                <div className="flex flex-col">
                    <p className="text-2xl sm:text-4xl font-bold text-black dark:text-zinc-50">Queue<span className="text-violet-600 dark:text-violet-400">Wise</span></p>
                    <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400">{display?.branch.name ?? "…"} · Now Serving</p>
                </div>
                <p className="text-3xl sm:text-5xl font-bold text-black dark:text-zinc-50 tabular-nums">{time}</p>
            </div>

            {error && !display && (
                <p role="alert" className="text-sm rounded-xl bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-300 p-4">{error}</p>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
                {(display?.services ?? []).map((service) => {
                    const isNew = highlight === service.id;
                    return (
                        <div
                            key={service.id}
                            className={`flex flex-col items-center justify-center gap-2 rounded-xl shadow-lg p-6 lg:p-10 text-center transition-colors duration-500 ${isNew ? "bg-violet-600" : "bg-white dark:bg-zinc-900"}`}
                        >
                            <p className={`text-sm lg:text-lg font-semibold ${isNew ? "text-violet-100" : "text-violet-600 dark:text-violet-300"}`}>{service.name}</p>
                            <p className={`text-6xl lg:text-8xl font-bold tracking-tight ${isNew ? "text-white" : "text-black dark:text-zinc-50"}`}>{service.serving?.number ?? "—"}</p>
                            <p className={`text-base lg:text-2xl font-semibold ${isNew ? "text-white" : "text-zinc-700 dark:text-zinc-300"}`}>
                                {service.serving?.counter ? `→ Counter ${service.serving.counter}` : "Waiting to start"}
                            </p>
                        </div>
                    );
                })}
            </div>

            {/* Announce changes for screen readers without repeating the clock every second. */}
            <p className="sr-only" aria-live="polite">
                {highlighted?.serving && `Now serving ${highlighted.serving.number} at counter ${highlighted.serving.counter}`}
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6 flex-1">
                <div className="lg:col-span-2 bg-white dark:bg-zinc-900 shadow-lg rounded-xl p-6 flex flex-col gap-4">
                    <p className="text-sm lg:text-lg font-semibold text-black dark:text-zinc-50">Up Next</p>
                    {display && display.upNext.length === 0 ? (
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">No one is waiting right now.</p>
                    ) : (
                        <ul className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                            {(display?.upNext ?? []).map((number) => (
                                <li key={number} className="rounded-lg bg-zinc-50 dark:bg-zinc-800 py-3 text-center text-lg lg:text-2xl font-bold text-black dark:text-zinc-50">{number}</li>
                            ))}
                        </ul>
                    )}
                    <p className="text-xs lg:text-sm text-zinc-500 dark:text-zinc-400">☆ Priority tickets (P) are called first. Please have your ticket ready.</p>
                </div>

                <div className="bg-violet-50 dark:bg-violet-500/10 shadow-lg rounded-xl p-6 flex flex-col items-center justify-center gap-2 text-center">
                    <p className="text-4xl" aria-hidden="true">📱</p>
                    <p className="text-sm lg:text-lg font-semibold text-black dark:text-zinc-50">Not in line yet?</p>
                    <p className="text-xs lg:text-sm text-zinc-600 dark:text-zinc-400">
                        Scan the QR code at the kiosk or open <span className="font-semibold text-violet-600 dark:text-violet-400">/join?b={slug}</span> on your phone.
                    </p>
                </div>
            </div>
        </div>
    );
}
