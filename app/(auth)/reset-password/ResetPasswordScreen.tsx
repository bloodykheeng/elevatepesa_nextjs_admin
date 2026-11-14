"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { MdArrowBack } from "react-icons/md";
import AuthShell from "@/components/auth/AuthShell";
import ForgotPasswordRowForm from "../forgot-password/RowForm";
import ResetPasswordForm from "./ResetPasswordForm";

/** With a token: choose the new password. Without one (the app's "Forgot password?"): ask for a link. */
export default function ResetPasswordScreen() {
  const token = useSearchParams().get("token") ?? "";

  if (!token) {
    return (
      <AuthShell title="Forgot your password?" subtitle="Enter the email of your Elevate Pesa account. We email you a link to choose a new password.">
        <ForgotPasswordRowForm />
        <Link href="/login" className="mt-6 flex items-center justify-center gap-1.5 text-sm font-medium text-(--text-muted) transition-colors hover:text-(--ink)">
          <MdArrowBack className="text-base" aria-hidden /> Staff sign-in
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Choose a new password" subtitle="At least 6 characters.">
      <ResetPasswordForm token={token} />
    </AuthShell>
  );
}
