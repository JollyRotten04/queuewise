"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import JoinForm from "./join-form";
import { api, branchPath, errorMessage, useBranchSlug, useLiveRefresh } from "../lib/api";
import { primaryButton, card } from "../lib/styles";
import type { ActiveTicket, BranchInfo } from "../lib/types";

const activeStatusText: Record<ActiveTicket["status"], string> = {
    waiting: "You're in line now.",
    scheduled: "You have an upcoming appointment.",
    called: "You're being called right now!",
};

function ActiveTicketNotice({ slug, ticket, today }: { slug: string; ticket: ActiveTicket; today: string }) {
    const params = new URLSearchParams({ b: slug });
    if (ticket.day !== today) params.set("d", ticket.day);

    return (
        <div className={`${card} p-6 sm:p-8 flex flex-col items-center gap-3 text-center`}>
            <p className="text-xs font-semibold uppercase tracking-wide text-violet-600 dark:text-violet-300">You already have a ticket</p>
            <p className="text-6xl font-bold tracking-tight text-black dark:text-zinc-50">{ticket.number}</p>
            <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">{activeStatusText[ticket.status]}</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm">
                To keep the line fair, each visitor can hold one ticket at a time. Cancel this one from its page if you need a different service.
            </p>
            <Link href={`/ticket/${ticket.number}?${params}`} className={`${primaryButton} mt-2 px-6 py-2.5`}>View My Ticket →</Link>
        </div>
    );
}

export default function JoinView() {
    const slug = useBranchSlug();
    const [info, setInfo] = useState<BranchInfo | null>(null);
    const [activeTicket, setActiveTicket] = useState<ActiveTicket | null>(null);
    const [error, setError] = useState("");

    const load = useCallback(() => {
        Promise.all([
            api<BranchInfo>(branchPath(slug)),
            api<{ ticket: ActiveTicket | null }>(`${branchPath(slug)}/my-ticket`),
        ])
            .then(([branchInfo, mine]) => {
                setInfo(branchInfo);
                setActiveTicket(mine.ticket);
                setError("");
            })
            .catch((err) => setError(errorMessage(err)));
    }, [slug]);

    useEffect(() => {
        load();
    }, [load]);
    useLiveRefresh(slug, load);

    // Coming back with the browser's Back button can restore this page from cache; refresh so it shows
    // the ticket that was just taken instead of a stale form.
    useEffect(() => {
        function onPageShow(event: PageTransitionEvent) {
            if (event.persisted) load();
        }
        window.addEventListener("pageshow", onPageShow);
        return () => window.removeEventListener("pageshow", onPageShow);
    }, [load]);

    if (!info) {
        return error ? (
            <p role="alert" className="text-sm rounded-xl bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-300 p-4">{error}</p>
        ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-pulse" aria-hidden="true">
                <div className="lg:col-span-2 h-96 rounded-xl bg-white dark:bg-zinc-900 shadow-lg" />
                <div className="h-64 rounded-xl bg-white dark:bg-zinc-900 shadow-lg" />
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            <div className="lg:col-span-2 flex flex-col gap-3">
                <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Joining at <span className="text-violet-600 dark:text-violet-400">{info.branch.name}</span></p>
                {activeTicket ? (
                    <ActiveTicketNotice slug={slug} ticket={activeTicket} today={info.booking.today} />
                ) : (
                    <JoinForm slug={slug} info={info} onActiveTicket={load} />
                )}
            </div>

            <aside className="flex flex-col gap-6">
                <div className="bg-white dark:bg-zinc-900 shadow-lg rounded-xl p-6 flex flex-col gap-4">
                    <h2 className="text-sm font-semibold text-black dark:text-zinc-50">Current wait times</h2>

                    <ul className="flex flex-col gap-3">
                        {info.services.map((service) => (
                            <li key={service.id} className="flex items-center justify-between gap-3">
                                <div className="flex flex-col">
                                    <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">{service.name}</span>
                                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                                        {service.isOpen ? `${service.waiting} waiting · Now serving ${service.nowServing ?? "—"}` : "Paused"}
                                    </span>
                                </div>
                                <span className="text-sm font-bold text-violet-600 dark:text-violet-400 whitespace-nowrap">
                                    {service.isOpen ? `~${service.estimatedWaitMinutes} min` : "—"}
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
            </aside>
        </div>
    );
}
