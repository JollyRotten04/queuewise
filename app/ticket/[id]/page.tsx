import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import Header from "../../components/header";
import Footer from "../../components/footer";
import TicketStatus from "../../components/ticket-status";
import { isValidTicketNumber } from "../../lib/mock-data";
import { primaryButton } from "../../lib/styles";

export const metadata: Metadata = {
  title: "My Ticket",
  // Ticket pages are personal; keep them out of search results.
  robots: { index: false, follow: false },
};

async function TicketContent({ params }: { params: PageProps<"/ticket/[id]">["params"] }) {
  const { id } = await params;
  const ticketNumber = decodeURIComponent(id).toUpperCase();

  // Rendered inline: the page shell is already streamed (partial prerender), so notFound() here would leave an empty slot.
  if (!isValidTicketNumber(ticketNumber)) {
    return (
      <div className="bg-white dark:bg-zinc-900 shadow-lg rounded-xl p-8 flex flex-col items-center gap-3 text-center">
        <p className="text-3xl" aria-hidden="true">🎫</p>
        <p className="text-sm font-semibold text-black dark:text-zinc-50">We couldn&apos;t find that ticket</p>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">Ticket numbers look like G-024, D-011, or P-003.</p>
        <Link href="/join#check-ticket" className={`${primaryButton} mt-2`}>Check Another Ticket</Link>
      </div>
    );
  }

  return <TicketStatus ticketNumber={ticketNumber} />;
}

function TicketSkeleton() {
  return (
    <div className="flex flex-col gap-6 w-full animate-pulse" aria-hidden="true">
      <div className="h-64 rounded-xl bg-white dark:bg-zinc-900 shadow-lg" />
      <div className="h-32 rounded-xl bg-white dark:bg-zinc-900 shadow-lg" />
    </div>
  );
}

export default function TicketPage({ params }: PageProps<"/ticket/[id]">) {
  return (
    <div className="flex flex-col flex-1 w-full bg-zinc-50 dark:bg-zinc-950 font-sans">
      <Header />

      <main className="flex-1 w-full px-4 sm:px-8 py-10 sm:py-16">
        <div className="max-w-xl mx-auto flex flex-col gap-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-black dark:text-zinc-50 text-center">
            Your <span className="text-violet-600 dark:text-violet-400">Ticket</span>
          </h1>

          <Suspense fallback={<TicketSkeleton />}>
            <TicketContent params={params} />
          </Suspense>
        </div>
      </main>

      <Footer />
    </div>
  );
}
