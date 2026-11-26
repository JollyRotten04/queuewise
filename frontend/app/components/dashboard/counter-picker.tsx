"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Overview } from "../../lib/types";

type ActiveTicket = Overview["active"][number];

// Status chip: icon + label, so busy/vacant never relies on color alone.
function CounterStatus({ ticket, size = "sm" }: { ticket?: ActiveTicket; size?: "sm" | "xs" }) {
    const text = size === "sm" ? "text-xs" : "text-[11px]";
    if (ticket) {
        return (
            <span className={`inline-flex items-center gap-1 rounded-md bg-amber-100 dark:bg-amber-500/15 px-1.5 py-0.5 ${text} font-semibold text-amber-800 dark:text-amber-300 whitespace-nowrap`}>
                <span aria-hidden="true">●</span>Busy · {ticket.number}
            </span>
        );
    }
    return (
        <span className={`inline-flex items-center gap-1 rounded-md bg-emerald-100 dark:bg-emerald-500/15 px-1.5 py-0.5 ${text} font-semibold text-emerald-700 dark:text-emerald-300 whitespace-nowrap`}>
            <span aria-hidden="true">○</span>Vacant
        </span>
    );
}

export default function CounterPicker({ counters, selected, active, onSelect }: { counters: number[]; selected: number | null; active: ActiveTicket[]; onSelect: (counter: number) => void }) {
    const [open, setOpen] = useState(false);
    const dialogRef = useRef<HTMLDialogElement>(null);
    const busyAt = new Map(active.map((ticket) => [ticket.counter, ticket]));
    const vacantCount = counters.filter((n) => !busyAt.has(n)).length;
    const density = counters.length <= 6 ? "large" : counters.length <= 12 ? "medium" : "compact";

    // Native <dialog> gives a focus trap, Esc to close and a backdrop for free.
    useEffect(() => {
        const dialog = dialogRef.current;
        if (!dialog) return;
        if (open && !dialog.open) dialog.showModal();
        if (!open && dialog.open) dialog.close();
    }, [open]);

    function choose(counter: number) {
        onSelect(counter);
        setOpen(false);
    }

    return (
        <>
            <button
                type="button"
                onClick={() => setOpen(true)}
                disabled={counters.length === 0}
                aria-haspopup="dialog"
                className="inline-flex items-center gap-2 rounded-full border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 pl-3 pr-2.5 py-1.5 text-xs font-semibold text-black dark:text-zinc-50 cursor-pointer hover:border-violet-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {selected === null ? "No counter" : `Counter ${selected}`}
                {selected !== null && <CounterStatus ticket={busyAt.get(selected)} size="xs" />}
                <span aria-hidden="true" className="text-zinc-400">▾</span>
            </button>

            <dialog
                ref={dialogRef}
                onClose={() => setOpen(false)}
                // Clicking the dimmed backdrop (outside the panel) closes it.
                onClick={(event) => {
                    if (event.target === event.currentTarget) setOpen(false);
                }}
                aria-labelledby="counter-picker-title"
                className={`m-auto w-[calc(100%-2rem)] ${density === "compact" ? "max-w-2xl" : "max-w-lg"} rounded-2xl bg-white dark:bg-zinc-900 p-0 shadow-2xl text-left backdrop:bg-black/50 backdrop:backdrop-blur-sm`}
            >
                <div className="flex flex-col gap-5 p-6">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex flex-col gap-1">
                            <h2 id="counter-picker-title" className="text-lg font-bold text-black dark:text-zinc-50">
                                Choose your <span className="text-violet-600 dark:text-violet-400">counter</span>
                            </h2>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                {vacantCount} of {counters.length} {counters.length === 1 ? "counter" : "counters"} vacant
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setOpen(false)}
                            aria-label="Close"
                            className="h-8 aspect-square rounded-full text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                        >
                            ✕
                        </button>
                    </div>

                    {/* No inner scrolling: tiles get denser as the number of counters grows, so the grid always fits. */}
                    <div className={`grid gap-2 ${density === "large" ? "grid-cols-2 sm:grid-cols-3 sm:gap-3" : density === "medium" ? "grid-cols-3 sm:grid-cols-4" : "grid-cols-5 sm:grid-cols-8"}`}>
                        {counters.map((counter) => {
                            const ticket = busyAt.get(counter);
                            const isSelected = counter === selected;
                            return (
                                <button
                                    key={counter}
                                    type="button"
                                    onClick={() => choose(counter)}
                                    aria-pressed={isSelected}
                                    aria-label={`Counter ${counter}, ${ticket ? `busy serving ${ticket.number}` : "vacant"}`}
                                    className={`flex flex-col items-center rounded-xl border cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 ${density === "compact" ? "gap-0.5 px-1 py-2" : density === "medium" ? "gap-1.5 p-3" : "gap-2 p-4"} ${isSelected ? "border-violet-500 bg-violet-50 dark:bg-violet-500/10 ring-1 ring-violet-500" : density === "compact" && ticket ? "border-amber-300 dark:border-amber-500/40 bg-amber-50 dark:bg-amber-500/10" : "border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950"}`}
                                >
                                    {density !== "compact" && (
                                        <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Counter</span>
                                    )}
                                    <span className={`${density === "compact" ? "text-lg" : density === "medium" ? "text-2xl" : "text-3xl"} font-bold tabular-nums ${isSelected ? "text-violet-600 dark:text-violet-400" : "text-black dark:text-zinc-50"}`}>{counter}</span>
                                    {density === "compact" ? (
                                        // Busy tiles are tinted amber and show just the ticket number (kept on one line).
                                        <span className={`flex items-center gap-1 text-[10px] font-semibold whitespace-nowrap ${ticket ? "text-amber-700 dark:text-amber-300" : "text-emerald-700 dark:text-emerald-300"}`} aria-hidden="true">
                                            {ticket ? ticket.number : <><span>○</span>Free</>}
                                        </span>
                                    ) : (
                                        <CounterStatus ticket={ticket} size={density === "medium" ? "xs" : "sm"} />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                    {density === "compact" && (
                        <p className="flex gap-4 text-[11px] text-zinc-500 dark:text-zinc-400" aria-hidden="true">
                            <span><span className="inline-block h-2.5 w-2.5 rounded-sm border border-amber-300 bg-amber-50 dark:bg-amber-500/20 align-middle" /> Busy (ticket shown)</span>
                            <span><span className="text-emerald-600">○</span> Free</span>
                        </p>
                    )}

                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        This list follows the open counters set on the{" "}
                        <Link href="/dashboard/queues" className="font-semibold text-violet-600 dark:text-violet-400 hover:underline">Queues page</Link>.
                    </p>
                </div>
            </dialog>
        </>
    );
}
