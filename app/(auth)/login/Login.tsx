import { Suspense } from "react";
import AuthShell from "@/components/auth/AuthShell";
import LoginRowForm from "./RowForm";

/** Staff sign-in. Accounts are made by an admin; customers use the mobile app. */
export default function Login() {
  return (
    <AuthShell title="Sign in" subtitle="Elevate Pesa admin dashboard">
      <Suspense>
        <LoginRowForm />
      </Suspense>
    </AuthShell>
  );
}
