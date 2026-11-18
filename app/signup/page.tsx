import type { Metadata } from "next";
import Link from "next/link";
import AuthShell from "../components/auth-shell";
import { SignupForm } from "../components/auth-forms";

export const metadata: Metadata = {
  title: "Create Account",
};

export default function SignupPage() {
  return (
    <AuthShell
      title="Get"
      highlight="Started"
      subtitle="Create your organization's QueueWise account. It's free to start."
      footer={<>Already have an account? <Link href="/login" className="font-semibold text-violet-600 dark:text-violet-400 hover:underline">Login</Link></>}
    >
      <SignupForm />
    </AuthShell>
  );
}
