"use client";

import { useState } from "react";
import { card } from "../../lib/styles";
import { getService, mockQueues, type QueueSummary, type ServiceId } from "../../lib/mock-data";

const MAX_COUNTERS = 10;

export default function QueueManager() {
    // TODO(backend): load queues from the API and persist changes. Only branch managers should be allowed to change these (enforce server-side).
    const [queues, setQueues] = useState<QueueSummary[]>(mockQueues);

    function update(serviceId: ServiceId, change: Partial<QueueSummary>) {
        setQueues((list) => list.map((q) => (q.serviceId === serviceId ? { ...q, ...change } : q)));
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {queues.map((queue) => {
                const service = getService(queue.serviceId);
                return (
                    <article key={queue.serviceId} className={`${card} p-6 flex flex-col gap-5`}>
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex gap-3 items-center min-w-0">
                                <span className="bg-violet-200/80 dark:bg-violet-500/20 text-violet-600 dark:text-violet-300 h-10 aspect-square flex items-center justify-center rounded-xl text-lg shrink-0" aria-hidden="true">{service.icon}</span>
                                <div className="flex flex-col min-w-0">
                                    <h2 className="text-sm font-semibold text-black dark:text-zinc-50 truncate">{service.name}</h2>
                                    <p className="text-xs text-zinc-500 dark:text-zinc-400">Prefix {service.prefix} · ~{service.avgServiceMinutes} min per visitor</p>
                                </div>
                            </div>

                            <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg whitespace-nowrap ${queue.isOpen ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300" : "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"}`}>
                                <span aria-hidden="true">{queue.isOpen ? "●" : "❚❚"}</span>
                                {queue.isOpen ? "Open" : "Paused"}
                            </span>
                        </div>

                        <dl className="grid grid-cols-3 gap-2 text-center">
                            <div className="rounded-lg bg-zinc-50 dark:bg-zinc-800 p-2">
                                <dt className="text-xs text-zinc-500 dark:text-zinc-400">Waiting</dt>
                                <dd className="text-lg font-bold text-black dark:text-zinc-50">{queue.waiting}</dd>
                            </div>
                            <div className="rounded-lg bg-zinc-50 dark:bg-zinc-800 p-2">
                                <dt className="text-xs text-zinc-500 dark:text-zinc-400">Serving</dt>
                                <dd className="text-lg font-bold text-violet-600 dark:text-violet-400">{queue.nowServing ?? "—"}</dd>
                            </div>
                            <div className="rounded-lg bg-zinc-50 dark:bg-zinc-800 p-2">
                                <dt className="text-xs text-zinc-500 dark:text-zinc-400">Avg wait</dt>
                                <dd className="text-lg font-bold text-black dark:text-zinc-50">{queue.avgWaitMinutes}m</dd>
                            </div>
                        </dl>

                        <div className="flex items-center justify-between gap-3">
                            <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Open counters</span>
                            <div className="flex items-center gap-2">
                                <button type="button" aria-label={`Close a counter for ${service.name}`} disabled={queue.counters <= 1} onClick={() => update(queue.serviceId, { counters: queue.counters - 1 })} className="h-8 aspect-square rounded-full border border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">−</button>
                                <span className="w-6 text-center text-sm font-bold text-black dark:text-zinc-50 tabular-nums" aria-live="polite">{queue.counters}</span>
                                <button type="button" aria-label={`Open a counter for ${service.name}`} disabled={queue.counters >= MAX_COUNTERS} onClick={() => update(queue.serviceId, { counters: queue.counters + 1 })} className="h-8 aspect-square rounded-full border border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">+</button>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={() => update(queue.serviceId, { isOpen: !queue.isOpen })}
                            className={`inline-flex items-center justify-center rounded-full px-4 py-2 text-xs font-semibold cursor-pointer hover:scale-105 transition-transform duration-300 ${queue.isOpen ? "bg-white dark:bg-zinc-900 border border-zinc-500 text-violet-600 dark:text-violet-400" : "bg-violet-500 text-white"}`}
                        >
                            {queue.isOpen ? "Pause Queue" : "Reopen Queue"}
                        </button>
                    </article>
                );
            })}
        </div>
    );
}
