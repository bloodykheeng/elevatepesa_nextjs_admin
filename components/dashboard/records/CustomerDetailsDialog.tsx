"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { RecordDetailsDialog } from "@/components/dashboard/audit";
import { Pill, Thumb, VIEW_META, viewError } from "@/components/dashboard/admin/parts";
import { adminApi } from "@/services/admin";
import { dateTime, longDate, shortDate, ugx } from "@/lib/format";
import type { Account } from "@/services/types/pesa";
import { usePeek } from "./peek";
import { CustomerLists, DetailsFooter, StatTile, n } from "./shared";

/** A latest-records list whose rows open the record over the dialog. */
function Latest<T extends { id: number }>({ title, rows, render, onOpen }: { title: string; rows: T[]; render: (row: T) => React.ReactNode; onOpen: (row: T) => void }) {
  if (!rows.length) return null;
  return (
    <section>
      <h3 className="m-0 mb-2 text-sm font-semibold text-(--text-primary)">{title}</h3>
      <ul className="divide-y divide-(--border-color) overflow-hidden rounded-xl border border-(--border-color)">
        {rows.map((row) => (
          <li key={row.id}>
            <button type="button" onClick={() => onOpen(row)} className="grid w-full cursor-pointer grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1 border-0 bg-transparent px-3 py-2.5 text-left text-sm hover:bg-(--bg-page) sm:grid-cols-[1.2fr_1fr_1fr_auto_auto]">
              {render(row)}
              {/* On a wrapper: PrimeIcons' own display rule beats `hidden` on the icon. */}
              <span className="hidden sm:block" aria-hidden><i className="pi pi-angle-right text-xs text-(--text-muted)" /></span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * One account. A customer's opens with what matters about them in one band: who they are, how to reach them, what
 * they ordered and still owe; then their latest orders and packages (each opens over it) and their lists.
 */
export function CustomerDetailsDialog({ id, visible, onHide, actions }: {
  id: number | string | null | undefined;
  visible: boolean;
  onHide: () => void;
  actions?: (account: Account) => React.ReactNode;
}) {
  const q = useQuery({ queryKey: ["users", "one", String(id)], queryFn: () => adminApi.user(Number(id)), enabled: visible && !!id, meta: VIEW_META });
  const u = q.data ?? null;
  const { open } = usePeek();
  const customer = u?.role === "Customer";

  return (
    <RecordDetailsDialog
      history={u ? { type: "User", id: u.id } : undefined}
      header={u?.name ?? "Account"}
      visible={visible}
      onHide={onHide}
      record={u}
      people={false}
      width="min(48rem, 95vw)"
      loading={q.isPending}
      error={viewError(q, "account")}
      top={u && (
        // Two rows, not one band: who they are and how to reach them, then what they ordered and owe, each with room
        // (the one-band version squeezed three pills, two contact lines and three figures together, the user, 14/11/2026).
        <div className="space-y-3">
          <div className="flex items-center gap-5 rounded-xl border border-(--border-color) p-5">
            <Thumb src={u.photo_url} name={u.name} size="h-14 w-14" round />
            <div className="min-w-0 flex-1 space-y-3">
              <p className="m-0 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-(--text-secondary)">
                <span className="font-medium text-(--text-primary)">{u.role ?? "No role"}</span>
                <Pill value={u.status} />
                {u.has_device && (
                  <span className="inline-flex items-center gap-1" title="Has the app on a phone: can get push messages"><i className="pi pi-mobile text-xs" aria-hidden />Has the app</span>
                )}
              </p>
              <div className="flex flex-col gap-2 text-sm sm:flex-row sm:flex-wrap sm:gap-x-8">
                <a href={`mailto:${u.email}`} className="inline-flex min-w-0 items-center gap-2 text-(--text-secondary) no-underline hover:underline">
                  <i className="pi pi-envelope text-xs text-(--text-muted)" aria-hidden /><span className="truncate">{u.email}</span>
                </a>
                {u.phone && (
                  <a href={`tel:${u.phone}`} className="inline-flex items-center gap-2 text-(--text-secondary) no-underline hover:underline">
                    <i className="pi pi-phone text-xs text-(--text-muted)" aria-hidden />{u.phone}
                  </a>
                )}
              </div>
            </div>
          </div>
          {u.totals && (
            <div className="grid grid-cols-3 gap-2">
              <StatTile label="Orders" value={(u.orders_count ?? 0).toLocaleString("en-UG")} />
              <StatTile label="Ordered" value={ugx(u.totals.orders_value)} />
              <StatTile label="Still owes" value={ugx(u.totals.balance_due)} tone={u.totals.balance_due > 0 ? "red" : undefined} />
            </div>
          )}
        </div>
      )}
      fields={u ? [
        { label: "Gender", value: u.gender ? u.gender.charAt(0).toUpperCase() + u.gender.slice(1) : "-" },
        { label: "Date of birth", value: u.date_of_birth ? longDate(u.date_of_birth) : "-" },
        { label: "NIN", value: u.nin ?? "-" },
        { label: "Last sign-in", value: u.lastlogin ? dateTime(u.lastlogin) : "Never" },
        ...(customer ? [
          { label: "Packages booked", value: (u.packages_count ?? 0).toLocaleString("en-UG") },
          { label: "Paid on orders", value: ugx(n(u.totals?.paid)) },
        ] : []),
      ] : []}
      footer={<DetailsFooter onHide={onHide}>{u && actions?.(u)}</DetailsFooter>}
    >
      {u && customer && (
        <div className="space-y-5">
          <Latest
            title={`Latest orders (${u.orders_count ?? 0})`}
            rows={u.orders ?? []}
            onOpen={(o) => open("order", o.id)}
            render={(o) => (
              <>
                <span className="font-mono font-semibold text-(--brand-ink)">#{o.order_number}</span>
                <span className="hidden text-xs text-(--text-muted) sm:block">{shortDate(o.created_at)}</span>
                <span className="hidden sm:block">{ugx(n(o.charged_amount))}</span>
                <span><Pill value={o.status} /></span>
              </>
            )}
          />
          <Latest
            title={`Latest packages (${u.packages_count ?? 0})`}
            rows={u.packages ?? []}
            onOpen={(p) => open("package", p.id)}
            render={(p) => (
              <>
                <span className="truncate font-semibold text-(--brand-ink)">{p.name}</span>
                <span className="hidden text-xs text-(--text-muted) sm:block">{shortDate(p.created_at)}</span>
                <span className="hidden sm:block">{ugx(n(p.charged_amount))}</span>
                <span><Pill value={p.status} /></span>
              </>
            )}
          />
          <section>
            <h3 className="m-0 mb-2 text-sm font-semibold text-(--text-primary)">Everything of theirs</h3>
            <CustomerLists id={u.id} markCurrent={false} />
          </section>
        </div>
      )}
    </RecordDetailsDialog>
  );
}
