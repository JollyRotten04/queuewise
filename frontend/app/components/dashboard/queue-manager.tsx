"use client";

import { useCallback, useEffect, useState } from "react";
import { card } from "../../lib/styles";
import { api, errorMessage, useLiveRefresh } from "../../lib/api";
import type { QueueService, QueuesResponse } from "../../lib/types";
import { useLoginRedirect } from "./staff-menu";

const MAX_COUNTERS = 99;

const stepButton = "h-9 aspect-square rounded-full border border-zinc-300 dark:border-zinc-600 text-lg text-zinc-700 dark:text-zinc-200 cursor-pointer hover:border-violet-400 disabled:opacity-40 disabled:cursor-not-allowed";

export default function QueueManager() {
    const redirectIfLoggedOut = useLoginRedirect();
    const [data, setData] = useState<QueuesResponse | null>(null);
    const [saving, setSaving] = useState<string | null>(null);
    const [error, setError] = useState("");

    const load = useCallback(() => {
        api<QueuesResponse>("/staff/queues")
            .then((result) => {
                setData(result);
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
    useLiveRefresh(data?.branch.slug ?? null, load);

    async function save(key: string, path: string, body: Record<string, unknown>) {
        setSaving(key);
        setError("");
        try {
            setData(await api<QueuesResponse>(path, { method: "PATCH", body }));
        } catch (err) {
            if (!redirectIfLoggedOut(err)) setError(errorMessage(err));
        } finally {
            setSaving(null);
        }
    }

    const setCounters = (counterCount: number) => save("counters", "/staff/counters", { counterCount });
    const toggleService = (service: QueueService) => save(service.id, `/staff/services/${service.id}`, { isOpen: !service.isOpen });

    if (!data) {
        return error ? (
            <p role="alert" className="text-sm rounded-xl bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-300 p-4">{error}</p>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-pulse" aria-hidden="true">
                {[0, 1, 2].map((i) => <div key={i} className="h-56 rounded-xl bg-white dark:bg-zinc-900 shadow-lg" />)}
            </div>
        );
    }

    const { services, canManage, counterCount } = data;
    const totalWaiting = services.reduce((sum, s) => sum + s.waiting, 0);

    return (
        <>
            {!canManage && (
                <p className="text-xs rounded-lg bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-300 px-3 py-2">
                    Only branch admins can change counters or pause services.
                </p>
            )}
            {error && <p role="alert" className="text-xs rounded-lg bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-300 px-3 py-2">{error}</p>}

            <section className={`${card} p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-5`} aria-labelledby="counters-title">
                <div className="flex gap-4 items-center">
                    <span className="bg-violet-200/80 dark:bg-violet-500/20 text-violet-600 dark:text-violet-300 h-12 aspect-square flex items-center justify-center rounded-xl text-xl shrink-0" aria-hidden="true">▦</span>
                    <div className="flex flex-col gap-0.5">
                        <h2 id="counters-title" className="text-base font-semibold text-black dark:text-zinc-50">Open counters</h2>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                            Every counter serves every service from one shared line. {totalWaiting} waiting right now.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-auto">
                    <button type="button" aria-label="Close a counter" disabled={!canManage || saving === "counters" || counterCount <= 0} onClick={() => setCounters(counterCount - 1)} className={stepButton}>−</button>
                    <span className="min-w-10 text-center text-3xl font-bold text-black dark:text-zinc-50 tabular-nums" aria-live="polite">{counterCount}</span>
                    <button type="button" aria-label="Open a counter" disabled={!canManage || saving === "counters" || counterCount >= MAX_COUNTERS} onClick={() => setCounters(counterCount + 1)} className={stepButton}>+</button>
                </div>
            </section>

            <h2 className="text-sm font-semibold text-black dark:text-zinc-50">Services</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {services.map((service) => {
                    const disabled = !canManage || saving === service.id;
                    return (
                        <article key={service.id} className={`${card} p-6 flex flex-col gap-5`}>
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex gap-3 items-center min-w-0">
                                    <span className="bg-violet-200/80 dark:bg-violet-500/20 text-violet-600 dark:text-violet-300 h-10 aspect-square flex items-center justify-center rounded-xl text-lg shrink-0" aria-hidden="true">{service.icon}</span>
                                    <div className="flex flex-col min-w-0">
                                        <h3 className="text-sm font-semibold text-black dark:text-zinc-50 truncate">{service.name}</h3>
                                        <p className="text-xs text-zinc-500 dark:text-zinc-400">Prefix {service.prefix} · ~{service.avgServiceMinutes} min per visitor</p>
                                    </div>
                                </div>

                                <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg whitespace-nowrap ${service.isOpen ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300" : "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"}`}>
                                    <span aria-hidden="true">{service.isOpen ? "●" : "❚❚"}</span>
                                    {service.isOpen ? "Open" : "Paused"}
                                </span>
                            </div>

                            <dl className="grid grid-cols-3 gap-2 text-center">
                                <div className="rounded-lg bg-zinc-50 dark:bg-zinc-800 p-2">
                                    <dt className="text-xs text-zinc-500 dark:text-zinc-400">Waiting</dt>
                                    <dd className="text-lg font-bold text-black dark:text-zinc-50">{service.waiting}</dd>
                                </div>
                                <div className="rounded-lg bg-zinc-50 dark:bg-zinc-800 p-2">
                                    <dt className="text-xs text-zinc-500 dark:text-zinc-400">Last called</dt>
                                    <dd className="text-lg font-bold text-violet-600 dark:text-violet-400">{service.nowServing ?? "—"}</dd>
                                </div>
                                <div className="rounded-lg bg-zinc-50 dark:bg-zinc-800 p-2">
                                    <dt className="text-xs text-zinc-500 dark:text-zinc-400">Avg wait</dt>
                                    <dd className="text-lg font-bold text-black dark:text-zinc-50">{service.avgWaitMinutes}m</dd>
                                </div>
                            </dl>

                            <button
                                type="button"
                                disabled={disabled}
                                onClick={() => toggleService(service)}
                                className={`inline-flex items-center justify-center rounded-full px-4 py-2 text-xs font-semibold cursor-pointer hover:scale-105 transition-transform duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 ${service.isOpen ? "bg-white dark:bg-zinc-900 border border-zinc-500 text-violet-600 dark:text-violet-400" : "bg-violet-500 text-white"}`}
                            >
                                {service.isOpen ? "Pause Service" : "Reopen Service"}
                            </button>
                        </article>
                    );
                })}
            </div>
        </>
    );
}
