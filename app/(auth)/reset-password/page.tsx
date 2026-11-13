import type { Metadata } from "next";
import { Suspense } from "react";
import AuthShell from "@/components/auth/AuthShell";
import ResetPasswordForm from "./ResetPasswordForm";

export const metadata: Metadata = { title: "Choose a new password" };

/**
 * Opened from a reset email: /reset-password?token=... Staff links land here, and so does the
 * mobile app's "forgot password" (it opens adb.elevatepesa.com/reset-password), so the address
 * and the `token` parameter must not change. Public, signed in or not.
 */
export default function ResetPasswordPage() {
  return (
    <AuthShell title="Choose a new password" subtitle="At least 6 characters.">
      <Suspense>
        <ResetPasswordForm />
      </Suspense>
    </AuthShell>
  );
}
