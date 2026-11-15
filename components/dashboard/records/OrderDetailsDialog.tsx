"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { RecordDetailsDialog } from "@/components/dashboard/audit";
import { Pill, Thumb, modeLabel, VIEW_META, viewError } from "@/components/dashboard/admin/parts";
import { adminApi } from "@/services/admin";
import { dateTime, ugx } from "@/lib/format";
import type { Order } from "@/services/types/pesa";
import { PeekLink } from "./peek";
import { DetailsFooter, PaymentsSection, StatTile, n, placedBy, type PaymentActions } from "./shared";

/**
 * One order: who ordered, where it stands, its items and payments. The Orders page opens it with its own buttons
 * (Edit, Record payment); anywhere else it opens over what you are reading (RecordPeekHost).
 */
export function OrderDetailsDialog({ id, visible, onHide, actions, payments }: {
  id: number | string | null | undefined;
  visible: boolean;
  onHide: () => void;
  /** After Close in the footer. */
  actions?: (order: Order) => React.ReactNode;
  /** Record the next instalment, correct or delete one (the Orders page). */
  payments?: (order: Order) => PaymentActions;
}) {
  const q = useQuery({ queryKey: ["orders", "one", String(id)], queryFn: () => adminApi.order(Number(id)), enabled: visible && !!id, meta: VIEW_META });
  const o = q.data ?? null;
  const owes = o ? n(o.balance_due) > 0 && o.status !== "cancelled" : false;

  return (
    <RecordDetailsDialog
      history={o ? { type: "Order", id: o.id } : undefined}
      header={o ? `Order #${o.order_number}` : "Order"}
      visible={visible}
      onHide={onHide}
      record={o}
      creator={o ? placedBy(o, "Placed by") : undefined}
      width="min(48rem, 95vw)"
      loading={q.isPending}
      error={viewError(q, "order")}
      top={o && (
        <div className="grid grid-cols-3 gap-2">
          <StatTile label="Charged" value={ugx(n(o.charged_amount))} />
          <StatTile label="Paid" value={ugx(n(o.amount_paid))} />
          <StatTile label="Balance due" value={ugx(n(o.balance_due))} tone={owes ? "red" : undefined} />
        </div>
      )}
      fields={o ? [
        {
          label: "Customer",
          value: o.created_by ? (
            <span>
              <PeekLink type="user" id={o.created_by.id}>{o.created_by.name}</PeekLink>
              <span className="block text-xs text-(--text-muted)">{[o.created_by.phone, o.created_by.email].filter(Boolean).join(" · ")}</span>
            </span>
          ) : "-",
        },
        { label: "Placed", value: dateTime(o.created_at) },
        { label: "Status", value: <Pill value={o.status} /> },
        { label: "Delivery", value: <Pill value={o.delivery_status} /> },
        { label: "Payment", value: <span className="flex flex-wrap items-center gap-2"><Pill value={o.payment_status} /> {modeLabel(o.payment_mode)}</span> },
        { label: "Address", value: o.address ?? "-" },
      ] : []}
      footer={<DetailsFooter onHide={onHide}>{o && actions?.(o)}</DetailsFooter>}
    >
      {o && (
        <div className="space-y-5">
          <section>
            <h3 className="m-0 mb-2 text-sm font-semibold text-(--text-primary)">Items</h3>
            <div className="overflow-x-auto rounded-xl border border-(--border-color)">
              <table className="w-full text-sm">
                <thead className="bg-(--bg-page) text-left text-xs text-(--text-muted)">
                  <tr><th className="px-3 py-2">Product</th><th className="px-3 py-2 text-right">Price</th><th className="px-3 py-2 text-right">Qty</th><th className="px-3 py-2 text-right">Total</th></tr>
                </thead>
                <tbody>
                  {(o.order_products ?? []).map((l) => (
                    <tr key={l.id} className="border-t border-(--border-color)">
                      <td className="px-3 py-2"><span className="flex items-center gap-2"><Thumb src={l.product?.photo_url} name={l.name} size="h-8 w-8" />{l.name}</span></td>
                      <td className="whitespace-nowrap px-3 py-2 text-right">{ugx(n(l.price))}</td>
                      <td className="px-3 py-2 text-right">{l.quantity}</td>
                      <td className="whitespace-nowrap px-3 py-2 text-right font-medium">{ugx(n(l.price) * l.quantity)}</td>
                    </tr>
                  ))}
                  {!o.order_products?.length && <tr><td colSpan={4} className="px-3 py-4 text-center text-(--text-muted)">No items recorded.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>
          <PaymentsSection payments={o.payments} kind="payment" balance={o.status !== "cancelled" ? n(o.balance_due) : 0} actions={payments?.(o)} />
        </div>
      )}
    </RecordDetailsDialog>
  );
}
