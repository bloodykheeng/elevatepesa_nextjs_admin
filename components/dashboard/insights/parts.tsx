"use client";

import React from "react";
import Link from "next/link";
import InfoHint from "@/components/common/InfoHint";

/**
 * The dashboard's shared parts: the card a chart sits in (its states never differ between charts),
 * a headline figure, and the quiet arrow that opens the rows a figure counts.
 */

/**
 * The chrome every chart sits in: title, an (i) with the rule behind the figure, the card's own funnel, and the
 * three states a chart can be in besides showing data. Failed is not empty: "nothing to show" and "could not be
 * loaded" are different facts, checked in that order so a failure never reads as no data.
 */
export function ChartCard({
  title,
  subtitle,
  help,
  actions,
  loading,
  refreshing = false,
  error,
  empty,
  emptyMessage = "Nothing to show for this period.",
  height = 300,
  className = "",
  href,
  openLabel,
  children,
}: {
  title: string;
  /** The list of the rows this card counts (the quiet arrow at its corner), and what it opens in words. */
  href?: string;
  openLabel?: string;
  subtitle?: React.ReactNode;
  help?: string;
  actions?: React.ReactNode;
  loading?: boolean;
  /** Another period's or place's figures are loading: the ones shown stay, dimmed, until they arrive. */
  refreshing?: boolean;
  error?: boolean;
  empty?: boolean;
  emptyMessage?: string;
  height?: number;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section aria-busy={refreshing || loading || undefined} className={`group min-w-0 rounded-2xl border border-(--border-color) bg-(--bg-card) p-5 shadow-(--shadow-sm) ${className}`} aria-label={title} data-chart-card={title}>
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1 basis-56">
          <h2 className="m-0 flex items-center gap-1.5 text-base font-semibold text-(--text-primary)">
            {title}
            {help && <InfoHint text={help} title={title} variant="info" />}
          </h2>
          {subtitle && <p className="m-0 mt-0.5 text-xs text-(--text-muted)">{subtitle}</p>}
        </div>
        {(actions || href) && (
          <div className="flex flex-wrap items-center gap-1.5">
            {actions}
            {href && <OpenLink quiet href={href} label={`Open ${openLabel ?? title.toLowerCase()}`} />}
          </div>
        )}
      </header>
      {loading ? (
        <div className="animate-pulse rounded-xl bg-(--border-color)" style={{ height }} aria-label={`Loading ${title}`} />
      ) : error ? (
        <div className="flex flex-col items-center justify-center gap-1 text-center" style={{ height }}>
          <i className="pi pi-exclamation-triangle text-xl text-amber-500" aria-hidden />
          <p className="m-0 text-sm text-(--text-muted)">This could not be loaded.</p>
        </div>
      ) : empty ? (
        <div className="flex flex-col items-center justify-center gap-1 text-center" style={{ height }}>
          <i className="pi pi-chart-bar text-2xl text-(--text-muted)" aria-hidden />
          <p className="m-0 text-sm text-(--text-muted)">{emptyMessage}</p>
        </div>
      ) : (
        <div className={`transition-opacity ${refreshing ? "opacity-50" : ""}`}>{children}</div>
      )}
    </section>
  );
}

/** "+20%", "-8%", "new", or nothing when there is nothing to compare. */
function change(value: number | null, previous: number | null): { text: string; up: boolean } | null {
  if (value === null || previous === null) return null;
  if (previous === 0) return value > 0 ? { text: "new", up: true } : null;
  const pct = Math.round(((value - previous) / previous) * 100);
  return pct === 0 ? { text: "same", up: true } : { text: `${pct > 0 ? "+" : ""}${pct}%`, up: pct > 0 };
}

/** A headline figure, its change against the period before, a line under it, and where it leads. */
export function KpiCard({
  label,
  value,
  shown,
  previous,
  hint,
  icon,
  href,
  openLabel,
  loading,
  bar,
  help,
}: {
  /** How the figure is worked out, behind an (i) beside the label (NICE's InfoHint): what is counted, what is not. */
  help?: string;
  label: string;
  value: number | null | undefined;
  /** How to show it, when not a plain count ("83%", "UGX 1.2M"). */
  shown?: string;
  previous?: number | null;
  hint?: React.ReactNode;
  icon: string;
  /** The list of the rows this figure counts, filtered to them (the arrow at the corner). */
  href?: string;
  /** What the arrow opens, in words ("Open the visits"); the label, lowercased, when left out. */
  openLabel?: string;
  loading?: boolean;
  /** A share (0 to 100) drawn as a bar under the figure: plan kept, target reached. */
  bar?: number | null;
}) {
  const delta = value !== undefined && previous !== undefined ? change(value ?? null, previous ?? null) : null;
  return (
    <div className="group flex h-full flex-col rounded-2xl border border-(--border-color) bg-(--bg-card) p-4 shadow-(--shadow-sm)">
      <div className="flex items-center gap-2.5">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-(--brand-light) text-(--brand-ink)" aria-hidden>
          <i className={`pi ${icon} text-sm`} />
        </span>
        <p className="m-0 flex min-w-0 flex-1 items-center gap-1.5 text-sm font-medium text-(--text-secondary)">
          <span className="truncate">{label}</span>
          {help && <InfoHint text={help} title={label} variant="info" />}
        </p>
        {href && <OpenLink quiet href={href} label={`Open ${openLabel ?? label.toLowerCase()}`} />}
      </div>
      {loading ? (
        <div className="mt-3 h-8 w-24 animate-pulse rounded bg-(--border-color)" />
      ) : (
        <p className="m-0 mt-3 flex flex-wrap items-baseline gap-2 text-2xl font-bold text-(--text-primary)">
          {shown ?? (value === null || value === undefined ? "-" : value.toLocaleString("en-UG"))}
          {delta && (
            <span className={`text-xs font-semibold ${delta.up ? "text-green-700 dark:text-green-400" : "text-red-600 dark:text-red-400"}`} title="Against the same number of days before">
              <i className={`pi ${delta.up ? "pi-arrow-up-right" : "pi-arrow-down-right"} mr-0.5 text-[10px]`} aria-hidden />
              {delta.text}
            </span>
          )}
        </p>
      )}
      {hint && <p className="m-0 mt-1 text-xs text-(--text-muted)">{hint}</p>}
      {bar !== undefined && bar !== null && (
        <div className="mt-auto pt-3">
          <div className="h-1.5 overflow-hidden rounded-full bg-(--border-color)">
            <div className="h-full rounded-full bg-(--brand)" style={{ width: `${Math.min(100, Math.max(0, bar))}%` }} />
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * The arrow at a card's corner that opens the rows the card counts, with the period and place carried over (NICE's
 * OpenLink; the user, 10 Nov 2026: a link to press, never the whole card).
 */
export function OpenLink({ href, label, quiet = false }: { href: string; label: string; quiet?: boolean }) {
  // Quiet: shown when the card is pointed at or the link has the keyboard's focus, so a row of cards does not
  // read as a row of arrows (the user, 10 Nov 2026); always shown where nothing can hover (phones, tablets).
  const hidden = quiet ? "opacity-0 group-hover:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100" : "";
  return (
    <Link href={href} aria-label={label} title={label}
      className={`inline-flex size-7 shrink-0 items-center justify-center rounded-lg text-(--text-muted) no-underline transition hover:bg-(--brand-light) hover:text-(--brand-ink) ${hidden}`}>
      <i className="pi pi-arrow-up-right text-xs" aria-hidden />
    </Link>
  );
}
