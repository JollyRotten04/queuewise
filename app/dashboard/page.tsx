import type { Metadata } from "next";
import StatCard from "../components/dashboard/stat-card";
import QueueBoard from "../components/dashboard/queue-board";
import { mockStats } from "../lib/mock-data";

export const metadata: Metadata = {
  title: "Overview",
};

export default function DashboardPage() {
  return (
    <>
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl sm:text-3xl font-bold text-black dark:text-zinc-50">
          Good day, <span className="text-violet-600 dark:text-violet-400">Front Desk</span>
        </h1>
        <p className="text-sm text-zinc-700 dark:text-zinc-400">Here&apos;s how your queues are doing today.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Waiting now" value={String(mockStats.waitingNow)} hint="Across all services" icon="⏱" />
        <StatCard label="Served today" value={String(mockStats.servedToday)} hint="Since opening" icon="✓" />
        <StatCard label="Avg. wait" value={`${mockStats.avgWaitMinutes} min`} hint="Join to call" icon="🗠" />
        <StatCard label="No-shows" value={String(mockStats.noShows)} hint="Missed their call" icon="✕" />
      </div>

      <QueueBoard />
    </>
  );
}
