"use client";

import { useState } from "react";
import { Button } from "primereact/button";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import PrimeReactDataTable, { deleteSelectedAction, editAction, viewAction } from "@/components/dashboard/tables/PrimeReactDataTable";
import FiltersButton, { filterValuesFrom, type FilterGroup } from "@/components/dashboard/filters/FiltersButton";
import { RecordDetailsDialog, auditColumns, auditExportColumns } from "@/components/dashboard/audit";
import { PageHeader } from "@/components/dashboard/ui";
import RecordForm, { useOptions } from "@/components/dashboard/admin/RecordForm";
import PaymentDialog from "@/components/dashboard/admin/PaymentDialog";
import { useAdminList } from "@/components/dashboard/admin/useAdminList";
import { ListSearch, Pill, Thumb, choices, methodLabel, modeLabel } from "@/components/dashboard/admin/parts";
import { adminApi } from "@/services/admin";
import type { Order } from "@/services/types/pesa";
import { asDate, type ExportColumn } from "@/lib/exportRows";
import { dateTime, ugx } from "@/lib/format";

const n = (v: unknown) => Number(v ?? 0);
const FILTER_KEYS = ["status", "payment_status", "delivery_status", "payment_mode", "has_balance", "customer", "from", "to"];

/**
 * Orders customers placed in the app: find one, follow its delivery, record what was paid.
 * Every filter is a chip; a customer picked from the dashboard shows as a line you can clear.
 */
export default function OrdersList() {
  const options = useOptions();
  const queryClient = useQueryClient();
  const list = useAdminList<Order>({ path: "orders", filterKeys: FILTER_KEYS });
  const [editing, setEditing] = useState<Order | null>(null);
  const [paying, setPaying] = useState<Order | null>(null);

  const viewing = useQuery({ queryKey: ["orders", "one", list.viewId], queryFn: () => adminApi.order(Number(list.viewId)), enabled: !!list.viewId });
  const shown = viewing.data ?? null;

  const filterGroups: FilterGroup[] = [
    { title: "Where it stands", fields: [
      { type: "select", key: "status", label: "Status", options: choices(options.data?.order_statuses ?? []), placeholder: "Any status" },
      { type: "select", key: "delivery_status", label: "Delivery", options: choices(options.data?.order_delivery_statuses ?? []), placeholder: "Any delivery" },
    ] },
    { title: "Money", fields: [
      { type: "select", key: "payment_status", label: "Payment", options: choices(options.data?.order_payment_statuses ?? []), placeholder: "Any payment" },
      { type: "select", key: "payment_mode", label: "Mode", options: choices(options.data?.payment_modes ?? [], modeLabel), placeholder: "Any mode" },
      { type: "select", key: "has_balance", label: "Balance", options: [{ label: "Still owes", value: "1" }, { label: "Nothing owed", value: "0" }], placeholder: "Any balance" },
    ] },
    { title: "When", fields: [{ type: "dateRange", from: "from", to: "to", label: "Placed", days: true }] },
  ];

  const customerId = list.getParam("customer");
  const customerName = customerId ? list.rows[0]?.created_by?.name : null;

  const refreshAll = () => {
    list.invalidate();
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    queryClient.invalidateQueries({ queryKey: ["payments"] });
  };

  const columns = [
    {
      field: "order_number",
      header: "Order",
      sortable: true,
      body: (o: Order) => (
        <div>
          <p className="font-mono text-sm font-semibold text-(--text-primary)">#{o.order_number}</p>
          <p className="whitespace-nowrap text-xs text-(--text-muted)">{[o.created_by?.name, o.created_by?.phone].filter(Boolean).join(" · ")}</p>
        </div>
      ),
    },
    { field: "created_at", header: "Placed", sortable: true, body: (o: Order) => <span className="whitespace-nowrap text-sm">{dateTime(o.created_at)}</span> },
    { field: "charged_amount", header: "Charged", sortable: true, body: (o: Order) => <span className="whitespace-nowrap">{ugx(n(o.charged_amount))}</span> },
    { field: "amount_paid", header: "Paid", sortable: true, body: (o: Order) => <span className="whitespace-nowrap">{ugx(n(o.amount_paid))}</span> },
    { field: "balance_due", header: "Balance", sortable: true, body: (o: Order) => <span className={`whitespace-nowrap font-semibold ${n(o.balance_due) > 0 && o.status !== "cancelled" ? "text-red-600 dark:text-red-400" : "text-(--text-muted)"}`}>{ugx(n(o.balance_due))}</span> },
    { field: "status", header: "Status", sortable: true, body: (o: Order) => <Pill value={o.status} /> },
    { field: "payment_status", header: "Payment", sortable: true, body: (o: Order) => <span className="flex flex-col items-start gap-0.5"><Pill value={o.payment_status} /><span className="whitespace-nowrap text-[11px] text-(--text-muted)">{modeLabel(o.payment_mode)}</span></span> },
    { field: "delivery_status", header: "Delivery", sortable: true, body: (o: Order) => <Pill value={o.delivery_status} /> },
    { field: "address", header: "Address", visible: false, body: (o: Order) => o.address ?? "-" },
    { field: "order_products_count", header: "Items", visible: false },
    ...auditColumns<Order>({ people: false }),
  ];

  const exportColumns: ExportColumn<Order>[] = [
    { header: "Order", value: (o) => o.order_number },
    { header: "Customer", value: (o) => o.created_by?.name ?? "" },
    { header: "Phone", value: (o) => o.created_by?.phone ?? "" },
    { header: "Placed", value: (o) => asDate(o.created_at) },
    { header: "Charged (UGX)", value: (o) => n(o.charged_amount) },
    { header: "Paid (UGX)", value: (o) => n(o.amount_paid) },
    { header: "Balance (UGX)", value: (o) => n(o.balance_due) },
    { header: "Mode", value: (o) => modeLabel(o.payment_mode) },
    { header: "Status", value: (o) => o.status },
    { header: "Payment", value: (o) => o.payment_status },
    { header: "Delivery", value: (o) => o.delivery_status },
    { header: "Address", value: (o) => o.address ?? "" },
    ...auditExportColumns<Order>({ people: false }),
  ];

  const canPay = (o: Order) => n(o.balance_due) > 0 && o.status !== "cancelled";

  return (
    <div className="space-y-5">
      <PageHeader title="Orders" subtitle="What customers ordered in the app. Open one to follow its delivery or record a payment." />

      {customerId && (
        <p className="-mt-2 flex items-center gap-2 text-sm text-(--text-secondary)">
          <i className="pi pi-user text-xs text-(--text-muted)" aria-hidden />
          Orders of {customerName ?? `customer #${customerId}`}
          <button type="button" onClick={() => list.setFilters({ customer: "" })} className="inline-flex items-center gap-1 text-xs font-medium text-(--brand-ink) underline">
            <i className="pi pi-times text-[0.6rem]" aria-hidden /> Show every customer
          </button>
        </p>
      )}

      <PrimeReactDataTable<Order>
        data={list.rows}
        columns={columns}
        {...list.table}
        emptyMessage="No orders match. Clear the search or filters."
        fileName="Elevate Pesa orders"
        exportAll={{ fetchPage: list.fetchPage, columns: exportColumns }}
        headerContent={
          <div className="flex flex-wrap items-center gap-2">
            <ListSearch value={list.search} onSearch={(v) => list.setFilters({ search: v })} placeholder="Order number, customer, phone" />
            <FiltersButton groups={filterGroups} values={filterValuesFrom(filterGroups, list.getParam)} onApply={list.setFilters} />
          </div>
        }
        rowActions={[viewAction<Order>((o) => list.openView(o.id)), editAction<Order>((o) => setEditing(o))]}
        selection={{ selected: list.selected, onChange: list.setSelected }}
        toolbarActions={[deleteSelectedAction<Order>(() => list.confirmDelete("order", "Orders with payments are kept: cancel those instead. Deleting removes the order and its items for good."))]}
      />

      <RecordDetailsDialog
        header={shown ? `Order #${shown.order_number}` : "Order"}
        visible={!!list.viewId}
        onHide={list.closeView}
        record={shown}
        people={false}
        width="min(48rem, 95vw)"
        loading={viewing.isPending}
        error={viewing.isError ? "This order could not be loaded. It may have been deleted." : undefined}
        fields={shown ? [
          { label: "Customer", value: shown.created_by ? <span>{shown.created_by.name}<br /><span className="text-xs text-(--text-muted)">{[shown.created_by.phone, shown.created_by.email].filter(Boolean).join(" · ")}</span></span> : "-" },
          { label: "Placed", value: dateTime(shown.created_at) },
          { label: "Status", value: <Pill value={shown.status} /> },
          { label: "Delivery", value: <Pill value={shown.delivery_status} /> },
          { label: "Payment", value: <span className="flex items-center gap-2"><Pill value={shown.payment_status} /> {modeLabel(shown.payment_mode)}</span> },
          { label: "Address", value: shown.address ?? "-" },
          { label: "Charged", value: ugx(n(shown.charged_amount)) },
          { label: "Paid", value: ugx(n(shown.amount_paid)) },
          { label: "Balance due", value: <b className={n(shown.balance_due) > 0 ? "text-red-600 dark:text-red-400" : ""}>{ugx(n(shown.balance_due))}</b> },
        ] : []}
        footer={
          <div className="flex flex-wrap justify-end gap-2">
            <Button label="Close" text onClick={list.closeView} />
            {shown && <Button label="Edit" icon="pi pi-pencil" outlined onClick={() => setEditing(shown)} />}
            {shown && canPay(shown) && <Button label="Record payment" icon="pi pi-wallet" onClick={() => setPaying(shown)} />}
          </div>
        }
      >
        {shown && (
          <div className="space-y-5">
            <section>
              <h3 className="m-0 mb-2 text-sm font-semibold text-(--text-primary)">Items</h3>
              <div className="overflow-x-auto rounded-xl border border-(--border-color)">
                <table className="w-full text-sm">
                  <thead className="bg-(--bg-page) text-left text-xs text-(--text-muted)">
                    <tr><th className="px-3 py-2">Product</th><th className="px-3 py-2 text-right">Price</th><th className="px-3 py-2 text-right">Qty</th><th className="px-3 py-2 text-right">Total</th></tr>
                  </thead>
                  <tbody>
                    {(shown.order_products ?? []).map((l) => (
                      <tr key={l.id} className="border-t border-(--border-color)">
                        <td className="px-3 py-2"><span className="flex items-center gap-2"><Thumb src={l.product?.photo_url} name={l.name} size="h-8 w-8" />{l.name}</span></td>
                        <td className="px-3 py-2 text-right whitespace-nowrap">{ugx(n(l.price))}</td>
                        <td className="px-3 py-2 text-right">{l.quantity}</td>
                        <td className="px-3 py-2 text-right whitespace-nowrap font-medium">{ugx(n(l.price) * l.quantity)}</td>
                      </tr>
                    ))}
                    {!shown.order_products?.length && <tr><td colSpan={4} className="px-3 py-4 text-center text-(--text-muted)">No items recorded.</td></tr>}
                  </tbody>
                </table>
              </div>
            </section>
            <section>
              <h3 className="m-0 mb-2 text-sm font-semibold text-(--text-primary)">Payments</h3>
              {shown.payments?.length ? (
                <ul className="divide-y divide-(--border-color) rounded-xl border border-(--border-color)">
                  {shown.payments.map((p) => (
                    <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
                      <span><b>{ugx(n(p.amount))}</b> · {methodLabel(p.payment_method)}{p.transaction_number ? ` · ${p.transaction_number}` : ""}</span>
                      <span className="text-xs text-(--text-muted)">{dateTime(p.created_at)}{p.created_by?.name ? ` by ${p.created_by.name}` : ""}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="m-0 text-sm text-(--text-muted)">No payments yet.</p>
              )}
            </section>
          </div>
        )}
      </RecordDetailsDialog>

      <RecordForm<Order & Record<string, unknown>>
        visible={!!editing}
        onHide={() => setEditing(null)}
        record={editing as (Order & Record<string, unknown>) | null}
        title={editing ? `order #${editing.order_number}` : "order"}
        sections={[
          { title: "Where it stands", hint: "Changing the delivery sends the customer a message on their phone.", fields: [
            { name: "status", label: "Status", type: "status", values: options.data?.order_statuses ?? [], required: true },
            { name: "delivery_status", label: "Delivery", type: "status", values: options.data?.order_delivery_statuses ?? [], required: true },
            { name: "payment_status", label: "Payment", type: "status", values: options.data?.order_payment_statuses ?? [], required: true, hint: "Recording payments sets this for you when the balance reaches zero." },
          ] },
          { title: "Delivery address", fields: [{ name: "address", label: "Address", type: "text" }] },
        ]}
        save={(body, id) => adminApi.updateOrder(id!, body) as Promise<{ message: string; data: Order & Record<string, unknown> }>}
        invalidate={["orders", "dashboard"]}
        what="this order"
        onSaved={refreshAll}
      />

      {paying && (
        <PaymentDialog
          visible={!!paying}
          onHide={() => setPaying(null)}
          balance={n(paying.balance_due)}
          reference={`order #${paying.order_number}`}
          submit={(body) => adminApi.recordOrderPayment(paying.id, body)}
          onSaved={refreshAll}
        />
      )}
    </div>
  );
}
