"use client";

import PrimeReactDataTable, { viewAction } from "@/components/dashboard/tables/PrimeReactDataTable";
import FiltersButton, { filterValuesFrom, type FilterGroup } from "@/components/dashboard/filters/FiltersButton";
import { PageHeader } from "@/components/dashboard/ui";
import { PaymentDetailsDialog } from "@/components/dashboard/records/PaymentDetailsDialog";
import { CustomerContextBar } from "@/components/dashboard/records/shared";
import { PeekLink } from "@/components/dashboard/records/peek";
import { useOptions } from "./RecordForm";
import { ORDER_FILTER_KEYS, OrderFiltersBar, PRODUCT_LABEL_KEY } from "./orderFilters";
import { useAdminList } from "./useAdminList";
import { ListSearch, methodLabel } from "./parts";
import type { Payment } from "@/services/types/pesa";
import { asDate, type ExportColumn } from "@/lib/exportRows";
import { dateTime, ugx } from "@/lib/format";

/**
 * Money received, read only: order payments or package payments. A payment is recorded on its order or package.
 * The eye opens the payment itself; its order (or package) and customer open over it, so nothing jumps to another
 * page (the user, 14 Nov 2026).
 */
export default function PaymentsList({ kind }: { kind: "payments" | "package-payments" }) {
  const options = useOptions();
  const forOrders = kind === "payments";
  // The order filters come from the dashboard's arrows (its product and status filters), so its figure and this
  // list count the same payments.
  const list = useAdminList<Payment>({ path: kind, filterKeys: ["payment_method", "customer", "from", "to", ...(forOrders ? ORDER_FILTER_KEYS : [])] });

  const filterGroups: FilterGroup[] = [
    { title: "Payment", fields: [{ type: "select", key: "payment_method", label: "Method", options: (options.data?.payment_methods ?? []).map((m) => ({ label: methodLabel(m), value: m })), placeholder: "Any method" }] },
    { title: "When", fields: [{ type: "dateRange", from: "from", to: "to", label: "Received", days: true }] },
  ];

  const ref = (p: Payment) => (forOrders ? (p.order ? `#${p.order.order_number}` : "-") : (p.package?.name ?? "-"));

  const columns = [
    { field: "created_at", header: "Received", sortable: true, body: (p: Payment) => <span className="whitespace-nowrap text-sm">{dateTime(p.created_at)}</span> },
    { field: "amount", header: "Amount", sortable: true, body: (p: Payment) => <b className="whitespace-nowrap">{ugx(Number(p.amount))}</b> },
    { field: "payment_method", header: "Method", sortable: true, body: (p: Payment) => methodLabel(p.payment_method), exportValue: (p: Payment) => methodLabel(p.payment_method) },
    { field: "transaction_number", mobile: false, header: "Transaction", body: (p: Payment) => <span className="font-mono text-xs">{p.transaction_number || "-"}</span> },
    { field: "reference", header: forOrders ? "Order" : "Package", body: (p: Payment) => (forOrders
      ? <PeekLink type="order" id={p.order_id} className="font-mono">{ref(p)}</PeekLink>
      : <PeekLink type="package" id={p.package_id}>{ref(p)}</PeekLink>), exportValue: ref },
    { field: "customer", mobile: false, header: "Customer", body: (p: Payment) => <span className="text-sm">{p.customer ? <PeekLink type="user" id={p.customer.id}>{p.customer.name}</PeekLink> : "-"}<br /><span className="text-xs text-(--text-muted)">{p.customer?.phone ?? ""}</span></span>, exportValue: (p: Payment) => p.customer?.name ?? "" },
    { field: "recorded_by", mobile: false, header: "Recorded by", body: (p: Payment) => p.created_by?.name ?? "-", exportValue: (p: Payment) => p.created_by?.name ?? "" },
    { field: "details", mobile: false, header: "Note", visible: false, body: (p: Payment) => p.details ?? "-" },
  ];

  const exportColumns: ExportColumn<Payment>[] = [
    { header: "Received", value: (p) => asDate(p.created_at) },
    { header: "Amount (UGX)", value: (p) => Number(p.amount) },
    { header: "Method", value: (p) => methodLabel(p.payment_method) },
    { header: "Transaction", value: (p) => p.transaction_number ?? "" },
    { header: forOrders ? "Order" : "Package", value: ref },
    { header: "Customer", value: (p) => p.customer?.name ?? "" },
    { header: "Phone", value: (p) => p.customer?.phone ?? "" },
    { header: "Recorded by", value: (p) => p.created_by?.name ?? "" },
    { header: "Note", value: (p) => p.details ?? "" },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title={forOrders ? "Order payments" : "Package payments"}
        subtitle={`Money received for ${forOrders ? "orders" : "package deliveries"}. To add one, open its ${forOrders ? "order" : "package"} and press Record payment.`}
      />
      <CustomerContextBar onClear={() => list.setFilters({ customer: "" })} />
      {forOrders && <OrderFiltersBar get={list.getParam} onClear={() => list.setFilters(Object.fromEntries([...ORDER_FILTER_KEYS, PRODUCT_LABEL_KEY].map((k) => [k, ""])))} />}
      <PrimeReactDataTable<Payment>
        data={list.rows}
        columns={columns}
        {...list.table}
        emptyMessage="No payments match."
        fileName={`Elevate Pesa ${forOrders ? "order" : "package"} payments`}
        exportAll={{ fetchPage: list.fetchPage, columns: exportColumns }}
        headerContent={
          <div className="flex flex-wrap items-center gap-2">
            <ListSearch value={list.search} onSearch={(v) => list.setFilters({ search: v })} placeholder={forOrders ? "Transaction, order, customer" : "Transaction, package, customer"} />
            <FiltersButton groups={filterGroups} values={filterValuesFrom(filterGroups, list.getParam)} onApply={list.setFilters} />
          </div>
        }
        rowActions={[viewAction<Payment>((p) => list.openView(p.id))]}
      />

      <PaymentDetailsDialog kind={forOrders ? "payment" : "package-payment"} id={list.viewId} visible={!!list.viewId} onHide={list.closeView} />
    </div>
  );
}
