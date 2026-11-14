"use client";

import { useState } from "react";
import { Button } from "primereact/button";
import { useQueryClient } from "@tanstack/react-query";
import PrimeReactDataTable, { deleteSelectedAction, editAction, viewAction } from "@/components/dashboard/tables/PrimeReactDataTable";
import FiltersButton, { filterValuesFrom, type FilterGroup } from "@/components/dashboard/filters/FiltersButton";
import { auditColumns, auditExportColumns } from "@/components/dashboard/audit";
import { PackageDetailsDialog } from "@/components/dashboard/records/PackageDetailsDialog";
import { CustomerContextBar } from "@/components/dashboard/records/shared";
import { PeekLink } from "@/components/dashboard/records/peek";
import { PageHeader } from "@/components/dashboard/ui";
import RecordForm, { useOptions } from "@/components/dashboard/admin/RecordForm";
import PaymentDialog from "@/components/dashboard/admin/PaymentDialog";
import { useAdminList } from "@/components/dashboard/admin/useAdminList";
import { ListSearch, Pill, Thumb, choices } from "@/components/dashboard/admin/parts";
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
  const list = useAdminList<Package>({ path: "packages", filterKeys: ["status", "payment_status", "delivery_status", "has_balance", "customer", "from", "to"] });
  const [editing, setEditing] = useState<Package | null>(null);
  const [paying, setPaying] = useState<Package | null>(null);


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
      { type: "select", key: "has_balance", label: "Balance", options: [{ label: "Still owes", value: "1" }, { label: "Nothing owed", value: "0" }], placeholder: "Any balance" },
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
            <p className="whitespace-nowrap text-xs text-(--text-muted)">
              {p.created_by ? <PeekLink type="user" id={p.created_by.id} className="font-normal">{p.created_by.name}</PeekLink> : null}
              {p.created_by?.phone ? ` · ${p.created_by.phone}` : ""}
            </p>
          </div>
        </div>
      ),
    },
    { field: "route", mobile: false, header: "From → to", body: (p: Package) => <span className="text-sm">{p.pickup ?? "?"} → {p.destination ?? "?"}</span>, exportValue: (p: Package) => `${p.pickup ?? ""} to ${p.destination ?? ""}` },
    { field: "created_at", header: "Booked", sortable: true, body: (p: Package) => <span className="whitespace-nowrap text-sm">{dateTime(p.created_at)}</span> },
    { field: "charged_amount", mobile: false, header: "Charged", sortable: true, body: (p: Package) => <span className="whitespace-nowrap">{ugx(n(p.charged_amount))}</span> },
    { field: "balance_due", header: "Balance", sortable: true, body: (p: Package) => <span className={`whitespace-nowrap font-semibold ${n(p.balance_due) > 0 ? "text-red-600 dark:text-red-400" : "text-(--text-muted)"}`}>{ugx(n(p.balance_due))}</span> },
    { field: "status", header: "Status", sortable: true, body: (p: Package) => <Pill value={p.status} /> },
    { field: "delivery_status", header: "Delivery", body: (p: Package) => <Pill value={p.delivery_status} /> },
    { field: "payment_status", mobile: false, header: "Payment", body: (p: Package) => <Pill value={p.payment_status} /> },
    { field: "package_number", mobile: false, header: "Number", sortable: true, visible: false },
    ...auditColumns<Package>({ people: false, created: false }),
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
      <CustomerContextBar onClear={() => list.setFilters({ customer: "" })} />
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

      <PackageDetailsDialog
        id={list.viewId}
        visible={!!list.viewId}
        onHide={list.closeView}
        actions={(p) => (
          <>
            <Button label="Edit" icon="pi pi-pencil" outlined onClick={() => setEditing(p)} />
            {n(p.balance_due) > 0 && p.status !== "cancelled" && <Button label="Record payment" icon="pi pi-wallet" onClick={() => setPaying(p)} />}
          </>
        )}
      />

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
