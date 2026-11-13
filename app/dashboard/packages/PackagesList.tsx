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
import { ListSearch, Pill, Thumb, choices, methodLabel } from "@/components/dashboard/admin/parts";
import { adminApi } from "@/services/admin";
import type { Package } from "@/services/types/pesa";
import { asDate, type ExportColumn } from "@/lib/exportRows";
import { dateTime, ugx } from "@/lib/format";

const n = (v: unknown) => Number(v ?? 0);
type Row = Package & Record<string, unknown>;

/**
 * Package deliveries customers book in the app (pickup to destination). Staff set the price,
 * follow the delivery and record payments.
 */
export default function PackagesList() {
  const options = useOptions();
  const queryClient = useQueryClient();
  const list = useAdminList<Package>({ path: "packages", filterKeys: ["status", "payment_status", "delivery_status", "customer", "from", "to"] });
  const [editing, setEditing] = useState<Package | null>(null);
  const [paying, setPaying] = useState<Package | null>(null);

  const viewing = useQuery({ queryKey: ["packages", "one", list.viewId], queryFn: () => adminApi.package(Number(list.viewId)), enabled: !!list.viewId });
  const shown = viewing.data ?? null;

  const refreshAll = () => {
    list.invalidate();
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    queryClient.invalidateQueries({ queryKey: ["package-payments"] });
  };

  const filterGroups: FilterGroup[] = [
    { title: "Where it stands", fields: [
      { type: "select", key: "status", label: "Status", options: choices(options.data?.package_statuses ?? []), placeholder: "Any status" },
      { type: "select", key: "delivery_status", label: "Delivery", options: choices(options.data?.package_delivery_statuses ?? []), placeholder: "Any delivery" },
      { type: "select", key: "payment_status", label: "Payment", options: choices(options.data?.package_payment_statuses ?? []), placeholder: "Any payment" },
    ] },
    { title: "When", fields: [{ type: "dateRange", from: "from", to: "to", label: "Booked", days: true }] },
  ];

  const columns = [
    {
      field: "name",
      header: "Package",
      sortable: true,
      body: (p: Package) => (
        <div className="flex items-center gap-3">
          <Thumb src={p.photo_url} name={p.name} />
          <div>
            <p className="font-medium text-(--text-primary)">{p.name}</p>
            <p className="whitespace-nowrap text-xs text-(--text-muted)">{[p.created_by?.name, p.created_by?.phone].filter(Boolean).join(" · ")}</p>
          </div>
        </div>
      ),
    },
    { field: "route", header: "From → to", body: (p: Package) => <span className="text-sm">{p.pickup ?? "?"} → {p.destination ?? "?"}</span>, exportValue: (p: Package) => `${p.pickup ?? ""} to ${p.destination ?? ""}` },
    { field: "created_at", header: "Booked", sortable: true, body: (p: Package) => <span className="whitespace-nowrap text-sm">{dateTime(p.created_at)}</span> },
    { field: "charged_amount", header: "Charged", sortable: true, body: (p: Package) => <span className="whitespace-nowrap">{ugx(n(p.charged_amount))}</span> },
    { field: "balance_due", header: "Balance", sortable: true, body: (p: Package) => <span className={`whitespace-nowrap font-semibold ${n(p.balance_due) > 0 ? "text-red-600 dark:text-red-400" : "text-(--text-muted)"}`}>{ugx(n(p.balance_due))}</span> },
    { field: "status", header: "Status", sortable: true, body: (p: Package) => <Pill value={p.status} /> },
    { field: "delivery_status", header: "Delivery", body: (p: Package) => <Pill value={p.delivery_status} /> },
    { field: "payment_status", header: "Payment", body: (p: Package) => <Pill value={p.payment_status} /> },
    { field: "package_number", header: "Number", sortable: true, visible: false },
    ...auditColumns<Package>({ people: false }),
  ];

  const exportColumns: ExportColumn<Package>[] = [
    { header: "Package", value: (p) => p.name },
    { header: "Number", value: (p) => p.package_number ?? "" },
    { header: "Customer", value: (p) => p.created_by?.name ?? "" },
    { header: "Phone", value: (p) => p.created_by?.phone ?? "" },
    { header: "Pickup", value: (p) => p.pickup ?? "" },
    { header: "Destination", value: (p) => p.destination ?? "" },
    { header: "Booked", value: (p) => asDate(p.created_at) },
    { header: "Charged (UGX)", value: (p) => n(p.charged_amount) },
    { header: "Paid (UGX)", value: (p) => n(p.amount_paid) },
    { header: "Balance (UGX)", value: (p) => n(p.balance_due) },
    { header: "Status", value: (p) => p.status },
    { header: "Delivery", value: (p) => p.delivery_status ?? "" },
    { header: "Payment", value: (p) => p.payment_status ?? "" },
    ...auditExportColumns<Package>({ people: false }),
  ];

  return (
    <div className="space-y-5">
      <PageHeader title="Packages" subtitle="Deliveries customers book in the app. Set the price, follow the delivery, record payments." />
      <PrimeReactDataTable<Package>
        data={list.rows}
        columns={columns}
        {...list.table}
        emptyMessage="No packages match."
        fileName="Elevate Pesa packages"
        exportAll={{ fetchPage: list.fetchPage, columns: exportColumns }}
        headerContent={
          <div className="flex flex-wrap items-center gap-2">
            <ListSearch value={list.search} onSearch={(v) => list.setFilters({ search: v })} placeholder="Package, place, customer, phone" />
            <FiltersButton groups={filterGroups} values={filterValuesFrom(filterGroups, list.getParam)} onApply={list.setFilters} />
          </div>
        }
        rowActions={[viewAction<Package>((p) => list.openView(p.id)), editAction<Package>((p) => setEditing(p))]}
        selection={{ selected: list.selected, onChange: list.setSelected }}
        toolbarActions={[deleteSelectedAction<Package>(() => list.confirmDelete("package", "Packages with payments are kept: cancel those instead."))]}
      />

      <RecordDetailsDialog
        header={shown?.name ?? "Package"}
        visible={!!list.viewId}
        onHide={list.closeView}
        record={shown}
        people={false}
        width="min(44rem, 95vw)"
        loading={viewing.isPending}
        error={viewing.isError ? "This package could not be loaded. It may have been deleted." : undefined}
        links={shown?.photo_url ? <Thumb src={shown.photo_url} name={shown.name} size="h-40 w-40" /> : undefined}
        fields={shown ? [
          { label: "Customer", value: shown.created_by ? `${shown.created_by.name}${shown.created_by.phone ? ` · ${shown.created_by.phone}` : ""}` : "-" },
          { label: "Booked", value: dateTime(shown.created_at) },
          { label: "Pickup", value: shown.pickup ?? "-" },
          { label: "Destination", value: shown.destination ?? "-" },
          { label: "Status", value: <Pill value={shown.status} /> },
          { label: "Delivery", value: <Pill value={shown.delivery_status} /> },
          { label: "Charged", value: ugx(n(shown.charged_amount)) },
          { label: "Paid", value: ugx(n(shown.amount_paid)) },
          { label: "Balance due", value: <b>{ugx(n(shown.balance_due))}</b> },
          { label: "Payment", value: <Pill value={shown.payment_status} /> },
          { label: "Notes from the customer", value: shown.extraInfo || "-", wide: true },
        ] : []}
        footer={
          <div className="flex flex-wrap justify-end gap-2">
            <Button label="Close" text onClick={list.closeView} />
            {shown && <Button label="Edit" icon="pi pi-pencil" outlined onClick={() => setEditing(shown)} />}
            {shown && n(shown.balance_due) > 0 && shown.status !== "cancelled" && <Button label="Record payment" icon="pi pi-wallet" onClick={() => setPaying(shown)} />}
          </div>
        }
      >
        {shown && (
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
            ) : <p className="m-0 text-sm text-(--text-muted)">No payments yet.</p>}
          </section>
        )}
      </RecordDetailsDialog>

      <RecordForm<Row>
        visible={!!editing}
        onHide={() => setEditing(null)}
        record={editing as Row | null}
        title={editing ? `package "${editing.name}"` : "package"}
        sections={[
          { title: "The package", fields: [
            { name: "name", label: "Name", type: "text", required: true },
            { name: "pickup", label: "Pickup", type: "text" },
            { name: "destination", label: "Destination", type: "text" },
            { name: "extraInfo", label: "Notes", type: "textarea" },
          ] },
          { title: "Price", hint: "The balance follows the price.", fields: [{ name: "charged_amount", label: "Charged", type: "money", required: true }] },
          { title: "Where it stands", hint: "Changing the delivery sends the customer a message.", fields: [
            { name: "status", label: "Status", type: "status", values: options.data?.package_statuses ?? [], required: true },
            { name: "delivery_status", label: "Delivery", type: "status", values: options.data?.package_delivery_statuses ?? [], required: true },
            { name: "payment_status", label: "Payment", type: "status", values: options.data?.package_payment_statuses ?? [], required: true },
          ] },
        ]}
        photo={{}}
        save={(body, id) => adminApi.updatePackage(id!, body) as Promise<{ message: string; data: Row }>}
        invalidate={["packages", "dashboard"]}
        what="this package"
        onSaved={refreshAll}
      />

      {paying && (
        <PaymentDialog
          visible={!!paying}
          onHide={() => setPaying(null)}
          balance={n(paying.balance_due)}
          reference={`package "${paying.name}"`}
          submit={(body) => adminApi.recordPackagePayment(paying.id, body)}
          onSaved={refreshAll}
        />
      )}
    </div>
  );
}
