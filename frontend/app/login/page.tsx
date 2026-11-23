import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import AuthShell from "../components/auth-shell";
import { LoginForm } from "../components/auth-forms";

export const metadata: Metadata = {
  title: "Login",
};

export default function LoginPage() {
  return (
    <AuthShell
      title="Welcome"
      highlight="Back"
      subtitle="Sign in to manage your queues and counters."
      footer={<>New to QueueWise? <Link href="/signup" className="font-semibold text-violet-600 dark:text-violet-400 hover:underline">Create an account</Link></>}
    >
      {/* LoginForm reads ?next=..., which is only known in the browser. */}
      <Suspense fallback={<div className="h-80 rounded-xl bg-white dark:bg-zinc-900 shadow-lg animate-pulse" aria-hidden="true" />}>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
