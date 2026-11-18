import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import ThemeToggle from "../components/theme-toggle";
import SidebarNav from "../components/dashboard/sidebar-nav";

export const metadata: Metadata = {
  title: { default: "Dashboard", template: "%s · QueueWise Dashboard" },
  robots: { index: false, follow: false },
};

// SECURITY: this layout does not protect anything by itself. Before real data is wired in, the backend must
// require a signed-in staff session for /dashboard (proxy/middleware or a server-side session check here)
// and authorize every API call by role and branch.
export default function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  return (
    <div className="flex flex-col flex-1 w-full bg-zinc-50 dark:bg-zinc-950 font-sans">

      <header className="sticky top-0 z-40 bg-white/95 dark:bg-black/95 backdrop-blur border-b border-gray-200 dark:border-gray-600">
        <div className="px-4 py-2 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center">
            <Image src="/logo-light-mode.svg" alt="QueueWise logo" width={40} height={40} draggable={false} className="select-none" />
            <p className="text-lg font-bold text-black dark:text-zinc-50">QueueWise</p>
            <span className="hidden sm:inline ml-2 bg-violet-200/80 dark:bg-violet-500/20 text-violet-600 dark:text-violet-300 text-xs font-semibold px-2 py-1 rounded-lg">Staff</span>
          </Link>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-xs font-semibold text-black dark:text-zinc-50">Front Desk</span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">Main Branch · Counter 2</span>
            </div>

            <Link href="/display" target="_blank" rel="noopener noreferrer" className="hidden sm:inline text-xs font-semibold text-violet-600 dark:text-violet-400 hover:underline">Open Lobby Display ↗</Link>

            <ThemeToggle />

            {/* TODO(backend): replace with a POST sign-out action that clears the server session. */}
            <Link href="/login" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:text-violet-600 dark:hover:text-violet-400">Sign out</Link>
          </div>
        </div>

        <div className="lg:hidden px-4 pb-2">
          <SidebarNav />
        </div>
      </header>

      <div className="flex flex-1 w-full">
        <aside className="hidden lg:flex flex-col w-56 shrink-0 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-black p-4">
          <SidebarNav />
        </aside>

        <main className="flex-1 min-w-0 px-4 sm:px-8 py-8">
          <div className="max-w-7xl mx-auto flex flex-col gap-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
