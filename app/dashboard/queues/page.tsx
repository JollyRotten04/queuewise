import type { Metadata } from "next";
import QueueManager from "../../components/dashboard/queue-manager";

export const metadata: Metadata = {
  title: "Queues",
};

export default function QueuesPage() {
  return (
    <>
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl sm:text-3xl font-bold text-black dark:text-zinc-50">
          Manage <span className="text-violet-600 dark:text-violet-400">Queues</span>
        </h1>
        <p className="text-sm text-zinc-700 dark:text-zinc-400">Open or pause service queues and adjust how many counters are serving each one.</p>
      </div>

      <QueueManager />
    </>
  );
}
