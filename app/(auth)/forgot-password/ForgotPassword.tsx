import Link from "next/link";
import { MdArrowBack } from "react-icons/md";
import AuthShell from "@/components/auth/AuthShell";
import ForgotPasswordRowForm from "./RowForm";

/** Forgot password: we email a link that opens /reset-password. */
export default function ForgotPassword() {
  return (
    <AuthShell title="Forgot your password?" subtitle="Enter the email of your Elevate Pesa account. We email you a link to choose a new password.">
      <ForgotPasswordRowForm />
      <Link href="/login" className="mt-6 flex items-center justify-center gap-1.5 text-sm font-medium text-(--text-muted) transition-colors hover:text-(--ink)">
        <MdArrowBack className="text-base" aria-hidden /> Back to sign in
      </Link>
    </AuthShell>
  );
}
