"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { RecordDetailsDialog } from "@/components/dashboard/audit";
import { Pill, Thumb, VIEW_META, viewError } from "@/components/dashboard/admin/parts";
import { adminApi } from "@/services/admin";
import { dateTime, ugx } from "@/lib/format";
import type { Package } from "@/services/types/pesa";
import { PeekLink } from "./peek";
import { DetailsFooter, PaymentsSection, StatTile, n } from "./shared";

/** One package delivery: the customer, the route, where it stands, its payments. */
export function PackageDetailsDialog({ id, visible, onHide, actions }: {
  id: number | string | null | undefined;
  visible: boolean;
  onHide: () => void;
  actions?: (pkg: Package) => React.ReactNode;
}) {
  const q = useQuery({ queryKey: ["packages", "one", String(id)], queryFn: () => adminApi.package(Number(id)), enabled: visible && !!id, meta: VIEW_META });
  const p = q.data ?? null;
  const owes = p ? n(p.balance_due) > 0 && p.status !== "cancelled" : false;

  return (
    <RecordDetailsDialog
      history={p ? { type: "Package", id: p.id } : undefined}
      header={p?.name ?? "Package"}
      visible={visible}
      onHide={onHide}
      record={p}
      people={false}
      width="min(48rem, 95vw)"
      loading={q.isPending}
      error={viewError(q, "package")}
      top={p && (
        <div className="grid grid-cols-3 gap-2">
          <StatTile label="Charged" value={ugx(n(p.charged_amount))} />
          <StatTile label="Paid" value={ugx(n(p.amount_paid))} />
          <StatTile label="Balance due" value={ugx(n(p.balance_due))} tone={owes ? "red" : undefined} />
        </div>
      )}
      photo={p?.photo_url ? <Thumb src={p.photo_url} name={p.name} size="h-32 w-32" /> : undefined}
      fields={p ? [
        {
          label: "Customer",
          value: p.created_by ? (
            <span>
              <PeekLink type="user" id={p.created_by.id}>{p.created_by.name}</PeekLink>
              {p.created_by.phone && <span className="block text-xs text-(--text-muted)">{p.created_by.phone}</span>}
            </span>
          ) : "-",
        },
        { label: "Booked", value: dateTime(p.created_at) },
        ...(p.entered_by ? [{ label: "Entered by", value: `${p.entered_by.name}, from the dashboard` }] : []),
        { label: "Pickup", value: p.pickup ?? "-" },
        { label: "Destination", value: p.destination ?? "-" },
        { label: "Status", value: <Pill value={p.status} /> },
        { label: "Delivery", value: <Pill value={p.delivery_status} /> },
        { label: "Payment", value: <Pill value={p.payment_status} /> },
        ...(p.package_number ? [{ label: "Number", value: <span className="font-mono">{p.package_number}</span> }] : []),
        { label: "Notes from the customer", value: p.extraInfo || "-", wide: true },
      ] : []}
      footer={<DetailsFooter onHide={onHide}>{p && actions?.(p)}</DetailsFooter>}
    >
      {p && <PaymentsSection payments={p.payments} kind="package-payment" />}
    </RecordDetailsDialog>
  );
}
