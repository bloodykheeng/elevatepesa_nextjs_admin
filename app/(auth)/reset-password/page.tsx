import type { Metadata } from "next";
import { Suspense } from "react";
import ResetPasswordScreen from "./ResetPasswordScreen";

export const metadata: Metadata = { title: "Reset your password" };

/**
 * /reset-password?token=... (from a reset or welcome email): choose a new password.
 * /reset-password with no token: the mobile app's "Forgot password?" opens exactly this
 * (adb.elevatepesa.com/reset-password), so it asks for the email and sends a link, for customers and staff.
 * The address and the `token` parameter must not change. Public, signed in or not.
 */
export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordScreen />
    </Suspense>
  );
}
