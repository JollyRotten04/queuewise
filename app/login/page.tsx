import type { Metadata } from "next";
import Link from "next/link";
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
      <LoginForm />
    </AuthShell>
  );
}
