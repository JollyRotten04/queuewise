import type { Metadata } from "next";
import StatCard from "../../components/dashboard/stat-card";
import BarChart from "../../components/dashboard/bar-chart";
import { getService, mockHourlyWait, mockServedByService, mockStats } from "../../lib/mock-data";

export const metadata: Metadata = {
  title: "Analytics",
};

export default function AnalyticsPage() {
  const busiest = mockHourlyWait.reduce((best, h) => (h.minutes > best.minutes ? h : best));
  const totalServed = mockServedByService.reduce((sum, s) => sum + s.served, 0);
  const priorityShare = Math.round(((mockServedByService.find((s) => s.serviceId === "priority")?.served ?? 0) / totalServed) * 100);

  return (
    <>
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl sm:text-3xl font-bold text-black dark:text-zinc-50">
          Today&apos;s <span className="text-violet-600 dark:text-violet-400">Analytics</span>
        </h1>
        <p className="text-sm text-zinc-700 dark:text-zinc-400">Use wait times and volume to plan counters and staffing.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total served" value={String(totalServed)} icon="✓" />
        <StatCard label="Avg. wait" value={`${mockStats.avgWaitMinutes} min`} icon="⏱" />
        <StatCard label="Busiest hour" value={busiest.hour} hint={`~${busiest.minutes} min wait`} icon="▲" />
        <StatCard label="Priority share" value={`${priorityShare}%`} hint="Of visitors served" icon="☆" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 min-w-0">
          <BarChart
            title="Average wait by hour"
            unit="min"
            data={mockHourlyWait.map((h) => ({ label: h.hour, value: h.minutes }))}
          />
        </div>

        <BarChart
          title="Visitors served by service"
          unit="served"
          orientation="horizontal"
          data={mockServedByService.map((s) => ({ label: getService(s.serviceId).name, value: s.served }))}
        />
      </div>
    </>
  );
}
