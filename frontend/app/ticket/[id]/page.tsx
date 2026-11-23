import type { Metadata } from "next";
import { Suspense } from "react";
import Header from "../../components/header";
import Footer from "../../components/footer";
import TicketStatus, { TicketNotFound } from "../../components/ticket-status";
import { TICKET_NUMBER_PATTERN } from "../../lib/types";

export const metadata: Metadata = {
  title: "My Ticket",
  // Ticket pages are personal; keep them out of search results.
  robots: { index: false, follow: false },
};

async function TicketContent({ params }: { params: PageProps<"/ticket/[id]">["params"] }) {
  const { id } = await params;
  const ticketNumber = decodeURIComponent(id).toUpperCase();

  // Rendered inline: the page shell is already streamed (partial prerender), so notFound() here would leave an empty slot.
  if (!TICKET_NUMBER_PATTERN.test(ticketNumber)) {
    return <TicketNotFound />;
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
