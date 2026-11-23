import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import AuthShell from "../components/auth-shell";
import { ResetPasswordForm } from "../components/auth-forms";

export const metadata: Metadata = {
  title: "Set New Password",
  robots: { index: false, follow: false },
  // The reset token is in this page's URL; never leak it to other sites through the Referer header.
  referrer: "no-referrer",
};

export default function ResetPasswordPage() {
  return (
    <AuthShell
      title="Set a New"
      highlight="Password"
      subtitle="Choose a new password for your QueueWise account."
      footer={<>Link expired? <Link href="/forgot-password" className="font-semibold text-violet-600 dark:text-violet-400 hover:underline">Request a new one</Link></>}
    >
      <Suspense fallback={<div className="h-64 rounded-xl bg-white dark:bg-zinc-900 shadow-lg animate-pulse" aria-hidden="true" />}>
        <ResetPasswordForm />
      </Suspense>
    </AuthShell>
  );
}
