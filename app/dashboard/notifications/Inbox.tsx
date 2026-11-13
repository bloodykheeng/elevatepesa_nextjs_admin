"use client";

import { useRouter } from "nextjs-toploader/app";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "primereact/button";
import { SelectButton } from "primereact/selectbutton";
import { Paginator } from "primereact/paginator";
import { PageHeader, EmptyState } from "@/components/dashboard/ui";
import { confirmAction } from "@/components/dashboard/ConfirmAction";
import { INBOX_KEY } from "@/components/dashboard/layout/AppHeader/NotificationBell";
import { useListParams } from "@/hooks/useListParams";
import { adminApi } from "@/services/admin";
import type { InboxItem } from "@/services/types/pesa";
import { dateTime, timeAgo } from "@/lib/format";

const KIND_ICON: Record<string, string> = { order: "pi-shopping-cart", package: "pi-truck", customer: "pi-user-plus", send: "pi-send" };

/** Every alert the bell has shown you, newest first, page by page; unread ones first to the eye. */
export default function Inbox() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { page, pageSize, first, getParam, pushParams } = useListParams(10);
  const unreadOnly = getParam("show") === "unread";

  const q = useQuery({
    queryKey: [...INBOX_KEY, "page", page, pageSize, unreadOnly],
    queryFn: () => adminApi.inbox({ page, per_page: pageSize, unread: unreadOnly || undefined }),
    placeholderData: keepPreviousData,
  });
  const items = q.data?.data ?? [];
  const refresh = () => queryClient.invalidateQueries({ queryKey: INBOX_KEY });
  const read = useMutation({ mutationFn: (id: string) => adminApi.readInbox(id), onSuccess: refresh });
  const readAll = useMutation({ mutationFn: () => adminApi.readAllInbox(), onSuccess: refresh });

  const open = (n: InboxItem) => {
    if (!n.read_at) read.mutate(n.id);
    if (n.link) router.push(n.link);
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Notifications"
        subtitle="New orders, package bookings, sign-ups, and the messages you sent once they finish."
        actions={(q.data?.unread_count ?? 0) > 0 ? (
          <Button label={`Mark all read (${q.data?.unread_count})`} icon="pi pi-check" outlined size="small"
            onClick={() => confirmAction({ header: "Mark every notification read?", message: "They stay in the list, without the unread mark.", acceptLabel: "Mark all read", accept: () => readAll.mutateAsync() })} />
        ) : undefined}
      />
      <SelectButton value={unreadOnly ? "unread" : "all"} options={[{ label: "All", value: "all" }, { label: "Unread", value: "unread" }]} optionLabel="label" optionValue="value" allowEmpty={false}
        onChange={(e) => pushParams({ show: e.value === "unread" ? "unread" : "", page: 1 })} />

      <div className={`overflow-hidden rounded-2xl border border-(--border-color) bg-(--bg-card) ${q.isPlaceholderData ? "opacity-60" : ""}`}>
        {q.isPending ? (
          <ul>{Array.from({ length: 6 }, (_, i) => <li key={i} className="flex gap-3 border-b border-(--border-color) px-5 py-4"><span className="h-9 w-9 animate-pulse rounded-full bg-(--bg-page)" /><span className="flex-1 space-y-2"><span className="block h-3 w-1/3 animate-pulse rounded bg-(--bg-page)" /><span className="block h-3 w-2/3 animate-pulse rounded bg-(--bg-page)" /></span></li>)}</ul>
        ) : items.length === 0 ? (
          <EmptyState icon="pi-bell" title={unreadOnly ? "Nothing unread" : "No notifications yet"} body="New orders and sign-ups from the app show here." />
        ) : (
          <ul>
            {items.map((n) => (
              <li key={n.id} className={`flex items-start gap-3 border-b border-(--border-color) px-5 py-4 last:border-b-0 ${n.read_at ? "" : "bg-(--brand-light)/50"}`}>
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-(--brand-light) text-(--brand-ink)"><i className={`pi ${KIND_ICON[n.kind ?? ""] ?? "pi-bell"} text-sm`} /></span>
                <button type="button" onClick={() => open(n)} className="min-w-0 flex-1 text-left">
                  <span className={`block text-sm ${n.read_at ? "text-(--text-secondary)" : "font-semibold text-(--text-primary)"}`}>{n.title}</span>
                  <span className="block text-sm text-(--text-muted)">{n.body}</span>
                  <span className="block text-xs text-(--text-muted)" title={dateTime(n.created_at)}>{timeAgo(n.created_at)}</span>
                </button>
                {!n.read_at && <Button icon="pi pi-check" text rounded size="small" aria-label="Mark read" tooltip="Mark read" onClick={() => read.mutate(n.id)} />}
              </li>
            ))}
          </ul>
        )}
      </div>
      {(q.data?.meta.total ?? 0) > pageSize && (
        <Paginator first={first} rows={pageSize} totalRecords={q.data?.meta.total ?? 0} rowsPerPageOptions={[10, 25, 50]} onPageChange={(e) => pushParams({ page: e.page + 1, pageSize: e.rows })} />
      )}
    </div>
  );
}
