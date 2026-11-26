"use client";

import { useState } from "react";

interface BarDatum {
    label: string;
    value: number;
}

// Single-series bar chart: one hue, no legend (the title names the series), hover/focus tooltip, and a table view.
export default function BarChart({ title, data, unit, orientation = "vertical" }: { title: string; data: BarDatum[]; unit: string; orientation?: "vertical" | "horizontal" }) {
    const [active, setActive] = useState<number | null>(null);
    const [showTable, setShowTable] = useState(false);
    const max = Math.max(...data.map((d) => d.value), 1);
    const peak = data.reduce((best, d, i) => (d.value > data[best].value ? i : best), 0);

    return (
        <figure className="bg-white dark:bg-zinc-900 shadow-lg rounded-xl p-6 box-border flex flex-col gap-4 min-w-0">
            <div className="flex items-center justify-between gap-3">
                <figcaption className="text-sm font-semibold text-black dark:text-zinc-50">{title}</figcaption>
                <button type="button" onClick={() => setShowTable((v) => !v)} className="text-xs font-semibold text-violet-600 dark:text-violet-400 cursor-pointer hover:underline">
                    {showTable ? "Show chart" : "Show table"}
                </button>
            </div>

            {showTable ? (
                <table className="w-full text-sm text-left">
                    <thead>
                        <tr className="text-xs text-zinc-500 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-700">
                            <th scope="col" className="py-2 font-semibold">Label</th>
                            <th scope="col" className="py-2 font-semibold text-right">Value ({unit})</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((d) => (
                            <tr key={d.label} className="border-b border-zinc-100 dark:border-zinc-800 last:border-0">
                                <td className="py-2 text-zinc-700 dark:text-zinc-300">{d.label}</td>
                                <td className="py-2 text-right tabular-nums text-black dark:text-zinc-50">{d.value}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            ) : orientation === "vertical" ? (
                <div className="relative h-56 flex items-end gap-1 sm:gap-2 border-b border-zinc-200 dark:border-zinc-700" role="list">
                    {data.map((d, i) => (
                        <div
                            key={d.label}
                            role="listitem"
                            tabIndex={0}
                            aria-label={`${d.label}: ${d.value} ${unit}`}
                            onMouseEnter={() => setActive(i)}
                            onMouseLeave={() => setActive(null)}
                            onFocus={() => setActive(i)}
                            onBlur={() => setActive(null)}
                            className="relative flex-1 h-full flex flex-col justify-end items-center outline-none group"
                        >
                            {active === i && (
                                // Near the edges the tooltip opens inward, so it never pokes past the screen.
                                <div className={`absolute bottom-full mb-1 z-10 whitespace-nowrap rounded-lg bg-black dark:bg-zinc-100 px-2 py-1 text-xs text-white dark:text-black shadow ${i < data.length / 3 ? "left-0" : i >= (data.length * 2) / 3 ? "right-0" : "left-1/2 -translate-x-1/2"}`}>
                                    {d.label}: <span className="font-semibold">{d.value} {unit}</span>
                                </div>
                            )}
                            {i === peak && active === null && (
                                <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1 tabular-nums">{d.value}</span>
                            )}
                            <div
                                className={`w-full max-w-8 rounded-t bg-violet-500 transition-opacity group-focus-visible:ring-2 group-focus-visible:ring-violet-300 ${active !== null && active !== i ? "opacity-40" : ""}`}
                                style={{ height: `${(d.value / max) * 85}%` }}
                            />
                        </div>
                    ))}
                </div>
            ) : (
                <ul className="flex flex-col gap-3">
                    {data.map((d) => (
                        <li key={d.label} className="flex flex-col gap-1" title={`${d.label}: ${d.value} ${unit}`}>
                            <div className="flex justify-between text-xs">
                                <span className="text-zinc-700 dark:text-zinc-300">{d.label}</span>
                                <span className="font-semibold text-black dark:text-zinc-50 tabular-nums">{d.value} {unit}</span>
                            </div>
                            <div className="h-2.5 w-full rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                                <div className="h-full rounded-full bg-violet-500" style={{ width: `${(d.value / max) * 100}%` }} />
                            </div>
                        </li>
                    ))}
                </ul>
            )}

            {!showTable && orientation === "vertical" && (
                <div className="flex gap-1 sm:gap-2 -mt-2" aria-hidden="true">
                    {data.map((d, i) => (
                        // With many bars, show every other label on phones so they never crowd past the edge.
                        <span key={d.label} className={`flex-1 min-w-0 text-center text-[10px] sm:text-xs text-zinc-500 dark:text-zinc-400 whitespace-nowrap ${data.length > 8 && i % 2 === 1 ? "invisible sm:visible" : ""}`}>{d.label.replace(" ", "")}</span>
                    ))}
                </div>
            )}
        </figure>
    );
}
