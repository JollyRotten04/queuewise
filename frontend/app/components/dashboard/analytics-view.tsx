"use client";

import { useEffect, useState } from "react";
import { api, errorMessage } from "../../lib/api";
import type { Analytics } from "../../lib/types";
import StatCard from "./stat-card";
import BarChart from "./bar-chart";
import { useLoginRedirect } from "./staff-menu";

function hourLabel(hour: number) {
    return `${((hour + 11) % 12) + 1} ${hour < 12 ? "AM" : "PM"}`;
}

export default function AnalyticsView() {
    const redirectIfLoggedOut = useLoginRedirect();
    const [data, setData] = useState<Analytics | null>(null);
    const [error, setError] = useState("");

    useEffect(() => {
        api<Analytics>("/staff/analytics")
            .then(setData)
            .catch((err) => {
                if (!redirectIfLoggedOut(err)) setError(errorMessage(err));
            });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    if (!data) {
        return error ? (
            <p role="alert" className="text-sm rounded-xl bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-300 p-4">{error}</p>
        ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse" aria-hidden="true">
                {[0, 1, 2, 3].map((i) => <div key={i} className="h-28 rounded-xl bg-white dark:bg-zinc-900 shadow-lg" />)}
            </div>
        );
    }

    const { stats, hourlyWait, servedByService } = data;
    const busiest = hourlyWait.reduce<{ hour: number; minutes: number } | null>((best, h) => (!best || h.minutes > best.minutes ? h : best), null);
    const priorityShare = stats.servedToday ? Math.round((stats.priorityServed / stats.servedToday) * 100) : 0;

    return (
        <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Total served" value={String(stats.servedToday)} icon="✓" />
                <StatCard label="Avg. wait" value={`${stats.avgWaitMinutes} min`} icon="⏱" />
                <StatCard label="Busiest hour" value={busiest ? hourLabel(busiest.hour) : "—"} hint={busiest ? `~${busiest.minutes} min wait` : "No visitors called yet"} icon="▲" />
                <StatCard label="Priority share" value={`${priorityShare}%`} hint="Of visitors served" icon="☆" />
            </div>

            {hourlyWait.length === 0 ? (
                <p className="bg-white dark:bg-zinc-900 shadow-lg rounded-xl p-8 text-sm text-center text-zinc-500 dark:text-zinc-400">
                    Charts appear once visitors start being called today.
                </p>
            ) : (
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                    <div className="xl:col-span-2 min-w-0">
                        <BarChart title="Average wait by hour" unit="min" data={hourlyWait.map((h) => ({ label: hourLabel(h.hour), value: h.minutes }))} />
                    </div>

                    <BarChart title="Visitors served by service" unit="served" orientation="horizontal" data={servedByService.map((s) => ({ label: s.name, value: s.served }))} />
                </div>
            )}
        </>
    );
}
