"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Button } from "primereact/button";
import { adminApi } from "@/services/admin";
import { methodLabel } from "@/components/dashboard/admin/parts";
import { dateTime, ugx } from "@/lib/format";
import type { Payment } from "@/services/types/pesa";
import { ContextChip, usePeek, type PeekType } from "./peek";

export const n = (v: unknown) => Number(v ?? 0);

/** A figure in a summary band: small label over a bold value. */
export function StatTile({ label, value, tone }: { label: string; value: React.ReactNode; tone?: "red" }) {
  return (
    <div className="min-w-0 rounded-xl bg-(--bg-page) px-3 py-2">
      <p className="m-0 truncate text-[11px] font-medium text-(--text-muted)">{label}</p>
      {/* Never cut short: an amount that does not fit wraps after "UGX" rather than reading "UGX 1,15...". */}
      <p className={`m-0 text-sm font-bold wrap-break-word ${tone === "red" ? "text-red-600 dark:text-red-400" : "text-(--text-primary)"}`}>{value}</p>
    </div>
  );
}

/** What the Orders and Packages pages let you do with an order's or a package's payments, from its details. */
export type PaymentActions = {
  /** Shown while something is owed. */
  onRecord?: () => void;
  onEdit?: (payment: Payment) => void;
  /** Admins only. */
  onDelete?: (payment: Payment) => void;
};

/**
 * The payments on an order or a package: one payment or many instalments. Each says what its numbers are
 * ("Transaction no. 7546..."), never a bare number beside the amount (the user, 14 Nov 2026), and opens its own
 * details; on the Orders and Packages pages it also records the next instalment and corrects or deletes one.
 */
export function PaymentsSection({ payments, kind, balance = 0, actions }: {
  payments: Payment[] | undefined;
  kind: "payment" | "package-payment";
  /** Still owed: shown beside the heading with the way to pay it. */
  balance?: number;
  actions?: PaymentActions;
}) {
  const { open } = usePeek();
  const count = payments?.length ?? 0;
  return (
    <section>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h3 className="m-0 text-sm font-semibold text-(--text-primary)">
          Payments{count ? ` (${count})` : ""}
          {balance > 0 && <span className="ml-2 font-normal text-red-600 dark:text-red-400">{ugx(balance)} still owed</span>}
          {balance <= 0 && count > 0 && <span className="ml-2 font-normal text-green-700 dark:text-green-400">Paid in full</span>}
        </h3>
        {actions?.onRecord && balance > 0 && (
          <Button label={count ? "Record another instalment" : "Record a payment"} icon="pi pi-wallet" size="small" outlined onClick={actions.onRecord} />
        )}
      </div>
      {count ? (
        <ul className="divide-y divide-(--border-color) overflow-hidden rounded-xl border border-(--border-color)">
          {payments!.map((p) => (
            <li key={p.id} className="flex items-stretch">
              <button type="button" onClick={() => open(kind, p.id)} title="Open this payment"
                className="flex min-w-0 flex-1 cursor-pointer flex-wrap items-center justify-between gap-x-4 gap-y-1 border-0 bg-transparent px-3 py-2.5 text-left text-sm hover:bg-(--bg-page)">
                <span className="min-w-0">
                  <span className="font-bold text-(--text-primary)">{ugx(n(p.amount))}</span>
                  <span className="text-(--text-secondary)"> · {methodLabel(p.payment_method)}</span>
                  {p.transaction_number && (
                    <span className="block text-xs text-(--text-muted)">Transaction no. <span className="font-mono">{p.transaction_number}</span></span>
                  )}
                </span>
                <span className="text-xs text-(--text-muted)">
                  {dateTime(p.created_at)}{p.created_by?.name ? ` · recorded by ${p.created_by.name}` : ""}
                </span>
              </button>
              {(actions?.onEdit || actions?.onDelete) && (
                <span className="flex shrink-0 items-center gap-1 pr-2">
                  {actions.onEdit && <Button icon="pi pi-pencil" text rounded size="small" aria-label="Correct this payment" tooltip="Correct" tooltipOptions={{ position: "top" }} onClick={() => actions.onEdit!(p)} />}
                  {actions.onDelete && <Button icon="pi pi-trash" text rounded size="small" severity="danger" aria-label="Delete this payment" tooltip="Delete" tooltipOptions={{ position: "top" }} onClick={() => actions.onDelete!(p)} />}
                </span>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="m-0 text-sm text-(--text-muted)">No payments yet.</p>
      )}
    </section>
  );
}

const PAGE_OF: Record<PeekType, { href: string; label: string }> = {
  order: { href: "/dashboard/orders", label: "Open in Orders" },
  package: { href: "/dashboard/packages", label: "Open in Packages" },
  user: { href: "/dashboard/users", label: "Open in Customers & staff" },
  payment: { href: "/dashboard/payments", label: "Open in Order payments" },
  "package-payment": { href: "/dashboard/package-payments", label: "Open in Package payments" },
};

/** A peeked record's way to its own page, where its Edit and Record payment are. */
export function OpenInPage({ type, id }: { type: PeekType; id: number }) {
  const { closeAll } = usePeek();
  const page = PAGE_OF[type];
  return (
    <Link href={`${page.href}?view=${id}`} onClick={closeAll} className="p-button p-button-outlined no-underline">
      <i className="pi pi-external-link mr-2 text-sm" aria-hidden />{page.label}
    </Link>
  );
}

/** Close, then the record's own buttons. */
export function DetailsFooter({ onHide, children }: { onHide: () => void; children?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap justify-end gap-2">
      <Button label="Close" text onClick={onHide} />
      {children}
    </div>
  );
}

const CUSTOMER_LISTS = [
  { path: "/dashboard/orders", label: "Orders", icon: "pi pi-shopping-cart" },
  { path: "/dashboard/packages", label: "Packages", icon: "pi pi-truck" },
  { path: "/dashboard/payments", label: "Order payments", icon: "pi pi-wallet" },
  { path: "/dashboard/package-payments", label: "Package payments", icon: "pi pi-money-bill" },
];

/**
 * One customer's lists, a click apart (NICE's VisitQuickLinks): their orders, packages and payments. The list you
 * are on is shown, not linked, so the row also says where you are.
 */
export function CustomerLists({ id, size = "md", markCurrent = true }: {
  id: number | string;
  size?: "sm" | "md";
  /** False inside a dialog: the page under it is not this customer's list, so every one is a link. */
  markCurrent?: boolean;
}) {
  const pathname = usePathname();
  const pill = `inline-flex items-center gap-2 whitespace-nowrap rounded-full font-medium no-underline transition ${size === "sm" ? "px-3 py-1 text-xs" : "px-3.5 py-1.5 text-sm"}`;
  return (
    <div className="flex flex-wrap gap-2">
      {CUSTOMER_LISTS.map(({ path, label, icon }) =>
        markCurrent && pathname === path ? (
          <span key={path} aria-current="page" className={`${pill} cursor-default bg-(--brand) text-white`}>
            <i className={`${icon} text-xs`} aria-hidden />{label}
          </span>
        ) : (
          <Link key={path} href={`${path}?customer=${id}`} className={`${pill} bg-(--brand-light) text-(--brand-ink) hover:brightness-95`}>
            <i className={`${icon} text-xs`} aria-hidden />{label}
          </Link>
        ),
      )}
    </div>
  );
}

/**
 * What a list is narrowed to, at its top (NICE's CustomerVisitDetailsBar): the customer as a chip with an eye for
 * their details, their other lists a click away, and an x that shows everyone again.
 */
export function CustomerContextBar({ onClear }: { onClear: () => void }) {
  const id = useSearchParams().get("customer");
  const q = useQuery({ queryKey: ["users", "one", id], queryFn: () => adminApi.user(Number(id)), enabled: !!id, meta: { skipGlobalError: true } });
  if (!id) return null;
  const c = q.data;
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-(--border-color) bg-(--bg-card) p-2.5 shadow-(--shadow-sm) xl:flex-row xl:items-center xl:justify-between">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        {q.isPending ? (
          <span className="h-9 w-56 animate-pulse rounded-xl bg-(--border-color)" />
        ) : (
          <ContextChip kind="Customer" type="user" id={id} name={c?.name ?? `#${id}`} details={c ? [c.phone, c.email].filter(Boolean).join(" · ") : undefined} />
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <CustomerLists id={id} size="sm" />
        <Button label="Everyone" icon="pi pi-times" text size="small" onClick={onClear} title="Show every customer again" />
      </div>
    </div>
  );
}
