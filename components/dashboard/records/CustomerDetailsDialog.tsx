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
          {/* Three equal columns like the figures under it (the user, 14/11/2026: all on the left looked squeezed):
              who they are, then how to reach them, each a small label over its value. */}
          <div className="grid gap-2 sm:grid-cols-3">
            <div className="flex min-w-0 items-center gap-3 rounded-xl bg-(--bg-page) px-3 py-2.5">
              <Thumb src={u.photo_url} name={u.name} size="h-11 w-11" round />
              <div className="min-w-0 space-y-1">
                <p className="m-0 flex flex-wrap items-center gap-2 text-sm font-semibold text-(--text-primary)">{u.role ?? "No role"} <Pill value={u.status} /></p>
                <p className="m-0 text-xs text-(--text-muted)">
                  {u.has_device
                    ? <span className="inline-flex items-center gap-1" title="Has the app on a phone: can get push messages"><i className="pi pi-mobile text-[11px]" aria-hidden />Has the app</span>
                    : "No app on a phone"}
                </p>
              </div>
            </div>
            <div className="min-w-0 rounded-xl bg-(--bg-page) px-3 py-2.5">
              <p className="m-0 text-[11px] font-medium text-(--text-muted)">Email</p>
              <a href={`mailto:${u.email}`} className="mt-0.5 flex min-w-0 items-center gap-2 text-sm font-semibold text-(--text-primary) no-underline hover:underline">
                <i className="pi pi-envelope text-xs text-(--text-muted)" aria-hidden /><span className="truncate" title={u.email}>{u.email}</span>
              </a>
            </div>
            <div className="min-w-0 rounded-xl bg-(--bg-page) px-3 py-2.5">
              <p className="m-0 text-[11px] font-medium text-(--text-muted)">Phone</p>
              {u.phone ? (
                <a href={`tel:${u.phone}`} className="mt-0.5 flex items-center gap-2 text-sm font-semibold text-(--text-primary) no-underline hover:underline">
                  <i className="pi pi-phone text-xs text-(--text-muted)" aria-hidden />{u.phone}
                </a>
              ) : <p className="m-0 mt-0.5 text-sm text-(--text-muted)">-</p>}
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
