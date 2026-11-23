import type { Metadata } from "next";
import { Suspense } from "react";
import Header from "../components/header";
import Footer from "../components/footer";
import Badge from "../components/badge";
import JoinView from "../components/join-view";

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

          {/* The branch comes from ?b=..., which is only known in the browser. */}
          <Suspense fallback={<div className="h-96 rounded-xl bg-white dark:bg-zinc-900 shadow-lg animate-pulse" aria-hidden="true" />}>
            <JoinView />
          </Suspense>

        </div>
      </main>

      <Footer />
    </div>
  );
}
