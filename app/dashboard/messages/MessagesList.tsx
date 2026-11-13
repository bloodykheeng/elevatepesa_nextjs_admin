"use client";

import { useState } from "react";
import { Button } from "primereact/button";
import { Dropdown } from "primereact/dropdown";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { FiPlus } from "react-icons/fi";
import PrimeReactDataTable, { viewAction } from "@/components/dashboard/tables/PrimeReactDataTable";
import FiltersButton, { filterValuesFrom, type FilterGroup } from "@/components/dashboard/filters/FiltersButton";
import { RecordDetailsDialog } from "@/components/dashboard/audit";
import { PageHeader } from "@/components/dashboard/ui";
import SendMessageDialog from "@/components/dashboard/admin/SendMessageDialog";
import { useAdminList } from "@/components/dashboard/admin/useAdminList";
import { ListSearch, Pill, choices, VIEW_META, viewError } from "@/components/dashboard/admin/parts";
import { adminApi } from "@/services/admin";
import type { CustomerMessage, MessageRecipient } from "@/services/types/pesa";
import { asDate, type ExportColumn } from "@/lib/exportRows";
import { dateTime } from "@/lib/format";

const channels = (m: CustomerMessage) => [m.send_push && "Push", m.send_email && "Email"].filter(Boolean).join(" + ");

/** Who one message reached, page by page, filterable by what failed. */
function Recipients({ id }: { id: number }) {
  const [page, setPage] = useState(1);
  const [only, setOnly] = useState<string>("");
  const params = { page, per_page: 10, ...(only ? { [`filter[${only.split(":")[0]}]`]: only.split(":")[1] } : {}) };
  const q = useQuery({ queryKey: ["notifications", id, "recipients", params], queryFn: () => adminApi.messageRecipients(id, params), placeholderData: keepPreviousData });
  const rows = q.data?.data ?? [];

  return (
    <section>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h3 className="m-0 text-sm font-semibold text-(--text-primary)">Who got it</h3>
        <Dropdown value={only} onChange={(e) => { setOnly(e.value); setPage(1); }} className="w-52 text-sm"
          options={[{ label: "Everyone", value: "" }, { label: "Push failed", value: "push_status:failed" }, { label: "Push skipped (no phone)", value: "push_status:skipped" }, { label: "Email failed", value: "email_status:failed" }]} />
      </div>
      <div className="overflow-x-auto rounded-xl border border-(--border-color)">
        <table className="w-full text-sm">
          <thead className="bg-(--bg-page) text-left text-xs text-(--text-muted)"><tr><th className="px-3 py-2">Customer</th><th className="px-3 py-2">Push</th><th className="px-3 py-2">Email</th><th className="px-3 py-2">Why not</th></tr></thead>
          <tbody className={q.isPlaceholderData ? "opacity-50" : ""}>
            {q.isPending && <tr><td colSpan={4} className="px-3 py-6 text-center text-(--text-muted)"><i className="pi pi-spin pi-spinner" /></td></tr>}
            {rows.map((r: MessageRecipient) => (
              <tr key={r.id} className="border-t border-(--border-color)">
                <td className="px-3 py-2">{r.user?.name ?? `#${r.user_id}`}<br /><span className="text-xs text-(--text-muted)">{r.user?.phone ?? r.user?.email ?? ""}</span></td>
                <td className="px-3 py-2"><Pill value={r.push_status} /></td>
                <td className="px-3 py-2"><Pill value={r.email_status} /></td>
                <td className="max-w-xs px-3 py-2 text-xs text-(--text-muted)">{r.error ?? ""}</td>
              </tr>
            ))}
            {!q.isPending && rows.length === 0 && <tr><td colSpan={4} className="px-3 py-6 text-center text-(--text-muted)">Nobody here.</td></tr>}
          </tbody>
        </table>
      </div>
      {(q.data?.meta.last_page ?? 1) > 1 && (
        <div className="mt-2 flex items-center justify-end gap-2 text-xs text-(--text-muted)">
          Page {q.data?.meta.current_page} of {q.data?.meta.last_page}
          <Button icon="pi pi-chevron-left" text rounded size="small" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} aria-label="Previous page" />
          <Button icon="pi pi-chevron-right" text rounded size="small" disabled={page >= (q.data?.meta.last_page ?? 1)} onClick={() => setPage((p) => p + 1)} aria-label="Next page" />
        </div>
      )}
    </section>
  );
}

/**
 * Messages staff sent to customers: what, how, to how many, and how it went. New message sends
 * to every customer; to pick customers, tick them in Customers & staff.
 */
export default function MessagesList() {
  const list = useAdminList<CustomerMessage>({ path: "notifications", filterKeys: ["status", "audience", "from", "to"] });
  const [composing, setComposing] = useState(false);

  // While a send is still going, check every few seconds so its counts fill in.
  const sending = list.rows.some((m) => m.status === "queued" || m.status === "sending");
  useQuery({ queryKey: ["notifications", "poll", sending], queryFn: async () => { await list.invalidate(); return null; }, enabled: sending, refetchInterval: 4000 });

  const viewing = useQuery({ queryKey: ["notifications", "one", list.viewId], queryFn: () => adminApi.message(Number(list.viewId)), enabled: !!list.viewId, meta: VIEW_META, refetchInterval: (q) => (q.state.data && ["queued", "sending"].includes(q.state.data.status) ? 3000 : false) });
  const shown = viewing.data ?? null;

  const filterGroups: FilterGroup[] = [
    { title: "Message", fields: [
      { type: "select", key: "status", label: "Status", options: choices(["queued", "sending", "sent", "failed"]), placeholder: "Any status" },
      { type: "select", key: "audience", label: "To", options: [{ label: "Every customer", value: "all_customers" }, { label: "Picked customers", value: "selected" }], placeholder: "Anyone" },
    ] },
    { title: "When", fields: [{ type: "dateRange", from: "from", to: "to", label: "Sent", days: true }] },
  ];

  const columns = [
    { field: "title", header: "Message", sortable: true, body: (m: CustomerMessage) => <div className="max-w-md"><p className="font-medium text-(--text-primary)">{m.title}</p><p className="truncate text-xs text-(--text-muted)">{m.body}</p></div> },
    { field: "created_at", header: "Sent", sortable: true, body: (m: CustomerMessage) => <span className="whitespace-nowrap text-sm">{dateTime(m.created_at)}</span> },
    { field: "channels", mobile: false, header: "How", body: (m: CustomerMessage) => channels(m), exportValue: channels },
    { field: "recipients_count", header: "To", sortable: true, body: (m: CustomerMessage) => `${m.recipients_count.toLocaleString("en-UG")} ${m.audience === "all_customers" ? "(everyone)" : ""}` },
    { field: "result", mobile: false, header: "Reached", body: (m: CustomerMessage) => <span className="whitespace-nowrap text-sm">{m.send_push ? `${m.push_sent} push` : ""}{m.send_push && m.send_email ? " · " : ""}{m.send_email ? `${m.email_sent} email` : ""}{m.push_failed + m.email_failed ? <span className="text-red-600 dark:text-red-400"> · {m.push_failed + m.email_failed} failed</span> : null}</span>, exportValue: (m: CustomerMessage) => `${m.push_sent} push, ${m.email_sent} email, ${m.push_failed + m.email_failed} failed` },
    { field: "status", header: "Status", body: (m: CustomerMessage) => <Pill value={m.status} /> },
    { field: "created_by", mobile: false, header: "By", body: (m: CustomerMessage) => m.created_by?.name ?? "-", exportValue: (m: CustomerMessage) => m.created_by?.name ?? "" },
  ];

  const exportColumns: ExportColumn<CustomerMessage>[] = [
    { header: "Title", value: (m) => m.title },
    { header: "Message", value: (m) => m.body },
    { header: "Sent", value: (m) => asDate(m.created_at) },
    { header: "How", value: channels },
    { header: "Recipients", value: (m) => m.recipients_count },
    { header: "Push sent", value: (m) => m.push_sent },
    { header: "Push failed", value: (m) => m.push_failed },
    { header: "Email sent", value: (m) => m.email_sent },
    { header: "Email failed", value: (m) => m.email_failed },
    { header: "Status", value: (m) => m.status },
    { header: "By", value: (m) => m.created_by?.name ?? "" },
  ];

  return (
    <div className="space-y-5">
      <PageHeader title="Messages to customers" subtitle="Push to the app, email, or both. New message goes to every customer; to pick customers, tick them in Customers & staff." />
      <PrimeReactDataTable<CustomerMessage>
        data={list.rows}
        columns={columns}
        {...list.table}
        emptyMessage="No messages sent yet."
        fileName="Elevate Pesa messages"
        exportAll={{ fetchPage: list.fetchPage, columns: exportColumns }}
        headerContent={
          <div className="flex flex-wrap items-center gap-2">
            <ListSearch value={list.search} onSearch={(v) => list.setFilters({ search: v })} placeholder="Title or text" />
            <FiltersButton groups={filterGroups} values={filterValuesFrom(filterGroups, list.getParam)} onApply={list.setFilters} />
          </div>
        }
        rowActions={[viewAction<CustomerMessage>((m) => list.openView(m.id))]}
        toolbarActions={[{ key: "new", label: "New message", icon: <FiPlus className="text-sm" />, onClick: () => setComposing(true) }]}
      />

      <RecordDetailsDialog
        history={shown ? { type: "AdminNotification", id: shown.id } : undefined}
        header={shown?.title ?? "Message"}
        visible={!!list.viewId}
        onHide={list.closeView}
        record={shown}
        width="min(48rem, 95vw)"
        loading={viewing.isPending}
        error={viewError(viewing, "message")}
        fields={shown ? [
          { label: "Status", value: <Pill value={shown.status} /> },
          { label: "How", value: channels(shown) },
          { label: "To", value: shown.audience === "all_customers" ? `Every customer (${shown.recipients_count})` : `${shown.recipients_count} picked customers` },
          { label: "Finished", value: shown.finished_at ? dateTime(shown.finished_at) : "Not yet" },
          ...(shown.send_push ? [{ label: "Push", value: `${shown.push_sent} sent${shown.push_failed ? `, ${shown.push_failed} failed` : ""}` }] : []),
          ...(shown.send_email ? [{ label: "Email", value: `${shown.email_sent} sent${shown.email_failed ? `, ${shown.email_failed} failed` : ""}` }] : []),
          { label: "Message", value: <span className="whitespace-pre-wrap">{shown.body}</span>, wide: true },
        ] : []}
      >
        {shown && <Recipients id={shown.id} />}
      </RecordDetailsDialog>

      <SendMessageDialog visible={composing} onHide={() => setComposing(false)} recipients={null} />
    </div>
  );
}
