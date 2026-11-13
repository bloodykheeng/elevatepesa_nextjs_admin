"use client";

import { useEffect, useRef, type RefObject } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * Comes back to where you were (GitHub's feel, docs/scroll-memory.md): on a reload, or Back and
 * Forward, the dashboard's scroll box returns to the same place on the same URL.
 *
 * The browser's own restoration cannot do it here: it restores the window, and the dashboard
 * scrolls `<main>`; and it fires when the HTML is parsed, before the list has loaded, so there
 * is nothing tall enough to scroll to. So: remember `scrollTop` per URL (path and query, since
 * the list's page, filters and search live there) in sessionStorage, and on a reload or
 * Back / Forward put it back as soon as the content is tall enough, checking every 100 ms while the
 * data arrives (a ResizeObserver on the page's nodes missed pages whose nodes are replaced as they
 * load, such as a prospect target's), for at most 8 seconds, and stopping the moment the person
 * scrolls themselves. Nothing is saved while a restore waits, so the short page of the first
 * moments cannot overwrite the place being restored. A link to a page starts at the top.
 */

const PREFIX = "pesa-admin.scroll:";
const GIVE_UP_MS = 8000;
const RETRY_MS = 100;

const read = (key: string): number | null => {
  try {
    const v = window.sessionStorage.getItem(PREFIX + key);
    return v === null ? null : Number(v);
  } catch {
    return null;
  }
};

const write = (key: string, top: number) => {
  try {
    window.sessionStorage.setItem(PREFIX + key, String(Math.round(top)));
  } catch {
    // Private window or blocked storage: the page still works, it just forgets.
  }
};

/** Was this load a reload or Back / Forward (not a fresh visit)? */
const cameBack = () => {
  const entry = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
  return entry?.type === "reload" || entry?.type === "back_forward";
};

export function useScrollMemory(box: RefObject<HTMLElement | null>) {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const key = search ? `${pathname}?${search}` : pathname;
  const firstLoad = useRef(true);
  const popped = useRef(false);
  const waiting = useRef<string | null>(null);

  // Back and Forward inside the app (no page load) count as coming back too.
  useEffect(() => {
    const onPop = () => (popped.current = true);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // Remember where this URL is scrolled to, once a frame at most.
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (waiting.current !== key) write(key, el.scrollTop);
      });
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      el.removeEventListener("scroll", onScroll);
    };
  }, [box, key]);

  // Put it back on a reload or Back / Forward, as soon as the page is tall enough. Which URL is
  // waiting to be restored lives in a ref, so Strict Mode's second run of the effect (and its
  // cleanup in between) cannot lose it; only a restore, the person scrolling, or giving up clears it.
  useEffect(() => {
    if (firstLoad.current) {
      firstLoad.current = false;
      if (cameBack()) waiting.current = key;
    }
    if (popped.current) {
      popped.current = false;
      waiting.current = key;
    }
    const el = box.current;
    const target = waiting.current === key ? read(key) : null;
    if (!el || !target) return;

    let active = true;
    const finish = () => {
      waiting.current = null;
      detach();
    };
    const attempt = () => {
      if (active && el.scrollHeight - el.clientHeight >= target) {
        el.scrollTo({ top: target });
        finish();
      }
    };
    // The page grows as its data lands: try again until it is tall enough, or give up.
    const retry = setInterval(attempt, RETRY_MS);
    const timer = setTimeout(finish, GIVE_UP_MS);
    // The person scrolling themselves wins.
    const events = ["wheel", "touchstart", "keydown", "mousedown"];
    events.forEach((e) => el.addEventListener(e, finish, { passive: true }));
    function detach() {
      active = false;
      clearInterval(retry);
      clearTimeout(timer);
      events.forEach((e) => el?.removeEventListener(e, finish));
    }
    attempt();
    return detach;
  }, [box, key]);
}
