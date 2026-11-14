"use client";

import Link from "next/link";
import { Button } from "primereact/button";
import { SelectButton } from "primereact/selectbutton";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FiRotateCcw } from "react-icons/fi";
import PrimeReactDataTable, { deleteSelectedAction, viewAction, type ToolbarAction } from "@/components/dashboard/tables/PrimeReactDataTable";
import { Dialog } from "@/components/common/Dialog";
import { PageHeader } from "@/components/dashboard/ui";
import { confirmAction } from "@/components/dashboard/ConfirmAction";
import { useAdminList } from "@/components/dashboard/admin/useAdminList";
import { ListSearch, Pill } from "@/components/dashboard/admin/parts";
import { usePrimeReactToast } from "@/contexts/PrimeReactToastContext";
import axiosAPI from "@/services/axiosApi";
import { dateTime, timeAgo } from "@/lib/format";

type Described = { job: string; class: string; about: string | null; link: string | null };
type QueuedJob = Described & { id: number; queue: string; attempts: number; state: "waiting" | "delayed" | "running"; created_at: string; available_at: string; reserved_at: string | null };
type FailedJob = Described & { id: number; uuid: string; queue: string; failed_at: string; error: string; exception?: string };
type Stats = { waiting: number; running: number; failed: number; oldest_waiting_since: string | null; worker_missing: boolean };

const TABS = [
  { label: "Waiting", value: "" },
  { label: "Failed", value: "failed" },
];

/** The job in words, with what it was for ("Send a message to customers", "Gas prices drop" opening that message). */
function JobCell({ j }: { j: Described }) {
  return (
    <div className="min-w-0 max-w-sm">
      <p className="m-0 text-sm font-medium text-(--text-primary)">{j.job}</p>
      {j.about && (j.link
        ? <Link href={j.link} className="text-xs font-medium text-(--brand-ink)">{j.about}</Link>
        : <p className="m-0 truncate text-xs text-(--text-muted)">{j.about}</p>)}
    </div>
  );
}

const When = ({ iso }: { iso: string | null }) => (
  <div className="whitespace-nowrap"><p className="m-0 text-sm">{dateTime(iso)}</p><p className="m-0 text-xs text-(--text-muted)">{iso ? timeAgo(iso) : ""}</p></div>
);

/**
 * Background work, as Alpha and NICE show theirs: what is waiting for the queue worker, and what failed, with Retry
 * and Delete. Messages to customers, push messages and emails all go through it, so a request never waits on Firebase
 * or the mail server. The counts refresh on their own; a warning says when no worker is picking jobs up.
 */
export default function QueuesList() {
  const toast = usePrimeReactToast();
  const queryClient = useQueryClient();
  const waiting = useAdminList<QueuedJob>({ path: "queues/jobs" });
  const tab = waiting.getParam("tab");
  const failed = useAdminList<FailedJob>({ path: "queues/failed", enabled: tab === "failed" });

  const stats = useQuery({
    queryKey: ["queues/stats"],
    queryFn: async () => (await axiosAPI.get<Stats>("/admin/queues/stats")).data,
    refetchInterval: 10_000,
  });
  const viewing = useQuery({
    queryKey: ["queues/failed", "one", failed.viewId],
    queryFn: async () => (await axiosAPI.get<{ data: FailedJob }>(`/admin/queues/failed/${failed.viewId}`)).data.data,
    enabled: tab === "failed" && !!failed.viewId,
  });

  const refresh = () => ["queues/jobs", "queues/failed", "queues/stats"].forEach((k) => queryClient.invalidateQueries({ queryKey: [k] }));
  const retry = useMutation({
    mutationFn: async (ids: number[]) => (await axiosAPI.post<{ message: string }>("/admin/queues/failed/retry", { ids })).data,
    onSuccess: (r) => { toast.success(r.message); failed.setSelected([]); failed.closeView(); refresh(); },
  });
  const confirmRetry = (ids: number[]) => confirmAction({
    header: `Retry ${ids.length} job${ids.length === 1 ? "" : "s"}?`,
    message: "They go back on the queue and run again. A message to customers only goes to people who have not had it yet.",
    acceptLabel: "Retry",
    accept: () => retry.mutateAsync(ids),
  });
  const retryAction: ToolbarAction<FailedJob> = {
    key: "retry", label: (sel) => `Retry (${sel.length})`, icon: <FiRotateCcw className="text-sm" />, requiresSelection: true,
    onClick: (sel) => confirmRetry(sel.map((j) => j.id)),
  };

  const s = stats.data;
  const tile = (label: string, value: number | undefined, to: string, tone?: string) => (
    <button type="button" onClick={() => waiting.setFilters({ tab: to })}
      className={`rounded-2xl border bg-(--bg-card) px-4 py-3 text-left shadow-(--shadow-sm) transition-colors ${tab === to ? "border-(--brand)" : "border-(--border-color) hover:border-(--brand)"}`}>
      <p className="m-0 text-xs font-medium text-(--text-muted)">{label}</p>
      <p className={`m-0 text-2xl font-bold ${tone ?? "text-(--text-primary)"}`}>{value ?? "-"}</p>
    </button>
  );

  const shown = viewing.data;

  return (
    <div className="space-y-5">
      <PageHeader title="Queues" subtitle="Work done in the background: messages to customers, push messages and emails. What is waiting, and what failed." />

      <div className="grid grid-cols-3 gap-3 sm:max-w-xl">
        {tile("Waiting", s?.waiting, "")}
        {tile("Running now", s?.running, "")}
        {tile("Failed", s?.failed, "failed", s?.failed ? "text-red-600 dark:text-red-400" : undefined)}
      </div>

      {s?.worker_missing && (
        <div role="alert" className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100">
          <b>Nothing is picking jobs up.</b> The oldest has waited since {dateTime(s.oldest_waiting_since)} and nothing is running, so the queue
          worker is stopped: messages, pushes and emails will not go out until it is started again (on the server:{" "}
          <code>supervisorctl status</code>).
        </div>
      )}

      <SelectButton value={tab} options={TABS} optionLabel="label" optionValue="value" allowEmpty={false}
        onChange={(e) => waiting.setFilters({ tab: e.value ?? "", view: "" })} aria-label="Show" />

      {tab === "failed" ? (
        <PrimeReactDataTable<FailedJob>
          data={failed.rows}
          columns={[
            { field: "job", header: "Job", body: (j: FailedJob) => <JobCell j={j} />, exportValue: (j: FailedJob) => j.job },
            { field: "failed_at", header: "Failed", body: (j: FailedJob) => <When iso={j.failed_at} />, exportValue: (j: FailedJob) => dateTime(j.failed_at) },
            { field: "error", header: "Why", body: (j: FailedJob) => <p className="m-0 line-clamp-2 max-w-md text-xs text-(--text-secondary)">{j.error}</p> },
            { field: "queue", mobile: false, header: "Queue", visible: false },
          ]}
          {...failed.table}
          emptyMessage="Nothing has failed."
          fileName="Elevate Pesa failed jobs"
          headerContent={<ListSearch value={failed.search} onSearch={(v) => failed.setFilters({ search: v })} placeholder="Job or error" />}
          rowActions={[viewAction<FailedJob>((j) => failed.openView(j.id))]}
          selection={{ selected: failed.selected, onChange: failed.setSelected }}
          toolbarActions={[retryAction, deleteSelectedAction<FailedJob>(() => failed.confirmDelete("failed job", "They are removed for good and will not run again."))]}
        />
      ) : (
        <PrimeReactDataTable<QueuedJob>
          data={waiting.rows}
          columns={[
            { field: "job", header: "Job", body: (j: QueuedJob) => <JobCell j={j} />, exportValue: (j: QueuedJob) => j.job },
            { field: "state", header: "State", body: (j: QueuedJob) => <Pill value={j.state === "running" ? "processing" : "pending"} label={j.state === "running" ? "Running" : j.state === "delayed" ? "Retrying later" : "Waiting"} /> },
            { field: "created_at", header: "Queued", body: (j: QueuedJob) => <When iso={j.created_at} />, exportValue: (j: QueuedJob) => dateTime(j.created_at) },
            { field: "attempts", mobile: false, header: "Tries" },
            { field: "queue", mobile: false, header: "Queue", visible: false },
          ]}
          {...waiting.table}
          emptyMessage="Nothing is waiting: the worker is keeping up."
          fileName="Elevate Pesa queued jobs"
          headerContent={<ListSearch value={waiting.search} onSearch={(v) => waiting.setFilters({ search: v })} placeholder="Job" />}
          selection={{ selected: waiting.selected, onChange: waiting.setSelected }}
          toolbarActions={[deleteSelectedAction<QueuedJob>(() => waiting.confirmDelete("waiting job", "They are removed and will never run. A message to customers would stop where it is."))]}
        />
      )}

      <Dialog
        header={shown ? `Failed: ${shown.job}` : "Failed job"}
        visible={tab === "failed" && !!failed.viewId}
        onHide={failed.closeView}
        style={{ width: "min(46rem, 95vw)" }}
        modal
        maximizable
        footer={
          <div className="flex flex-wrap justify-end gap-2">
            <Button label="Close" text onClick={failed.closeView} />
            {shown && <Button label="Retry" icon="pi pi-replay" loading={retry.isPending} onClick={() => confirmRetry([shown.id])} />}
          </div>
        }
      >
        {viewing.isPending && <div className="h-40 animate-pulse rounded-xl bg-(--border-color)" aria-label="Loading" />}
        {viewing.isError && <p className="m-0 text-sm text-(--text-muted)">That failed job is no longer there: it was retried or deleted.</p>}
        {shown && (
          <div className="space-y-4 text-sm">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
              <div><dt className="mb-0.5 text-xs text-(--text-muted)">Failed</dt><dd>{dateTime(shown.failed_at)}</dd></div>
              <div><dt className="mb-0.5 text-xs text-(--text-muted)">Queue</dt><dd>{shown.queue}</dd></div>
              {shown.about && <div className="col-span-2"><dt className="mb-0.5 text-xs text-(--text-muted)">For</dt><dd>{shown.link ? <Link href={shown.link} className="font-medium text-(--brand-ink)">{shown.about}</Link> : shown.about}</dd></div>}
              <div className="col-span-2"><dt className="mb-0.5 text-xs text-(--text-muted)">Why</dt><dd className="wrap-break-word font-medium text-red-700 dark:text-red-300">{shown.error}</dd></div>
            </dl>
            <section>
              <h3 className="m-0 mb-2 text-sm font-semibold text-(--text-primary)">Full error (for a developer)</h3>
              <pre className="m-0 max-h-80 overflow-auto rounded-xl bg-(--bg-page) p-3 text-[11px] leading-relaxed whitespace-pre-wrap wrap-break-word">{shown.exception}</pre>
            </section>
          </div>
        )}
      </Dialog>
    </div>
  );
}
