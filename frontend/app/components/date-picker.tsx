"use client";

import { useEffect, useRef, useState } from "react";

// All dates are "YYYY-MM-DD" strings in the branch's calendar. Math is done in UTC so the user's own timezone
// can never shift a day.

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function toDate(day: string) {
    return new Date(`${day}T00:00:00Z`);
}

function toDay(date: Date) {
    return date.toISOString().slice(0, 10);
}

function addDays(day: string, days: number) {
    const date = toDate(day);
    date.setUTCDate(date.getUTCDate() + days);
    return toDay(date);
}

function monthOf(day: string) {
    return day.slice(0, 7); // "YYYY-MM"
}

function addMonths(month: string, months: number) {
    const date = toDate(`${month}-01`);
    date.setUTCMonth(date.getUTCMonth() + months);
    return toDay(date).slice(0, 7);
}

function formatLong(day: string) {
    return toDate(day).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

function formatMonth(month: string) {
    return toDate(`${month}-01`).toLocaleDateString(undefined, { month: "long", year: "numeric", timeZone: "UTC" });
}

// Cells for a month grid: leading blanks so the 1st lands on the right weekday.
function monthCells(month: string) {
    const first = toDate(`${month}-01`);
    const blanks = first.getUTCDay();
    const daysInMonth = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
    return [
        ...Array.from({ length: blanks }, () => null),
        ...Array.from({ length: daysInMonth }, (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`),
    ];
}

export default function DatePicker({ id, value, onChange, min, max, invalid, describedBy }: {
    id: string;
    value: string;
    onChange: (day: string) => void;
    min: string;
    max: string;
    invalid?: boolean;
    describedBy?: string;
}) {
    const [open, setOpen] = useState(false);
    const [viewMonth, setViewMonth] = useState(monthOf(value || min));
    const dialogRef = useRef<HTMLDialogElement>(null);
    const gridRef = useRef<HTMLDivElement>(null);

    // Native <dialog>: focus trap, Esc to close, backdrop.
    useEffect(() => {
        const dialog = dialogRef.current;
        if (!dialog) return;
        if (open && !dialog.open) {
            dialog.showModal();
            // Start keyboard focus on the selected day (or the first bookable day).
            const target = gridRef.current?.querySelector<HTMLButtonElement>(`[data-day="${value || min}"]`);
            target?.focus();
        }
        if (!open && dialog.open) dialog.close();
    }, [open, value, min]);

    function openPicker() {
        setViewMonth(monthOf(value || min));
        setOpen(true);
    }

    function choose(day: string) {
        onChange(day);
        setOpen(false);
    }

    const inRange = (day: string) => day >= min && day <= max;
    const canGoBack = viewMonth > monthOf(min);
    const canGoForward = viewMonth < monthOf(max);
    const tomorrow = addDays(min, 1);

    // Arrow keys move between days (and across months); Enter/Space select via the button itself.
    function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
        const current = (event.target as HTMLElement).dataset.day;
        if (!current) return;
        const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[event.key];
        if (!step) return;
        event.preventDefault();
        const next = addDays(current, step);
        if (!inRange(next)) return;
        if (monthOf(next) !== viewMonth) setViewMonth(monthOf(next));
        requestAnimationFrame(() => gridRef.current?.querySelector<HTMLButtonElement>(`[data-day="${next}"]`)?.focus());
    }

    return (
        <>
            <button
                id={id}
                type="button"
                onClick={openPicker}
                aria-haspopup="dialog"
                aria-describedby={describedBy}
                className={`flex w-full items-center justify-between gap-3 rounded-lg border bg-white dark:bg-zinc-950 px-3 py-2.5 text-left text-sm cursor-pointer hover:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-colors ${invalid ? "border-red-500" : "border-zinc-300 dark:border-zinc-700"}`}
            >
                <span className={value ? "text-black dark:text-zinc-50 font-medium" : "text-zinc-400"}>
                    {value ? formatLong(value) : "Select a date"}
                </span>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-violet-600 dark:text-violet-400 shrink-0" aria-hidden="true">
                    <rect x="3" y="5" width="18" height="16" rx="2" />
                    <path d="M3 10h18M8 3v4M16 3v4" />
                </svg>
            </button>

            <dialog
                ref={dialogRef}
                onClose={() => setOpen(false)}
                onClick={(event) => {
                    if (event.target === event.currentTarget) setOpen(false);
                }}
                aria-labelledby={`${id}-title`}
                className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-2xl bg-white dark:bg-zinc-900 p-0 shadow-2xl text-left backdrop:bg-black/50 backdrop:backdrop-blur-sm"
            >
                <div className="flex flex-col gap-4 p-5">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex flex-col gap-0.5">
                            <h2 id={`${id}-title`} className="text-lg font-bold text-black dark:text-zinc-50">
                                Pick a <span className="text-violet-600 dark:text-violet-400">date</span>
                            </h2>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">Bookable from today until {formatLong(max)}</p>
                        </div>
                        <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="h-8 aspect-square rounded-full text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer">✕</button>
                    </div>

                    <div className="flex gap-2">
                        {[{ label: "Today", day: min }, { label: "Tomorrow", day: tomorrow }].filter((q) => inRange(q.day)).map((quick) => (
                            <button
                                key={quick.label}
                                type="button"
                                onClick={() => choose(quick.day)}
                                className={`flex-1 rounded-full px-3 py-2 text-xs font-semibold cursor-pointer transition-colors ${value === quick.day ? "bg-violet-500 text-white" : "bg-violet-100 dark:bg-violet-500/15 text-violet-700 dark:text-violet-300 hover:bg-violet-200 dark:hover:bg-violet-500/25"}`}
                            >
                                {quick.label}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center justify-between">
                        <button type="button" onClick={() => setViewMonth(addMonths(viewMonth, -1))} disabled={!canGoBack} aria-label="Previous month" className="h-9 aspect-square rounded-full text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed">‹</button>
                        <p className="text-sm font-semibold text-black dark:text-zinc-50" aria-live="polite">{formatMonth(viewMonth)}</p>
                        <button type="button" onClick={() => setViewMonth(addMonths(viewMonth, 1))} disabled={!canGoForward} aria-label="Next month" className="h-9 aspect-square rounded-full text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed">›</button>
                    </div>

                    <div ref={gridRef} onKeyDown={handleKeyDown} className="grid grid-cols-7 gap-1 text-center" role="group" aria-label={formatMonth(viewMonth)}>
                        {WEEKDAYS.map((weekday) => (
                            <span key={weekday} className="pb-1 text-[11px] font-semibold uppercase text-zinc-400" aria-hidden="true">{weekday.slice(0, 2)}</span>
                        ))}
                        {monthCells(viewMonth).map((day, index) => {
                            if (!day) return <span key={`blank-${index}`} aria-hidden="true" />;
                            const enabled = inRange(day);
                            const selected = day === value;
                            const isToday = day === min;
                            return (
                                <button
                                    key={day}
                                    type="button"
                                    data-day={day}
                                    disabled={!enabled}
                                    onClick={() => choose(day)}
                                    aria-pressed={selected}
                                    aria-label={`${formatLong(day)}${isToday ? ", today" : ""}${enabled ? "" : ", not available"}`}
                                    className={`relative aspect-square rounded-xl text-sm font-semibold tabular-nums transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 ${
                                        selected
                                            ? "bg-violet-500 text-white shadow"
                                            : enabled
                                              ? "text-black dark:text-zinc-50 hover:bg-violet-100 dark:hover:bg-violet-500/20 cursor-pointer"
                                              : "text-zinc-300 dark:text-zinc-600 cursor-not-allowed"
                                    }`}
                                >
                                    {Number(day.slice(8))}
                                    {isToday && !selected && <span className="absolute bottom-1.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-violet-500" aria-hidden="true" />}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </dialog>
        </>
    );
}
