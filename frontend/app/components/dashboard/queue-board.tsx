"use client";

import { useState } from "react";
import { card, dangerButton, primaryButton, secondaryButton } from "../../lib/styles";
import { getService, mockTickets, priorityLabels, type Ticket } from "../../lib/mock-data";

// Priority tickets are always called before regular ones; otherwise first come, first served.
function nextTicketIndex(tickets: Ticket[]) {
    const priorityIndex = tickets.findIndex((t) => t.priority !== "none");
    return priorityIndex >= 0 ? priorityIndex : 0;
}

export default function QueueBoard() {
    // TODO(backend): load waiting tickets from the API and send each action (call/recall/complete/no-show) to the server.
    // Each action must be authorized server-side for the signed-in staff member's branch and counter.
    const [waiting, setWaiting] = useState<Ticket[]>(mockTickets);
    const [current, setCurrent] = useState<Ticket | null>(null);
    const [recalls, setRecalls] = useState(0);
    const [lastAction, setLastAction] = useState("Ready to serve.");

    function callNext() {
        if (waiting.length === 0) return;
        const index = nextTicketIndex(waiting);
        const ticket = waiting[index];
        setWaiting((list) => list.filter((_, i) => i !== index));
        setCurrent({ ...ticket, status: "called" });
        setRecalls(0);
        setLastAction(`Called ${ticket.number} to Counter 2.`);
    }

    function recall() {
        if (!current) return;
        setRecalls((n) => n + 1);
        setLastAction(`Recalled ${current.number}.`);
    }

    function finish(outcome: "completed" | "no-show") {
        if (!current) return;
        setLastAction(outcome === "completed" ? `${current.number} marked as served.` : `${current.number} marked as no-show.`);
        setCurrent(null);
    }

    return (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

            <section className={`${card} p-6 flex flex-col gap-5`} aria-labelledby="now-serving-title">
                <div className="flex items-center justify-between">
                    <h2 id="now-serving-title" className="text-sm font-semibold text-black dark:text-zinc-50">Now Serving · Counter 2</h2>
                    <span className="text-xs text-zinc-500">{waiting.length} waiting</span>
                </div>

                <div className="flex flex-col items-center gap-1 rounded-xl bg-violet-50 dark:bg-violet-500/10 py-8 px-4 text-center">
                    <p className="text-5xl font-bold text-black dark:text-zinc-50">{current?.number ?? "—"}</p>
                    {current ? (
                        <>
                            <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">{current.customerName}</p>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                {getService(current.serviceId).name}
                                {current.priority !== "none" && ` · ${priorityLabels[current.priority]}`}
                                {recalls > 0 && ` · Recalled ${recalls}×`}
                            </p>
                        </>
                    ) : (
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">No ticket at this counter</p>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <button type="button" onClick={callNext} disabled={!!current || waiting.length === 0} className={`${primaryButton} col-span-2 py-2.5 hover:scale-105`}>
                        Call Next →
                    </button>
                    <button type="button" onClick={recall} disabled={!current} className={`${secondaryButton} hover:scale-105`}>Recall</button>
                    <button type="button" onClick={() => finish("completed")} disabled={!current} className={`${secondaryButton} hover:scale-105`}>Complete</button>
                    <button type="button" onClick={() => finish("no-show")} disabled={!current} className={`${dangerButton} col-span-2`}>Mark No-show</button>
                </div>

                <p role="status" aria-live="polite" className="text-xs text-zinc-500 dark:text-zinc-400">{lastAction}</p>
            </section>

            <section className={`${card} p-6 flex flex-col gap-4 xl:col-span-2 min-w-0`} aria-labelledby="waiting-title">
                <h2 id="waiting-title" className="text-sm font-semibold text-black dark:text-zinc-50">Waiting List</h2>

                {waiting.length === 0 ? (
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 py-8 text-center">The queue is empty. 🎉</p>
                ) : (
                    <>
                        {/* Table on larger screens */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead>
                                    <tr className="text-xs text-zinc-500 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-700">
                                        <th scope="col" className="py-2 pr-4 font-semibold">Ticket</th>
                                        <th scope="col" className="py-2 pr-4 font-semibold">Name</th>
                                        <th scope="col" className="py-2 pr-4 font-semibold">Service</th>
                                        <th scope="col" className="py-2 pr-4 font-semibold">Lane</th>
                                        <th scope="col" className="py-2 font-semibold text-right">Joined</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {waiting.map((ticket) => (
                                        <tr key={ticket.number} className="border-b border-zinc-100 dark:border-zinc-800 last:border-0">
                                            <td className="py-3 pr-4 font-bold text-black dark:text-zinc-50">{ticket.number}</td>
                                            <td className="py-3 pr-4 text-zinc-700 dark:text-zinc-300">{ticket.customerName}</td>
                                            <td className="py-3 pr-4 text-zinc-700 dark:text-zinc-300">{getService(ticket.serviceId).name}</td>
                                            <td className="py-3 pr-4">
                                                <PriorityTag ticket={ticket} />
                                            </td>
                                            <td className="py-3 text-right text-zinc-500 dark:text-zinc-400 tabular-nums">{ticket.joinedAt}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Cards on phones */}
                        <ul className="md:hidden flex flex-col gap-3">
                            {waiting.map((ticket) => (
                                <li key={ticket.number} className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 dark:border-zinc-700 p-3">
                                    <div className="flex flex-col min-w-0">
                                        <span className="text-sm font-bold text-black dark:text-zinc-50">{ticket.number} <span className="font-normal text-zinc-500">· {ticket.joinedAt}</span></span>
                                        <span className="text-xs text-zinc-600 dark:text-zinc-400 truncate">{ticket.customerName} · {getService(ticket.serviceId).name}</span>
                                    </div>
                                    <PriorityTag ticket={ticket} />
                                </li>
                            ))}
                        </ul>
                    </>
                )}
            </section>
        </div>
    );
}

function PriorityTag({ ticket }: { ticket: Ticket }) {
    if (ticket.priority === "none") {
        return <span className="text-xs text-zinc-500 dark:text-zinc-400">Regular</span>;
    }
    return (
        <span className="inline-flex items-center gap-1 bg-violet-200/80 dark:bg-violet-500/20 text-violet-600 dark:text-violet-300 text-xs font-semibold px-2 py-1 rounded-lg whitespace-nowrap">
            <span aria-hidden="true">☆</span>{priorityLabels[ticket.priority]}
        </span>
    );
}
