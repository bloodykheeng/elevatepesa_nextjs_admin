"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "primereact/button";
import { FiSend } from "react-icons/fi";
import PrimeReactDataTable, { createAction, deleteSelectedAction, editAction, viewAction } from "@/components/dashboard/tables/PrimeReactDataTable";
import FiltersButton, { filterValuesFrom, type FilterGroup } from "@/components/dashboard/filters/FiltersButton";
import { CustomerDetailsDialog } from "@/components/dashboard/records/CustomerDetailsDialog";
import { PageHeader } from "@/components/dashboard/ui";
import RecordForm, { useOptions, type Section } from "@/components/dashboard/admin/RecordForm";
import SendMessageDialog from "@/components/dashboard/admin/SendMessageDialog";
import { useAdminList } from "@/components/dashboard/admin/useAdminList";
import { ListSearch, Pill, Thumb, choices } from "@/components/dashboard/admin/parts";
import { useAuth } from "@/contexts/AuthContext";
import { create, update } from "@/services/admin";
import type { Account } from "@/services/types/pesa";
import { asDate, type ExportColumn } from "@/lib/exportRows";
import { dateTime, shortDate } from "@/lib/format";

type Row = Account & Record<string, unknown>;

/**
 * Every account: customers who signed up in the app, and staff. Admins add staff, change roles,
 * make accounts inactive, and message customers (tick them, then Message).
 */
export default function UsersList() {
  const options = useOptions();
  const { user: me } = useAuth();
  const list = useAdminList<Account>({ path: "users", filterKeys: ["role", "status", "gender", "has_device", "from", "to"] });
  const [editing, setEditing] = useState<{ row: Row | null } | null>(null);
  const [messaging, setMessaging] = useState<{ id: number; name: string }[] | null>(null);


  const filterGroups: FilterGroup[] = [
    { title: "Account", fields: [
      { type: "select", key: "role", label: "Role", options: choices(options.data?.roles ?? []), placeholder: "Any role" },
      { type: "select", key: "status", label: "Status", options: choices(["active", "inactive"]), placeholder: "Any status" },
      { type: "select", key: "gender", label: "Gender", options: choices(["male", "female"]), placeholder: "Any gender" },
      { type: "select", key: "has_device", label: "App on a phone", options: [{ label: "Yes: can get push", value: "1" }, { label: "No", value: "0" }], placeholder: "Either" },
    ] },
    { title: "When", fields: [{ type: "dateRange", from: "from", to: "to", label: "Joined", days: true }] },
  ];

  const sections: Section[] = useMemo(() => [
    { title: "Who they are", fields: [
      { name: "name", label: "Full name", type: "text", required: true },
      { name: "email", label: "Email", type: "email", required: true },
      { name: "phone", label: "Phone", type: "text", hint: "With the country code, as the app stores it: +256700000000." },
      { name: "gender", label: "Gender", type: "status", values: ["", "male", "female"] },
      { name: "date_of_birth", label: "Date of birth", type: "date" },
      { name: "nin", label: "NIN", type: "text" },
    ] },
    { title: "Access", hint: "Admin and Editor open this dashboard; Customer is the app.", fields: [
      { name: "role", label: "Role", type: "status", values: options.data?.roles ?? ["Customer"], required: true },
      { name: "status", label: "Status", type: "status", required: true, hint: "Inactive accounts cannot sign in." },
    ] },
    { title: "Password", hint: editing?.row ? "Leave both empty to keep the current password." : "At least 8 characters. Ask them to change it after signing in.", fields: [
      { name: "password", label: "Password", type: "password", required: !editing?.row },
      { name: "password_confirmation", label: "Repeat the password", type: "password", required: !editing?.row },
    ] },
  ], [options.data?.roles, editing?.row]);

  const isCustomer = (u: Account) => u.role === "Customer";

  const columns = [
    {
      field: "name",
      header: "Name",
      sortable: true,
      body: (u: Account) => (
        <div className="flex items-center gap-3">
          <Thumb src={u.photo_url} name={u.name} round />
          <div className="min-w-0">
            <p className="font-medium text-(--text-primary)">{u.name}</p>
            <p className="truncate text-xs text-(--text-muted)">{u.email}</p>
          </div>
        </div>
      ),
    },
    { field: "phone", header: "Phone", sortable: true, body: (u: Account) => <span className="whitespace-nowrap text-sm">{u.phone ?? "-"}</span> },
    { field: "role", header: "Role", body: (u: Account) => <span className="text-sm">{u.role ?? "-"}</span> },
    { field: "orders_count", header: "Orders", sortable: true, body: (u: Account) => (u.orders_count ? <Link href={`/dashboard/orders?customer=${u.id}`} className="text-(--brand-ink) hover:underline">{u.orders_count}</Link> : "0") },
    { field: "has_device", mobile: false, header: "Push", visible: false, body: (u: Account) => (u.has_device ? <i className="pi pi-mobile text-(--brand-ink)" title="Has the app on a phone: can get push" /> : <span className="text-(--text-muted)">-</span>), exportValue: (u: Account) => (u.has_device ? "Yes" : "No") },
    { field: "status", header: "Status", sortable: true, body: (u: Account) => <Pill value={u.status} /> },
    { field: "lastlogin", mobile: false, header: "Last sign-in", sortable: true, body: (u: Account) => <span className="whitespace-nowrap text-xs text-(--text-muted)">{u.lastlogin ? dateTime(u.lastlogin) : "Never"}</span> },
    { field: "created_at", mobile: false, header: "Joined", sortable: true, visible: false, body: (u: Account) => <span className="whitespace-nowrap text-xs text-(--text-muted)">{shortDate(u.created_at)}</span> },
    { field: "nin", mobile: false, header: "NIN", visible: false, body: (u: Account) => u.nin ?? "-" },
    { field: "gender", mobile: false, header: "Gender", visible: false, body: (u: Account) => u.gender ?? "-" },
  ];

  const exportColumns: ExportColumn<Account>[] = [
    { header: "Name", value: (u) => u.name },
    { header: "Email", value: (u) => u.email },
    { header: "Phone", value: (u) => u.phone ?? "" },
    { header: "Role", value: (u) => u.role ?? "" },
    { header: "Status", value: (u) => u.status },
    { header: "Orders", value: (u) => u.orders_count ?? 0 },
    { header: "App on a phone", value: (u) => (u.has_device ? "Yes" : "No") },
    { header: "Gender", value: (u) => u.gender ?? "" },
    { header: "NIN", value: (u) => u.nin ?? "" },
    { header: "Last sign-in", value: (u) => asDate(u.lastlogin) },
    { header: "Joined", value: (u) => asDate(u.created_at) },
  ];

  const selectedCustomers = list.selected.filter(isCustomer);

  return (
    <div className="space-y-5">
      <PageHeader title="Customers & staff" subtitle="Every account. Tick customers to message them; make an account inactive to stop it signing in." />
      <PrimeReactDataTable<Account>
        data={list.rows}
        columns={columns}
        {...list.table}
        emptyMessage="No accounts match."
        fileName="Elevate Pesa accounts"
        exportAll={{ fetchPage: list.fetchPage, columns: exportColumns }}
        headerContent={
          <div className="flex flex-wrap items-center gap-2">
            <ListSearch value={list.search} onSearch={(v) => list.setFilters({ search: v })} placeholder="Name, email, phone or NIN" />
            <FiltersButton groups={filterGroups} values={filterValuesFrom(filterGroups, list.getParam)} onApply={list.setFilters} />
          </div>
        }
        rowActions={[viewAction<Account>((u) => list.openView(u.id)), editAction<Account>((u) => setEditing({ row: u as Row }))]}
        selection={{ selected: list.selected, onChange: list.setSelected, isSelectable: (u) => u.id !== me?.id, lockedReason: "Your own account" }}
        toolbarActions={[
          {
            key: "message",
            label: () => `Message (${selectedCustomers.length})`,
            icon: <FiSend className="text-sm" />,
            requiresSelection: true,
            disabled: selectedCustomers.length === 0,
            tooltip: selectedCustomers.length === 0 ? "Tick customers to message them" : undefined,
            onClick: () => setMessaging(selectedCustomers.map((u) => ({ id: u.id, name: u.name }))),
          },
          deleteSelectedAction<Account>(() => list.confirmDelete("account", "Accounts with orders or packages are kept: make them inactive instead.")),
          createAction<Account>(() => setEditing({ row: null })),
        ]}
      />

      <RecordForm<Row>
        visible={!!editing}
        onHide={() => setEditing(null)}
        record={editing?.row ?? null}
        title="account"
        sections={sections}
        photo={{}}
        defaults={{ status: "active", role: "Editor" }}
        save={(body, id) => (id ? update<Row>("users", id, body) : create<Row>("users", body))}
        invalidate={["users"]}
        what="this account"
      />

      <CustomerDetailsDialog
        id={list.viewId}
        visible={!!list.viewId}
        onHide={list.closeView}
        actions={(u) => (
          <>
            {isCustomer(u) && <Button label="Message" icon="pi pi-send" outlined onClick={() => setMessaging([{ id: u.id, name: u.name }])} />}
            <Button label="Edit" icon="pi pi-pencil" outlined onClick={() => { setEditing({ row: u as Row }); list.closeView(); }} />
          </>
        )}
      />

      <SendMessageDialog visible={!!messaging} onHide={() => setMessaging(null)} recipients={messaging} onSent={() => list.setSelected([])} />
    </div>
  );
}
