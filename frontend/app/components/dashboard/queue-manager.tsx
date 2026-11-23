"use client";

import { useCallback, useEffect, useState } from "react";
import { card } from "../../lib/styles";
import { api, errorMessage, useLiveRefresh } from "../../lib/api";
import type { QueueService, QueuesResponse } from "../../lib/types";
import { useLoginRedirect } from "./staff-menu";

const MAX_COUNTERS = 50;

export default function QueueManager() {
    const redirectIfLoggedOut = useLoginRedirect();
    const [data, setData] = useState<QueuesResponse | null>(null);
    const [savingId, setSavingId] = useState<string | null>(null);
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

    async function update(service: QueueService, change: { isOpen?: boolean; openCounters?: number }) {
        setSavingId(service.id);
        setError("");
        try {
            setData(await api<QueuesResponse>(`/staff/services/${service.id}`, { method: "PATCH", body: change }));
        } catch (err) {
            if (!redirectIfLoggedOut(err)) setError(errorMessage(err));
        } finally {
            setSavingId(null);
        }
    }

    if (!data) {
        return error ? (
            <p role="alert" className="text-sm rounded-xl bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-300 p-4">{error}</p>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 animate-pulse" aria-hidden="true">
                {[0, 1, 2].map((i) => <div key={i} className="h-72 rounded-xl bg-white dark:bg-zinc-900 shadow-lg" />)}
            </div>
        );
    }

    const { services, canManage } = data;

    return (
        <>
            {!canManage && (
                <p className="text-xs rounded-lg bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-300 px-3 py-2">
                    Only branch admins can pause queues or change counters.
                </p>
            )}
            {error && <p role="alert" className="text-xs rounded-lg bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-300 px-3 py-2">{error}</p>}

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {services.map((service) => {
                    const disabled = !canManage || savingId === service.id;
                    return (
                        <article key={service.id} className={`${card} p-6 flex flex-col gap-5`}>
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex gap-3 items-center min-w-0">
                                    <span className="bg-violet-200/80 dark:bg-violet-500/20 text-violet-600 dark:text-violet-300 h-10 aspect-square flex items-center justify-center rounded-xl text-lg shrink-0" aria-hidden="true">{service.icon}</span>
                                    <div className="flex flex-col min-w-0">
                                        <h2 className="text-sm font-semibold text-black dark:text-zinc-50 truncate">{service.name}</h2>
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
                                    <dt className="text-xs text-zinc-500 dark:text-zinc-400">Serving</dt>
                                    <dd className="text-lg font-bold text-violet-600 dark:text-violet-400">{service.nowServing ?? "—"}</dd>
                                </div>
                                <div className="rounded-lg bg-zinc-50 dark:bg-zinc-800 p-2">
                                    <dt className="text-xs text-zinc-500 dark:text-zinc-400">Avg wait</dt>
                                    <dd className="text-lg font-bold text-black dark:text-zinc-50">{service.avgWaitMinutes}m</dd>
                                </div>
                            </dl>

                            <div className="flex items-center justify-between gap-3">
                                <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Open counters</span>
                                <div className="flex items-center gap-2">
                                    <button type="button" aria-label={`Close a counter for ${service.name}`} disabled={disabled || service.openCounters <= 0} onClick={() => update(service, { openCounters: service.openCounters - 1 })} className="h-8 aspect-square rounded-full border border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">−</button>
                                    <span className="w-6 text-center text-sm font-bold text-black dark:text-zinc-50 tabular-nums" aria-live="polite">{service.openCounters}</span>
                                    <button type="button" aria-label={`Open a counter for ${service.name}`} disabled={disabled || service.openCounters >= MAX_COUNTERS} onClick={() => update(service, { openCounters: service.openCounters + 1 })} className="h-8 aspect-square rounded-full border border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">+</button>
                                </div>
                            </div>

                            <button
                                type="button"
                                disabled={disabled}
                                onClick={() => update(service, { isOpen: !service.isOpen })}
                                className={`inline-flex items-center justify-center rounded-full px-4 py-2 text-xs font-semibold cursor-pointer hover:scale-105 transition-transform duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 ${service.isOpen ? "bg-white dark:bg-zinc-900 border border-zinc-500 text-violet-600 dark:text-violet-400" : "bg-violet-500 text-white"}`}
                            >
                                {service.isOpen ? "Pause Queue" : "Reopen Queue"}
                            </button>
                        </article>
                    );
                })}
            </div>
        </>
    );
}
