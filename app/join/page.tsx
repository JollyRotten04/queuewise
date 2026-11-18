import type { Metadata } from "next";
import Header from "../components/header";
import Footer from "../components/footer";
import Badge from "../components/badge";
import JoinForm from "../components/join-form";
import CheckTicketForm from "../components/check-ticket-form";
import { mockQueues, getService } from "../lib/mock-data";

export const metadata: Metadata = {
  title: "Join a Queue",
  description: "Get a digital ticket or book an appointment with QueueWise.",
};

export default function JoinPage() {
  return (
    <div className="flex flex-col flex-1 w-full bg-zinc-50 dark:bg-zinc-950 font-sans">
      <Header />

      <main className="flex-1 w-full px-4 sm:px-8 py-10 sm:py-16">
        <div className="max-w-6xl mx-auto flex flex-col gap-8">

          <div className="flex flex-col gap-2">
            <Badge>Join, Wait, Get Served</Badge>

            <h1 className="text-3xl sm:text-4xl font-bold text-black dark:text-zinc-50">
              Join the <span className="text-violet-600 dark:text-violet-400">Queue</span>
            </h1>

            <p className="text-sm text-zinc-700 dark:text-zinc-400 max-w-xl">
              Pick a service, tell us a little about your visit, and get a digital ticket you can track from your phone.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            <div className="lg:col-span-2">
              <JoinForm />
            </div>

            <aside className="flex flex-col gap-6">
              <CheckTicketForm />

              <div className="bg-white dark:bg-zinc-900 shadow-lg rounded-xl p-6 flex flex-col gap-4">
                <h2 className="text-sm font-semibold text-black dark:text-zinc-50">Current wait times</h2>

                <ul className="flex flex-col gap-3">
                  {mockQueues.map((queue) => {
                    const service = getService(queue.serviceId);
                    return (
                      <li key={queue.serviceId} className="flex items-center justify-between gap-3">
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">{service.name}</span>
                          <span className="text-xs text-zinc-500 dark:text-zinc-400">{queue.waiting} waiting · Now serving {queue.nowServing ?? "—"}</span>
                        </div>
                        <span className="text-sm font-bold text-violet-600 dark:text-violet-400 whitespace-nowrap">~{queue.avgWaitMinutes} min</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </aside>
          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
}
