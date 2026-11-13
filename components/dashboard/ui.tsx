"use client";

import React from "react";
import InfoHint from "@/components/common/InfoHint";
import { Tag } from "primereact/tag";
import { InputSwitch } from "primereact/inputswitch";

/** Shared pieces for every dashboard screen. */

/**
 * A page's title, the sentence under it, and its actions. `help` puts an (i) beside the title saying how the
 * page works, for pages whose figures follow rules a reader cannot see (the reports): only there, never a
 * notice on every page (the user, 28 Oct 2026).
 */
export function PageHeader({ title, subtitle, actions, help, helpLegend }: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  help?: string;
  /** Under the help's words: the colours and scales the page uses, drawn (a legend). */
  helpLegend?: React.ReactNode;
}) {
  return (
    // Wrapping, the title never squeezed: when the actions (a period bar, Filters, Export) do not fit beside it,
    // they move under it rather than cutting it to "Sales ove..." (the user, 28 Oct 2026).
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
      <div className="min-w-0 max-w-full sm:shrink-0">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-(--text-primary)">
          <span className="truncate">{title}</span>
          {help && <InfoHint text={help} title={typeof title === "string" ? `How ${title} works` : "How this page works"} variant="info" className="text-base">{helpLegend}</InfoHint>}
        </h1>
        {subtitle && <p className="mt-0.5 text-sm text-(--text-muted)">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ title, actions, children, className = "", padded = true }: { title?: React.ReactNode; actions?: React.ReactNode; children: React.ReactNode; className?: string; padded?: boolean }) {
  return (
    // min-w-0: a grid or flex item otherwise grows to its longest line and pushes the page sideways on a phone.
    <section className={`min-w-0 rounded-2xl border border-(--border-color) bg-(--bg-card) shadow-(--shadow-sm) ${className}`}>
      {(title || actions) && (
        <header className="flex items-center justify-between gap-3 border-b border-(--border-color) px-5 py-3.5">
          {title && <h2 className="text-sm font-semibold text-(--text-primary)">{title}</h2>}
          {actions}
        </header>
      )}
      <div className={padded ? "p-5" : ""}>{children}</div>
    </section>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = "brand",
  loading = false,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon?: string;
  tone?: "brand" | "accent" | "info" | "danger" | "muted";
  loading?: boolean;
}) {
  const tones: Record<string, string> = {
    brand: "bg-(--brand-light) text-(--brand-ink) dark:bg-(--brand)/25 dark:text-emerald-300",
    accent: "bg-(--accent-light) text-(--accent) dark:bg-amber-900/30 dark:text-amber-300",
    info: "bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300",
    danger: "bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-300",
    muted: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  };
  return (
    <div className="rounded-2xl border border-(--border-color) bg-(--bg-card) p-5 shadow-(--shadow-sm)">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-(--text-muted)">{label}</p>
        {icon && (
          <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${tones[tone]}`}>
            <span className={`pi ${icon} text-sm`} aria-hidden />
          </span>
        )}
      </div>
      {loading ? (
        <div className="mt-3 h-7 w-28 animate-pulse rounded bg-(--border-color)" />
      ) : (
        <p className="mt-2 text-2xl font-bold tracking-tight text-(--text-primary)">{value}</p>
      )}
      {hint && <p className="mt-1 text-xs text-(--text-muted)">{hint}</p>}
    </div>
  );
}

type Severity = "success" | "info" | "warning" | "danger" | "secondary" | "contrast";

const SEVERITY: Record<string, Severity> = {
  // records and accounts
  Active: "success",
  Inactive: "secondary",
  // queued work
  Pending: "warning",
  Failed: "danger",
  Completed: "success",
  // notices and announcements
  Unread: "info",
  Read: "secondary",
  "Not sent": "secondary",
  Scheduled: "info",
  Queued: "warning",
  Sending: "warning",
  Sent: "success",
  // the funnel's stages
  Prospect: "secondary",
  Lead: "info",
  "KYC completed": "warning",
  Customer: "success",
  // dropped, with a reason (not a stage: docs/leads.md "Drop and reopen")
  Dropped: "danger",
  // a loan application (docs/loan-applications.md) and its approval
  Submitted: "warning",
  Approved: "success",
  Rejected: "danger",
  Disbursed: "success",
  Returned: "warning",
  Withdrawn: "secondary",
  Cancelled: "secondary",
  "Loan application sent": "success",
  // a prospect target's period
  Upcoming: "info",
  Running: "success",
  Ended: "secondary",
  // visits and refused check-ins
  Open: "info",
  "Checked out": "success",
  "Closed without check-out": "warning",
  "Too far": "danger",
  "GPS too weak": "warning",
  "No saved location": "warning",
  // KYC
  Draft: "warning",
  Current: "success",
  Older: "secondary",
};

/** A status as a coloured tag. `raw` is kept for callers that pass it; the word is shown as is. */
export function StatusTag({ status }: { status: string; raw?: boolean }) {
  return <Tag value={status} severity={SEVERITY[status] ?? "secondary"} className="text-xs" />;
}

export function EmptyState({ icon = "pi-inbox", title, body, action }: { icon?: string; title: string; body?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-(--border-color) px-6 py-14 text-center">
      <span className={`pi ${icon} text-3xl text-(--text-muted)`} aria-hidden />
      <p className="text-base font-semibold text-(--text-primary)">{title}</p>
      {body && <p className="max-w-md text-sm text-(--text-muted)">{body}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

/**
 * A form field: a short label over the input, then one line of help or the error. `info` adds an (i) beside
 * the label that opens an overlay explaining the field at length (InfoHint: blank lines make paragraphs,
 * lines starting "- " make bullets).
 */
export function Field({ label, required, hint, info, error, htmlFor, children, className = "" }: {
  label: string;
  required?: boolean;
  hint?: React.ReactNode;
  info?: string;
  error?: string | null;
  htmlFor?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    // data-invalid turns every control inside red (app/globals.css, "Invalid fields").
    <div className={`min-w-0 space-y-1.5 ${className}`} data-invalid={error ? "true" : undefined}>
      <div className="flex items-center gap-1.5">
        <label htmlFor={htmlFor} className="block text-sm font-medium text-(--text-primary)">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        {info && <InfoHint text={info} title={label} variant="info" />}
      </div>
      {children}
      {error ? <small className="block text-xs text-red-500">{error}</small> : hint && <small className="block text-xs text-(--text-muted)">{hint}</small>}
    </div>
  );
}

/**
 * One part of a longer form: a numbered heading and a line on what it asks, so the form reads as
 * a few steps rather than a heap of inputs.
 */
export function FormSection({ n, title, hint, children, className = "" }: {
  n: number;
  title: string;
  hint?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`min-w-0 ${className}`} aria-label={title}>
      <header className="mb-3 flex items-start gap-3">
        <span aria-hidden className="mt-px flex size-6 shrink-0 items-center justify-center rounded-full bg-(--brand) text-xs font-bold text-white">{n}</span>
        <div className="min-w-0">
          <h3 className="m-0 text-sm font-semibold text-(--text-primary)">{title}</h3>
          {hint && <p className="m-0 mt-0.5 text-xs text-(--text-muted)">{hint}</p>}
        </div>
      </header>
      <div className="space-y-4 sm:pl-9">{children}</div>
    </section>
  );
}

/**
 * An on/off setting: the label and one line of help on the left, the switch on
 * the right at its own size (in a narrow flex row a switch otherwise squashes).
 */
export function SwitchRow({ label, hint, checked, onChange, disabled }: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className={`flex items-center justify-between gap-4 py-3 ${disabled ? "opacity-60" : "cursor-pointer"}`}>
      <span className="min-w-0">
        <span className="block text-sm font-medium text-(--text-primary)">{label}</span>
        {hint && <span className="block text-xs text-(--text-muted)">{hint}</span>}
      </span>
      <InputSwitch checked={checked} onChange={(e) => onChange(!!e.value)} disabled={disabled} className="shrink-0" />
    </label>
  );
}

export function ProgressBar({ value, className = "" }: { value: number; className?: string }) {
  return (
    <div className={`h-2 overflow-hidden rounded-full bg-(--border-color) ${className}`}>
      <span className="block h-full rounded-full bg-linear-to-r from-(--brand) to-(--accent-mid) transition-all duration-700" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}
