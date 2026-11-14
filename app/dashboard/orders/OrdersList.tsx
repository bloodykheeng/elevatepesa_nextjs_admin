"use client";

import { useState } from "react";
import { Button } from "primereact/button";
import { useQueryClient } from "@tanstack/react-query";
import PrimeReactDataTable, { createAction, deleteSelectedAction, editAction, viewAction } from "@/components/dashboard/tables/PrimeReactDataTable";
import FiltersButton, { filterValuesFrom, type FilterGroup } from "@/components/dashboard/filters/FiltersButton";
import { auditColumns, auditExportColumns } from "@/components/dashboard/audit";
import { OrderDetailsDialog } from "@/components/dashboard/records/OrderDetailsDialog";
import { CustomerContextBar } from "@/components/dashboard/records/shared";
import { PeekLink } from "@/components/dashboard/records/peek";
import { PageHeader } from "@/components/dashboard/ui";
import RecordForm, { useOptions } from "@/components/dashboard/admin/RecordForm";
import PaymentDialog from "@/components/dashboard/admin/PaymentDialog";
import NewOrderDialog from "@/components/dashboard/admin/NewOrderDialog";
import { ORDER_ITEM_KEYS, useOrderItemGroup } from "@/components/dashboard/admin/orderFilters";
import { useAdminList } from "@/components/dashboard/admin/useAdminList";
import { ListSearch, Pill, choices, modeLabel } from "@/components/dashboard/admin/parts";
import { adminApi } from "@/services/admin";
import type { Order } from "@/services/types/pesa";
import { asDate, type ExportColumn } from "@/lib/exportRows";
import { dateTime, ugx } from "@/lib/format";

const n = (v: unknown) => Number(v ?? 0);
const FILTER_KEYS = ["status", "payment_status", "delivery_status", "payment_mode", "has_balance", "customer", "from", "to", ...ORDER_ITEM_KEYS];

/**
 * Orders customers placed in the app, and ones staff entered here (New: re-entering what the Hostinger loss took, or
 * an order taken over the phone): find one, follow its delivery, record what was paid.
 * Every filter is a chip; a customer picked from the dashboard shows as a line you can clear.
 */
export default function OrdersList() {
  const options = useOptions();
  const queryClient = useQueryClient();
  const list = useAdminList<Order>({ path: "orders", filterKeys: FILTER_KEYS });
  const [editing, setEditing] = useState<Order | null>(null);
  const [paying, setPaying] = useState<Order | null>(null);
  const [creating, setCreating] = useState(false);


  const itemGroup = useOrderItemGroup();
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
    itemGroup,
    { title: "When", fields: [{ type: "dateRange", from: "from", to: "to", label: "Placed", days: true }] },
  ];

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
          <p className="whitespace-nowrap text-xs text-(--text-muted)">
            {o.created_by ? <PeekLink type="user" id={o.created_by.id} className="font-normal">{o.created_by.name}</PeekLink> : null}
            {o.created_by?.phone ? ` · ${o.created_by.phone}` : ""}
          </p>
        </div>
      ),
    },
    { field: "created_at", header: "Placed", sortable: true, body: (o: Order) => <span className="whitespace-nowrap text-sm">{dateTime(o.created_at)}</span> },
    { field: "charged_amount", header: "Charged", sortable: true, body: (o: Order) => <span className="whitespace-nowrap">{ugx(n(o.charged_amount))}</span> },
    { field: "amount_paid", mobile: false, header: "Paid", sortable: true, body: (o: Order) => <span className="whitespace-nowrap">{ugx(n(o.amount_paid))}</span> },
    { field: "balance_due", header: "Balance", sortable: true, body: (o: Order) => <span className={`whitespace-nowrap font-semibold ${n(o.balance_due) > 0 && o.status !== "cancelled" ? "text-red-600 dark:text-red-400" : "text-(--text-muted)"}`}>{ugx(n(o.balance_due))}</span> },
    { field: "status", header: "Status", sortable: true, body: (o: Order) => <Pill value={o.status} /> },
    { field: "payment_status", mobile: false, header: "Payment", sortable: true, body: (o: Order) => <span className="flex flex-col items-start gap-0.5"><Pill value={o.payment_status} /><span className="whitespace-nowrap text-[11px] text-(--text-muted)">{modeLabel(o.payment_mode)}</span></span> },
    { field: "delivery_status", header: "Delivery", sortable: true, body: (o: Order) => <Pill value={o.delivery_status} /> },
    { field: "address", mobile: false, header: "Address", visible: false, body: (o: Order) => o.address ?? "-" },
    { field: "order_products_count", mobile: false, header: "Items", visible: false },
    { field: "entered_by", mobile: false, header: "Entered by", visible: false, body: (o: Order) => o.entered_by?.name ?? <span className="text-(--text-muted)">The app</span> },
    ...auditColumns<Order>({ people: false, created: false }),
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
    { header: "Entered by", value: (o) => o.entered_by?.name ?? "The app" },
    ...auditExportColumns<Order>({ people: false }),
  ];

  const canPay = (o: Order) => n(o.balance_due) > 0 && o.status !== "cancelled";

  return (
    <div className="space-y-5">
      <PageHeader title="Orders" subtitle="What customers ordered in the app, and orders staff entered. Open one to follow its delivery or record a payment." />

      <CustomerContextBar onClear={() => list.setFilters({ customer: "" })} />

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
        toolbarActions={[
          deleteSelectedAction<Order>(() => list.confirmDelete("order", "Orders with payments are kept: cancel those instead. Deleting removes the order and its items for good.")),
          createAction<Order>(() => setCreating(true)),
        ]}
      />

      <OrderDetailsDialog
        id={list.viewId}
        visible={!!list.viewId}
        onHide={list.closeView}
        actions={(o) => (
          <>
            <Button label="Edit" icon="pi pi-pencil" outlined onClick={() => setEditing(o)} />
            {canPay(o) && <Button label="Record payment" icon="pi pi-wallet" onClick={() => setPaying(o)} />}
          </>
        )}
      />

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

      <NewOrderDialog visible={creating} onHide={() => setCreating(false)} onSaved={(o) => { refreshAll(); list.openView(o.id); }} />

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
