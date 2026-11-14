"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { confirmAction } from "@/components/dashboard/ConfirmAction";
import type { PaymentActions } from "@/components/dashboard/records/shared";
import { useAuth } from "@/contexts/AuthContext";
import { usePrimeReactToast } from "@/contexts/PrimeReactToastContext";
import axiosAPI from "@/services/axiosApi";
import { adminApi } from "@/services/admin";
import type { Order, Package, Payment } from "@/services/types/pesa";
import { ugx } from "@/lib/format";
import PaymentDialog from "./PaymentDialog";

type Owner = Order | Package;

/**
 * The money on an order or a package, the same on both pages: record a payment or the next instalment (a row's
 * wallet, or the details' Payments section), correct one, and delete one (Admins; the API refuses Editors too).
 * Render `dialog` once on the page.
 */
export function usePaymentFlows(kind: "order" | "package", onSaved: () => void) {
  const toast = usePrimeReactToast();
  const queryClient = useQueryClient();
  const { role } = useAuth();
  const [open, setOpen] = useState<{ owner: Owner; payment: Payment | null } | null>(null);
  const base = kind === "order" ? "payments" : "package-payments";

  const refresh = () => {
    [kind === "order" ? "orders" : "packages", base, "dashboard"].forEach((k) => queryClient.invalidateQueries({ queryKey: [k] }));
    onSaved();
  };
  const reference = (o: Owner) => (kind === "order" ? `order #${(o as Order).order_number}` : `package "${(o as Package).name}"`);

  const remove = (owner: Owner, p: Payment) => confirmAction({
    header: `Delete this payment of ${ugx(Number(p.amount))}?`,
    message: `It comes off ${reference(owner)} and the balance grows back by the same amount. The audit trail keeps a record of it.`,
    danger: true,
    acceptLabel: "Delete",
    accept: async () => {
      const r = await axiosAPI.post<{ message: string }>(`/admin/${base}/${p.id}/delete`);
      toast.success(r.data.message);
      refresh();
    },
  });

  const actionsFor = (owner: Owner): PaymentActions => ({
    onRecord: () => setOpen({ owner, payment: null }),
    onEdit: (payment) => setOpen({ owner, payment }),
    onDelete: role === "Admin" ? (p) => remove(owner, p) : undefined,
  });

  const dialog = open && (
    <PaymentDialog
      visible
      onHide={() => setOpen(null)}
      balance={Number(open.owner.balance_due ?? 0)}
      reference={reference(open.owner)}
      payment={open.payment}
      notBefore={open.owner.created_at ?? null}
      submit={(body) => open.payment
        ? axiosAPI.post<{ message: string }>(`/admin/${base}/${open.payment.id}`, body).then((r) => r.data)
        : kind === "order" ? adminApi.recordOrderPayment(open.owner.id, body) : adminApi.recordPackagePayment(open.owner.id, body)}
      onSaved={refresh}
    />
  );

  return { record: (owner: Owner) => setOpen({ owner, payment: null }), actionsFor, dialog };
}
