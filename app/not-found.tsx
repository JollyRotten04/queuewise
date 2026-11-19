import Link from "next/link";
import Header from "./components/header";
import Footer from "./components/footer";
import Badge from "./components/badge";
import { primaryButton, secondaryButton } from "./lib/styles";

export default function NotFound() {
  return (
    <div className="flex flex-col flex-1 w-full bg-zinc-50 dark:bg-zinc-950 font-sans">
      <Header />

      <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-20 text-center">
        <Badge>404</Badge>

        <h1 className="text-4xl sm:text-5xl font-bold text-black dark:text-zinc-50">
          Lost in <span className="text-violet-600 dark:text-violet-400">Line?</span>
        </h1>

        <p className="text-sm text-zinc-700 dark:text-zinc-400 max-w-md">
          We couldn&apos;t find that page or ticket. Check the ticket number and try again.
        </p>

        <div className="flex gap-4 mt-2">
          <Link href="/" className={`${primaryButton} w-32`}>Go Home</Link>
          <Link href="/join" className={`${secondaryButton} w-32`}>Join a Queue</Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
