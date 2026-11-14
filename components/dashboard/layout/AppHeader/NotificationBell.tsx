"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "nextjs-toploader/app";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MdOutlineNotifications } from "react-icons/md";
import { useAuth } from "@/contexts/AuthContext";
import { usePrimeReactToast } from "@/contexts/PrimeReactToastContext";
import { adminApi } from "@/services/admin";
import type { InboxItem } from "@/services/types/pesa";
import { timeAgo } from "@/lib/format";

export const INBOX_KEY = ["inbox"] as const;

const KIND_ICON: Record<string, string> = {
  order: "pi-shopping-cart",
  package: "pi-truck",
  customer: "pi-user-plus",
  send: "pi-send",
};

/**
 * The bell: the signed-in staff member's alerts (new orders, package bookings, sign-ups, a
 * message send that finished), from GET /api/admin/inbox. Refreshed the moment the API stores one (a Reverb
 * signal, hooks/useLiveSignals.ts) and when the tab comes back into view; never polled. A new alert also shows as a
 * short notice in the corner.
 */
export default function NotificationBell() {
  const router = useRouter();
  const { user } = useAuth();
  const toast = usePrimeReactToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const inbox = useQuery({
    queryKey: [...INBOX_KEY, "bell"],
    queryFn: () => adminApi.inbox({ per_page: 10 }),
    enabled: !!user?.id,
    refetchOnWindowFocus: true,
  });
  const items = useMemo(() => inbox.data?.data ?? [], [inbox.data]);
  const unread = inbox.data?.unread_count ?? 0;

  // A new alert since the last check: say so once, in the corner.
  const lastSeen = useRef<string | null>(null);
  useEffect(() => {
    const newest = items[0];
    if (!newest) return;
    if (lastSeen.current && newest.id !== lastSeen.current && !newest.read_at) toast.info(newest.title, newest.body);
    lastSeen.current = newest.id;
  }, [items, toast]);

  const refresh = () => queryClient.invalidateQueries({ queryKey: INBOX_KEY });
  const markRead = useMutation({ mutationFn: (id: string) => adminApi.readInbox(id), onSuccess: refresh });
  const markAll = useMutation({ mutationFn: () => adminApi.readAllInbox(), onSuccess: refresh });

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const openItem = (n: InboxItem) => {
    if (!n.read_at) markRead.mutate(n.id);
    setOpen(false);
    if (n.link) router.push(n.link);
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => {
          if (!open) void inbox.refetch();
          setOpen(!open);
        }}
        aria-label={unread ? `${unread} unread notifications` : "Notifications"}
        aria-expanded={open}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-(--text-secondary) transition-colors hover:bg-(--sidebar-hover-bg)"
      >
        <MdOutlineNotifications className="text-xl" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-[22rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-(--border-color) bg-(--bg-card) shadow-(--shadow-md)">
          <div className="flex items-center justify-between border-b border-(--border-color) px-4 py-3">
            <p className="text-sm font-semibold text-(--text-primary)">Notifications</p>
            {unread > 0 && (
              <button type="button" onClick={() => markAll.mutate()} disabled={markAll.isPending} className="text-xs font-semibold text-(--brand-ink) hover:underline disabled:opacity-50">
                Mark all read
              </button>
            )}
          </div>

          <ul className="max-h-[24rem] overflow-y-auto">
            {inbox.isPending &&
              Array.from({ length: 4 }, (_, i) => (
                <li key={i} className="flex gap-3 px-4 py-3">
                  <span className="h-8 w-8 shrink-0 animate-pulse rounded-full bg-(--bg-page)" />
                  <span className="flex-1 space-y-2">
                    <span className="block h-3 w-3/4 animate-pulse rounded bg-(--bg-page)" />
                    <span className="block h-3 w-1/2 animate-pulse rounded bg-(--bg-page)" />
                  </span>
                </li>
              ))}
            {!inbox.isPending && items.length === 0 && <li className="px-4 py-10 text-center text-sm text-(--text-muted)">Nothing yet. New orders and sign-ups show here.</li>}
            {items.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => openItem(n)}
                  className={`flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-(--sidebar-hover-bg) ${n.read_at ? "" : "bg-(--brand-light)/60"}`}
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-(--brand-light) text-(--brand-ink)">
                    <span className={`pi ${KIND_ICON[n.kind ?? ""] ?? "pi-bell"} text-sm`} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-start justify-between gap-2">
                      <span className={`text-sm ${n.read_at ? "text-(--text-secondary)" : "font-semibold text-(--text-primary)"}`}>{n.title}</span>
                      {!n.read_at && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-(--brand)" aria-label="Unread" />}
                    </span>
                    <span className="block truncate text-xs text-(--text-muted)">{n.body}</span>
                    <span className="block text-[11px] text-(--text-muted)">{timeAgo(n.created_at)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>

          <Link href="/dashboard/notifications" onClick={() => setOpen(false)} className="block border-t border-(--border-color) px-4 py-2.5 text-center text-sm font-semibold text-(--brand-ink) hover:bg-(--sidebar-hover-bg)">
            See all
          </Link>
        </div>
      )}
    </div>
  );
}
