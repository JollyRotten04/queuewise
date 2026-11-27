"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { api, branchPath, errorMessage, useBranchSlug, useLiveRefresh } from "../lib/api";
import type { DisplayInfo } from "../lib/types";
import JoinQr from "./join-qr";

function subscribeToClock(callback: () => void) {
    const timer = setInterval(callback, 1000);
    return () => clearInterval(timer);
}

function getTimeString() {
    return new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function subscribeToNothing() {
    return () => {};
}

function getOrigin() {
    return window.location.origin;
}

// Shown on a public lobby screen: the API only sends ticket numbers and counters, never visitor names.
export default function DisplayBoard() {
    const slug = useBranchSlug();
    const [display, setDisplay] = useState<DisplayInfo | null>(null);
    const [error, setError] = useState("");
    const [highlight, setHighlight] = useState<number | null>(null);
    const lastServing = useRef<Map<number, string>>(new Map());
    const time = useSyncExternalStore(subscribeToClock, getTimeString, () => "");

    const load = useCallback(() => {
        api<DisplayInfo>(`${branchPath(slug)}/display`)
            .then((data) => {
                // Flash the counter whose ticket just changed.
                const previous = lastServing.current;
                const changed = data.counters.find((c) => c.serving && previous.size > 0 && previous.get(c.counter) !== c.serving.number);
                lastServing.current = new Map(data.counters.map((c) => [c.counter, c.serving?.number ?? ""]));
                if (changed) setHighlight(changed.counter);
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

    // The join link for this branch on whatever address the display is opened from (known only in the browser).
    const origin = useSyncExternalStore(subscribeToNothing, getOrigin, () => "");
    const joinUrl = origin ? `${origin}/join?${new URLSearchParams({ b: slug })}` : "";
    const joinUrlText = joinUrl.replace(/^https?:\/\//, "") || `/join?b=${slug}`;

    const highlighted = display?.counters.find((c) => c.counter === highlight);
    const counterCount = display?.counters.length ?? 0;

    return (
        <div className="flex flex-col flex-1 min-h-0 gap-4 lg:gap-6">

            <div className="flex items-center justify-between gap-4 shrink-0">
                <div className="flex flex-col">
                    <p className="text-2xl sm:text-4xl font-bold text-black dark:text-zinc-50">Queue<span className="text-violet-600 dark:text-violet-400">Wise</span></p>
                    <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400">{display?.branch.name ?? "…"} · Now Serving</p>
                </div>
                <p className="text-3xl sm:text-5xl font-bold text-black dark:text-zinc-50 tabular-nums">{time}</p>
            </div>

            {error && !display && (
                <p role="alert" className="text-sm rounded-xl bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-300 p-4">{error}</p>
            )}

            {/* Fills the rest of the screen: counters and Up Next on the left, the join QR code in a full-height column
                on the right (so it stays large however many counters there are). */}
            <div className="flex flex-col md:flex-row flex-1 min-h-0 gap-4 lg:gap-6">
                <div className="flex flex-col flex-1 min-w-0 min-h-0 gap-4 lg:gap-6">
                    {display && counterCount === 0 && (
                        <p className="text-sm rounded-xl bg-white dark:bg-zinc-900 shadow-lg p-6 text-center text-zinc-500 dark:text-zinc-400">No counters are open right now.</p>
                    )}

                    {/* One card per counter; fewer counters get bigger cards. */}
                    <div className={`grid grid-cols-2 gap-4 lg:gap-6 shrink-0 ${counterCount === 3 ? "lg:grid-cols-3" : counterCount >= 4 ? "lg:grid-cols-4" : ""}`}>
                        {(display?.counters ?? []).map(({ counter, serving }) => {
                            const isNew = highlight === counter;
                            const many = counterCount > 4;
                            return (
                                <div
                                    key={counter}
                                    className={`flex flex-col items-center justify-center gap-1 lg:gap-2 rounded-xl shadow-lg min-w-0 ${many ? "p-3 lg:p-4" : "p-5 lg:p-7"} text-center transition-colors duration-500 ${isNew ? "bg-violet-600" : "bg-white dark:bg-zinc-900"}`}
                                >
                                    <p className={`text-sm lg:text-lg font-semibold uppercase tracking-wide ${isNew ? "text-violet-100" : "text-violet-600 dark:text-violet-300"}`}>Counter {counter}</p>
                                    <p className={`${many ? "text-3xl lg:text-4xl xl:text-5xl" : counterCount >= 3 ? "text-4xl lg:text-5xl xl:text-6xl" : "text-5xl lg:text-7xl"} font-bold tracking-tight whitespace-nowrap ${isNew ? "text-white" : serving ? "text-black dark:text-zinc-50" : "text-zinc-300 dark:text-zinc-700"}`}>{serving?.number ?? "—"}</p>
                                    <p className={`text-sm lg:text-lg font-semibold ${isNew ? "text-white" : "text-zinc-500 dark:text-zinc-400"}`}>
                                        {serving ? (isNew ? "Please proceed" : "Now serving") : "Available"}
                                    </p>
                                </div>
                            );
                        })}
                    </div>

                    {/* Announce changes for screen readers without repeating the clock every second. */}
                    <p className="sr-only" aria-live="polite">
                        {highlighted?.serving && `Now serving ${highlighted.serving.number} at counter ${highlighted.counter}`}
                    </p>

                    <div className="flex-1 min-h-0 bg-white dark:bg-zinc-900 shadow-lg rounded-xl p-5 lg:p-6 flex flex-col gap-3 lg:gap-4">
                        <p className="text-sm lg:text-lg font-semibold text-black dark:text-zinc-50">Up Next</p>
                        {display && display.upNext.length === 0 ? (
                            <p className="text-sm text-zinc-500 dark:text-zinc-400">No one is waiting right now.</p>
                        ) : (
                            <ul className="grid grid-cols-3 lg:grid-cols-6 gap-3">
                                {(display?.upNext ?? []).map((number) => (
                                    <li key={number} className="rounded-lg bg-zinc-50 dark:bg-zinc-800 py-3 text-center text-lg lg:text-2xl font-bold text-black dark:text-zinc-50 whitespace-nowrap">{number}</li>
                                ))}
                            </ul>
                        )}
                        <p className="text-xs lg:text-sm text-zinc-500 dark:text-zinc-400">☆ Priority tickets (P) are called first. Please have your ticket ready.</p>
                    </div>
                </div>

                <aside className="md:w-64 lg:w-72 xl:w-96 shrink-0 bg-violet-50 dark:bg-violet-500/10 shadow-lg rounded-xl p-5 lg:p-6 flex flex-col items-center gap-4 text-center min-h-0">
                    <p className="text-base lg:text-xl font-semibold text-black dark:text-zinc-50 shrink-0">Not in line yet? Scan to join</p>
                    {/* Large code: as wide as the column, shrinking only if the screen is short. */}
                    <div className="flex flex-1 min-h-0 w-full items-center justify-center">
                        {joinUrl ? (
                            <JoinQr url={joinUrl} label={`QR code to join the queue at ${joinUrlText}`} className="w-full max-w-64 md:max-w-full md:max-h-full shadow-md" />
                        ) : (
                            <div className="w-full max-w-64 md:max-w-full md:max-h-full aspect-square rounded-lg bg-white/60 dark:bg-zinc-800 animate-pulse" aria-hidden="true" />
                        )}
                    </div>
                    <div className="flex flex-col gap-1 shrink-0">
                        <p className="text-xs lg:text-sm text-zinc-600 dark:text-zinc-400">Point your phone camera at the code, or visit</p>
                        <p className="text-sm lg:text-lg font-semibold text-violet-600 dark:text-violet-400 break-all">{joinUrlText}</p>
                    </div>
                </aside>
            </div>
        </div>
    );
}
