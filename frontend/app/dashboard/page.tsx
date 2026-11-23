import type { Metadata } from "next";
import QueueBoard from "../components/dashboard/queue-board";

export const metadata: Metadata = {
  title: "Overview",
};

export default function DashboardPage() {
  return (
    <>
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl sm:text-3xl font-bold text-black dark:text-zinc-50">
          Today&apos;s <span className="text-violet-600 dark:text-violet-400">Queue</span>
        </h1>
        <p className="text-sm text-zinc-700 dark:text-zinc-400">Call visitors, keep the line moving, and see how today is going.</p>
      </div>

      <QueueBoard />
    </>
  );
}
