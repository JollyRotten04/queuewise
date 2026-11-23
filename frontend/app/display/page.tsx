import type { Metadata } from "next";
import { Suspense } from "react";
import DisplayBoard from "../components/display-board";

export const metadata: Metadata = {
  title: "Lobby Display",
  robots: { index: false, follow: false },
};

// Full-screen board meant for a lobby TV, so it has no site header or footer. Branch comes from ?b=...
export default function DisplayPage() {
  return (
    <main className="flex flex-col flex-1 min-h-screen w-full bg-zinc-50 dark:bg-zinc-950 font-sans px-4 sm:px-8 py-6 lg:px-12 lg:py-10">
      <Suspense fallback={null}>
        <DisplayBoard />
      </Suspense>
    </main>
  );
}
