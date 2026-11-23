import type { Metadata } from "next";
import AnalyticsView from "../../components/dashboard/analytics-view";

export const metadata: Metadata = {
  title: "Analytics",
};

export default function AnalyticsPage() {
  return (
    <>
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl sm:text-3xl font-bold text-black dark:text-zinc-50">
          Today&apos;s <span className="text-violet-600 dark:text-violet-400">Analytics</span>
        </h1>
        <p className="text-sm text-zinc-700 dark:text-zinc-400">Use wait times and volume to plan counters and staffing.</p>
      </div>

      <AnalyticsView />
    </>
  );
}
