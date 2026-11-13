"use client";

import { LogoMark } from "@/components/brand/Logo";

/**
 * Full-screen branded loader shown while the signed-in profile (and its permissions)
 * settles, so no page paints before auth is ready.
 *
 * This is what stops the dashboard showing for a frame with empty permissions: a
 * sidebar that appears blank and then fills in reads as a broken app, not a fast one.
 * It covers the shell, which renders beneath it (DashboardLayout), rather than
 * replacing it.
 */
export default function AuthLoadingScreen() {
  return (
    <div role="status" aria-label="Loading your account" className="fixed inset-0 z-[1200] flex flex-col items-center justify-center gap-6 bg-(--bg-page)">
      <LogoMark className="h-14 w-14 animate-pulse" />
      <p className="text-sm font-semibold tracking-wide text-(--text-secondary)">Elevate Pesa</p>
      <span className="pi pi-spin pi-spinner text-2xl text-(--text-muted)" />
    </div>
  );
}
