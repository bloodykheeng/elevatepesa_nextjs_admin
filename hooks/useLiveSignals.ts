"use client";

import { useEffect } from "react";
import { useQueryClient, type QueryKey } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { getEcho } from "@/lib/echo";

type Signal = { topic: "inbox" | "records" | "queues" | "messages"; kind?: string; id?: number };

/** What each signal refreshes (pesa_back App\Events\StaffSignal). Only the queries named; nothing is fetched twice. */
const REFRESH: Record<Signal["topic"], QueryKey[]> = {
  // The bell refetches and toasts the new alert itself (NotificationBell).
  inbox: [["inbox"]],
  records: [["orders"], ["packages"], ["users"], ["dashboard"], ["payments"], ["package-payments"]],
  queues: [["queues/stats"], ["queues/jobs"], ["queues/failed"]],
  messages: [["notifications"]],
};

/**
 * The admin's only source of live updates: Reverb signals instead of polling (docs/realtime.md). Mounted once in the
 * dashboard layout. Listens on the staff channel (new records, queues, message progress) and on the signed-in staff
 * member's own channel (their bell), and refreshes what each signal names. A burst (a 300-recipient send, a run of
 * queued pushes) refreshes each topic at most once a second.
 */
export function useLiveSignals() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = (user as { id?: number } | null)?.id;

  useEffect(() => {
    if (!userId) return;
    const echo = getEcho();
    if (!echo) return;

    const timers = new Map<string, ReturnType<typeof setTimeout>>();
    const onSignal = (s: Signal) => {
      if (!REFRESH[s.topic] || timers.has(s.topic)) return;
      timers.set(s.topic, setTimeout(() => {
        timers.delete(s.topic);
        REFRESH[s.topic].forEach((queryKey) => queryClient.invalidateQueries({ queryKey }));
      }, 1000));
    };

    const own = `App.Models.User.${userId}`;
    echo.private("staff").listen(".signal", onSignal);
    echo.private(own).listen(".signal", onSignal);
    return () => {
      timers.forEach(clearTimeout);
      echo.leave("staff");
      echo.leave(own);
    };
  }, [userId, queryClient]);
}
