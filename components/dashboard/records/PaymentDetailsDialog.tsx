"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "primereact/button";
import { RecordDetailsDialog } from "@/components/dashboard/audit";
import { methodLabel, VIEW_META, viewError } from "@/components/dashboard/admin/parts";
import { adminApi } from "@/services/admin";
import { dateTime, ugx } from "@/lib/format";
import type { Payment } from "@/services/types/pesa";
import { PeekLink, usePeek } from "./peek";
import { DetailsFooter, StatTile, n } from "./shared";

/**
 * One payment: how much, how, its transaction number, who recorded it, and what it paid for. The order (or package)
 * and the customer open over it; nothing jumps to another page (the user, 14 Nov 2026).
 */
export function PaymentDetailsDialog({ kind, id, visible, onHide, actions }: {
  kind: "payment" | "package-payment";
  id: number | string | null | undefined;
  visible: boolean;
  onHide: () => void;
  actions?: (payment: Payment) => React.ReactNode;
}) {
  const forOrder = kind === "payment";
  const q = useQuery({
    queryKey: [forOrder ? "payments" : "package-payments", "one", String(id)],
    queryFn: () => (forOrder ? adminApi.payment(Number(id)) : adminApi.packagePayment(Number(id))),
    enabled: visible && !!id,
    meta: VIEW_META,
  });
  const p = q.data ?? null;
  const { open } = usePeek();
  const parent = forOrder ? p?.order : p?.package;

  return (
    <RecordDetailsDialog
      history={p ? { type: forOrder ? "Payment" : "PackagePayment", id: p.id } : undefined}
      header={p ? `${ugx(n(p.amount))} ${forOrder ? "order" : "package"} payment` : "Payment"}
      visible={visible}
      onHide={onHide}
      record={p}
      width="min(40rem, 95vw)"
      loading={q.isPending}
      error={viewError(q, "payment")}
      top={p && parent && (
        <div className="rounded-xl border border-(--border-color) p-3">
          <p className="m-0 mb-2 text-xs font-semibold uppercase tracking-wide text-(--text-muted)">Paid for</p>
          <p className="m-0 mb-3 text-sm">
            {forOrder ? (
              <PeekLink type="order" id={parent.id}>Order #{p.order?.order_number}</PeekLink>
            ) : (
              <PeekLink type="package" id={parent.id}>{p.package?.name}</PeekLink>
            )}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <StatTile label={forOrder ? "Order charged" : "Package charged"} value={ugx(n(parent.charged_amount))} />
            <StatTile label="Still owed now" value={ugx(n(parent.balance_due))} tone={n(parent.balance_due) > 0 ? "red" : undefined} />
          </div>
        </div>
      )}
      fields={p ? [
        { label: "Amount", value: <b>{ugx(n(p.amount))}</b> },
        { label: "Method", value: methodLabel(p.payment_method) },
        { label: "Transaction no.", value: p.transaction_number ? <span className="font-mono">{p.transaction_number}</span> : "-" },
        { label: "Received", value: dateTime(p.created_at) },
        {
          label: "Customer",
          value: p.customer ? (
            <span>
              <PeekLink type="user" id={p.customer.id}>{p.customer.name}</PeekLink>
              {p.customer.phone && <span className="block text-xs text-(--text-muted)">{p.customer.phone}</span>}
            </span>
          ) : "-",
        },
        { label: "Note", value: p.details || "-", wide: true },
      ] : []}
      footer={
        <DetailsFooter onHide={onHide}>
          {parent && (
            <Button label={forOrder ? "View the order" : "View the package"} icon="pi pi-eye" outlined onClick={() => open(forOrder ? "order" : "package", parent.id)} />
          )}
          {p && actions?.(p)}
        </DetailsFooter>
      }
    />
  );
}
