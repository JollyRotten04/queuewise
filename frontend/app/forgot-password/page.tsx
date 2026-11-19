import type { Metadata } from "next";
import Link from "next/link";
import AuthShell from "../components/auth-shell";
import { ForgotPasswordForm } from "../components/auth-forms";

export const metadata: Metadata = {
  title: "Reset Password",
};

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Reset"
      highlight="Password"
      subtitle="Enter your work email and we'll send you a link to set a new password."
      footer={<>Remembered it? <Link href="/login" className="font-semibold text-violet-600 dark:text-violet-400 hover:underline">Back to Login</Link></>}
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
