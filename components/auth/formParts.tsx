"use client";

/** Pieces the sign-in, forgot-password and reset-password forms share. */

export function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return (
    <p role="alert" className="mt-1.5 text-xs font-medium text-red-500">
      {msg}
    </p>
  );
}

export function Banner({ tone, children }: { tone: "error" | "info" | "success"; children: React.ReactNode }) {
  const cls =
    tone === "error"
      ? "border-red-200 bg-red-50 text-red-700 dark:border-red-900/40 dark:bg-red-900/10 dark:text-red-400"
      : "border-(--brand)/20 bg-(--brand-light) text-(--brand-ink)";
  return (
    <div role={tone === "error" ? "alert" : "status"} className={`rounded-xl border px-4 py-3 text-sm ${cls}`}>
      {children}
    </div>
  );
}

export const inputCls = (error?: boolean) =>
  [
    "w-full rounded-xl border bg-(--bg-card) px-4 py-3 text-sm text-(--ink)",
    "placeholder:text-(--text-muted) outline-none transition-all",
    error
      ? "border-red-400 focus:border-red-400 focus:ring-2 focus:ring-red-400/20"
      : "border-(--border-color) focus:border-(--brand) focus:ring-2 focus:ring-(--brand-ring)",
  ].join(" ");

export const primaryButtonCls =
  "flex w-full items-center justify-center gap-2 rounded-xl bg-(--brand) px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-(--brand-dark) disabled:cursor-not-allowed disabled:opacity-60";

/** The message a failed request carries: the first field error, else the API's message. */
export function apiMessage(error: unknown, fallback = "Something went wrong. Try again."): string {
  const data = (error as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } })?.response?.data;
  const first = data?.errors ? Object.values(data.errors)[0]?.[0] : undefined;
  if (first) return first;
  if (data?.message) return data.message;
  if (!(error as { response?: unknown })?.response) return "Cannot reach the server. Check your connection.";
  return fallback;
}
