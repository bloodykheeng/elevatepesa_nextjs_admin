"use client";

import Link from "next/link";
import { Button } from "primereact/button";
import { useQuery } from "@tanstack/react-query";
import PrimeReactDataTable, { viewAction } from "@/components/dashboard/tables/PrimeReactDataTable";
import FiltersButton, { filterValuesFrom, type FilterGroup } from "@/components/dashboard/filters/FiltersButton";
import { Dialog } from "@/components/common/Dialog";
import { PageHeader } from "@/components/dashboard/ui";
import { useAdminList } from "@/components/dashboard/admin/useAdminList";
import { ListSearch, Pill, VIEW_META, viewError } from "@/components/dashboard/admin/parts";
import { ChangesTable, SnapshotTable } from "@/components/dashboard/admin/AuditValue";
import { adminApi } from "@/services/admin";
import type { AuditEntry } from "@/services/types/pesa";
import { asDate, type ExportColumn } from "@/lib/exportRows";
import { dateTime, timeAgo } from "@/lib/format";

const SOURCE_LABEL: Record<string, string> = { admin: "Admin dashboard", "old-admin": "Old admin", app: "Mobile app", system: "System" };
const sourceLabel = (s: string | null) => (s ? SOURCE_LABEL[s] ?? s : "-");

const EVENTS = [
  { label: "Created", value: "created" },
  { label: "Edited", value: "updated" },
  { label: "Deleted", value: "deleted" },
  { label: "Signed in", value: "signed_in" },
  { label: "Signed out", value: "signed_out" },
  { label: "Sign-in failed", value: "sign_in_failed" },
];

/** Where a record lives in the admin, opened in its View dialog. Null for one the admin has no page for. */
const RECORD_PAGE: Record<string, string> = {
  Order: "/dashboard/orders", Package: "/dashboard/packages", Product: "/dashboard/products", User: "/dashboard/users",
  AdminNotification: "/dashboard/messages",
  ProductCategory: "/dashboard/catalog/product-categories", CategoryBrand: "/dashboard/catalog/category-brands",
  ProductType: "/dashboard/catalog/product-types", InventoryType: "/dashboard/catalog/inventory-types",
  ElectronicCategory: "/dashboard/catalog/electronic-categories", ElectronicBrand: "/dashboard/catalog/electronic-brands",
  ElectronicType: "/dashboard/catalog/electronic-types", ExploreCategory: "/dashboard/catalog/explore-categories",
  ExploreCategoryBlog: "/dashboard/catalog/explore-category-blogs", Ad: "/dashboard/catalog/ads", Faq: "/dashboard/catalog/faqs",
  Referal: "/dashboard/catalog/referrals",
};
const recordHref = (e: Pick<AuditEntry, "subject_type" | "subject_id">) =>
  e.subject_type && e.subject_id && RECORD_PAGE[e.subject_type] ? `${RECORD_PAGE[e.subject_type]}?view=${e.subject_id}` : null;

/** The audit trail's link to one record's history, for any page that wants it. */
export const historyHref = (type: string, id: number | string) => `/dashboard/audit-trail?subject_type=${type}&subject_id=${id}`;

function Who({ e }: { e: AuditEntry }) {
  if (!e.causer) {
    return <span className="text-(--text-secondary)">{e.source === "system" ? "System" : e.event === "sign_in_failed" ? "Unknown" : "Someone signing up"}</span>;
  }
  return (
    <div className="min-w-0">
      <p className="m-0 truncate font-medium text-(--text-primary)">{e.causer.name ?? e.causer.email}</p>
      <p className="m-0 truncate text-xs text-(--text-muted)">{e.causer.role ?? ""}{e.causer.role && e.causer.email ? " · " : ""}{e.causer.email ?? ""}</p>
    </div>
  );
}

/**
 * Who did what, to which record, from where: every create, edit and delete of orders, packages,
 * payments, products, the catalogue and accounts, plus sign-ins and failed attempts. Admins only.
 * Entries are frozen when written (docs/audit-trail.md in pesa_back): renaming a brand later does
 * not change what an old entry says.
 */
export default function AuditTrailList() {
  const list = useAdminList<AuditEntry>({
    path: "audit-trail",
    filterKeys: ["module", "event", "source", "causer", "subject_type", "subject_id", "request", "from", "to"],
  });
  const modules = (list.query.data as { modules?: string[] } | undefined)?.modules ?? [];

  const viewing = useQuery({ queryKey: ["audit-trail", "one", list.viewId], queryFn: () => adminApi.auditEntry(Number(list.viewId)), enabled: !!list.viewId, meta: VIEW_META });
  const shown = viewing.data ?? null;

  const subjectType = list.getParam("subject_type");
  const subjectId = list.getParam("subject_id");
  const requestId = list.getParam("request");
  const causerId = list.getParam("causer");
  const narrowed = subjectType || requestId || causerId;

  const filterGroups: FilterGroup[] = [
    { title: "What", fields: [
      { type: "select", key: "module", label: "Module", options: modules.map((m) => ({ label: m, value: m })), placeholder: "Every module" },
      { type: "select", key: "event", label: "Action", options: EVENTS, placeholder: "Any action" },
      { type: "select", key: "source", label: "From", options: Object.entries(SOURCE_LABEL).map(([value, label]) => ({ label, value })), placeholder: "Anywhere" },
    ] },
    { title: "When", fields: [{ type: "dateRange", from: "from", to: "to", label: "Day", days: true }] },
  ];

  const columns = [
    { field: "created_at", header: "When", sortable: true, body: (e: AuditEntry) => <div className="whitespace-nowrap"><p className="m-0 text-sm">{dateTime(e.created_at)}</p><p className="m-0 text-xs text-(--text-muted)">{timeAgo(e.created_at)}</p></div>, exportValue: (e: AuditEntry) => dateTime(e.created_at) },
    { field: "causer", header: "Who", body: (e: AuditEntry) => <Who e={e} />, exportValue: (e: AuditEntry) => e.causer?.name ?? "" },
    { field: "event", header: "Action", sortable: true, body: (e: AuditEntry) => <Pill value={e.event} label={e.event_label} />, exportValue: (e: AuditEntry) => e.event_label },
    { field: "title", header: "Record", body: (e: AuditEntry) => <div className="max-w-xs min-w-0"><p className="m-0 truncate text-sm text-(--text-primary)">{e.title ?? e.description}</p><p className="m-0 truncate text-xs text-(--text-muted)">{e.module}{e.changed ? ` · ${e.changed} change${e.changed === 1 ? "" : "s"}` : ""}</p></div>, exportValue: (e: AuditEntry) => e.title ?? "" },
    { field: "source", mobile: false, header: "From", body: (e: AuditEntry) => <span className="whitespace-nowrap text-sm">{sourceLabel(e.source)}</span>, exportValue: (e: AuditEntry) => sourceLabel(e.source) },
    { field: "ip", mobile: false, header: "IP address", visible: false, body: (e: AuditEntry) => e.ip ?? "-" },
  ];

  const exportColumns: ExportColumn<AuditEntry>[] = [
    { header: "When", value: (e) => asDate(e.created_at) },
    { header: "Who", value: (e) => e.causer?.name ?? "" },
    { header: "Email", value: (e) => e.causer?.email ?? "" },
    { header: "Role", value: (e) => e.causer?.role ?? "" },
    { header: "Action", value: (e) => e.event_label },
    { header: "Module", value: (e) => e.module ?? "" },
    { header: "What happened", value: (e) => e.description },
    { header: "From", value: (e) => sourceLabel(e.source) },
    { header: "IP address", value: (e) => e.ip ?? "" },
  ];

  const recordLink = shown ? recordHref(shown) : null;

  return (
    <div className="space-y-5">
      <PageHeader title="Audit trail" subtitle="Who did what, and when: orders, payments, products, the catalogue, accounts and sign-ins, from the admin and the app." />

      <PrimeReactDataTable<AuditEntry>
        data={list.rows}
        columns={columns}
        {...list.table}
        emptyMessage={narrowed ? "Nothing recorded for this yet." : "Nothing recorded yet. Entries appear as people use the admin and the app."}
        fileName="Elevate Pesa audit trail"
        exportAll={{ fetchPage: list.fetchPage, columns: exportColumns }}
        headerContent={
          <div className="flex flex-wrap items-center gap-2">
            <ListSearch value={list.search} onSearch={(v) => list.setFilters({ search: v })} placeholder="Record, person or detail" />
            <FiltersButton groups={filterGroups} values={filterValuesFrom(filterGroups, list.getParam)} onApply={list.setFilters} />
          </div>
        }
        statusChips={narrowed ? (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="inline-flex items-center gap-2 rounded-full bg-(--brand-light) px-3 py-1 font-medium text-(--brand-ink)">
              <i className="pi pi-filter text-xs" aria-hidden />
              {subjectType ? `History of one ${subjectType.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase()} (#${subjectId})` : requestId ? "Everything done in one request" : "One person's actions"}
            </span>
            <Button label="Show everything" text size="small" icon="pi pi-times" onClick={() => list.setFilters({ subject_type: "", subject_id: "", request: "", causer: "" })} />
          </div>
        ) : undefined}
        rowActions={[viewAction<AuditEntry>((e) => list.openView(e.id))]}
      />

      <Dialog
        header={shown ? shown.description : "Audit entry"}
        visible={!!list.viewId}
        onHide={list.closeView}
        style={{ width: "min(46rem, 95vw)" }}
        modal
        maximizable
        footer={
          <div className="flex flex-wrap justify-end gap-2">
            {recordLink && shown?.event !== "deleted" && (
              <Link href={recordLink} onClick={list.closeView} className="p-button p-button-outlined p-button-sm no-underline">Open the record</Link>
            )}
            <Button label="Close" text onClick={list.closeView} />
          </div>
        }
      >
        {!shown && viewing.isError && <p className="m-0 text-sm text-(--text-muted)">{viewError(viewing, "entry")}</p>}
        {!shown && viewing.isPending && <div className="h-40 animate-pulse rounded-xl bg-(--border-color)" aria-label="Loading" />}
        {shown && (
          <div className="space-y-5 text-sm">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
              <div><dt className="mb-0.5 text-xs text-(--text-muted)">When</dt><dd>{dateTime(shown.created_at)}</dd></div>
              <div><dt className="mb-0.5 text-xs text-(--text-muted)">Action</dt><dd><Pill value={shown.event} label={shown.event_label} /></dd></div>
              <div className="min-w-0"><dt className="mb-0.5 text-xs text-(--text-muted)">Who</dt><dd><Who e={shown} /></dd></div>
              <div><dt className="mb-0.5 text-xs text-(--text-muted)">From</dt><dd>{sourceLabel(shown.source)}</dd></div>
              <div><dt className="mb-0.5 text-xs text-(--text-muted)">Module</dt><dd>{shown.module ?? "-"}</dd></div>
              {shown.extra?.login ? <div className="min-w-0"><dt className="mb-0.5 text-xs text-(--text-muted)">Tried to sign in as</dt><dd className="wrap-break-word">{String(shown.extra.login)}</dd></div> : null}
            </dl>

            {shown.changes && (
              <section>
                <h3 className="m-0 mb-2 text-sm font-semibold text-(--text-primary)">What changed</h3>
                <ChangesTable fields={shown.changes} />
              </section>
            )}
            {shown.snapshot && (
              <section>
                <h3 className="m-0 mb-2 text-sm font-semibold text-(--text-primary)">{shown.event === "deleted" ? "What was deleted" : "What was saved"}</h3>
                <SnapshotTable fields={shown.snapshot} />
              </section>
            )}

            <section className="rounded-xl bg-(--bg-page) p-3 text-xs text-(--text-secondary)">
              <p className="m-0 mb-1 font-semibold text-(--text-primary)">Request</p>
              <p className="m-0 wrap-break-word">
                {shown.request?.method} {shown.request?.path}{shown.request?.command ? `artisan ${shown.request.command}` : ""}
                {shown.request?.ip ? ` · IP ${shown.request.ip}` : ""}
              </p>
              {shown.request?.user_agent && <p className="m-0 mt-1 wrap-break-word text-(--text-muted)">{shown.request.user_agent}</p>}
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                {shown.subject_type && shown.subject_id && (
                  <Link href={historyHref(shown.subject_type, shown.subject_id)} onClick={list.closeView} className="font-medium text-(--brand-ink)">This record&apos;s history</Link>
                )}
                {shown.same_request > 1 && shown.request_id && (
                  <Link href={`/dashboard/audit-trail?request=${shown.request_id}`} onClick={list.closeView} className="font-medium text-(--brand-ink)">
                    The {shown.same_request} entries from this request
                  </Link>
                )}
                {shown.causer_id && (
                  <Link href={`/dashboard/audit-trail?causer=${shown.causer_id}`} onClick={list.closeView} className="font-medium text-(--brand-ink)">Everything this person did</Link>
                )}
              </div>
            </section>
          </div>
        )}
      </Dialog>
    </div>
  );
}
