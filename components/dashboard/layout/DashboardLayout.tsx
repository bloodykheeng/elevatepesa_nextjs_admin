"use client";

import { Suspense, useEffect, useRef } from "react";

import { useSidebar } from "@/contexts/SidebarContext";
import { useAuth } from "@/contexts/AuthContext";
import { BreadcrumbProvider } from "@/contexts/BreadcrumbContext";
import AuthLoadingScreen from "@/components/auth/AuthLoadingScreen";
import AppSidebar from "./AppSidebar";
import AppHeader from "./AppHeader";
import PageAccessGuard from "./PageAccessGuard";
import { ConfirmActionHost } from "@/components/dashboard/ConfirmAction";
import { RecordPeekProvider } from "@/components/dashboard/records/peek";
import RecordPeekHost from "@/components/dashboard/records/RecordPeekHost";
// Single source of truth for the nav and for page access: see lib/menuItems.ts.
import { menuGroups } from "@/lib/menuItems";
import { useScrollMemory } from "@/hooks/useScrollMemory";
import { useLiveSignals } from "@/hooks/useLiveSignals";

/** Reads the URL, so it sits in its own Suspense boundary (Cache Components). */
function ScrollMemory({ box }: { box: React.RefObject<HTMLElement | null> }) {
  useScrollMemory(box);
  return null;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isMobileOpen, closeMobile, layoutWidth } = useSidebar();
  const { isProfileLoading } = useAuth();
  // Live updates through Reverb: the bell, new orders, queues, message progress. Nothing in the admin polls.
  useLiveSignals();
  // Reload or Back / Forward returns to the same place on the page (docs/scroll-memory.md).
  const main = useRef<HTMLElement>(null);

  /*
   * Lock the document while the shell is mounted.
   *
   * This is an app shell: it is exactly one viewport tall and `<main>` is the
   * only thing that scrolls. The document behind it must never scroll, and it
   * was, which is what put a second scrollbar beside main's.
   *
   * The shell being `h-dvh overflow-hidden` is not enough on its own. `100vh`
   * (and `100dvh`) do not shrink when a transient horizontal scrollbar appears,
   * so the body ends up ~15px taller than the visible area and grows a vertical
   * scrollbar for it. That is why it showed on arrival and healed later: it
   * lasted exactly as long as whatever briefly overflowed sideways.
   *
   * Applied to the ELEMENTS rather than a global stylesheet, and reverted on
   * unmount, because the public pages (landing, login) are ordinary documents
   * that must keep scrolling normally.
   */
  useEffect(() => {
    const { documentElement, body } = document;

    const previous = {
      html: documentElement.style.overflow,
      body: body.style.overflow,
    };

    documentElement.style.overflow = "hidden";
    body.style.overflow = "hidden";

    return () => {
      documentElement.style.overflow = previous.html;
      body.style.overflow = previous.body;
    };
  }, []);

  // The shell and the page ALWAYS render, on the server too, and the branded loader
  // covers them until the profile lands. Left out (or inside a hidden <Activity>, which
  // React does not server-render), the page was "dropped from rendering" and Next could
  // not validate it (docs/messages/instant-unrendered-segment: "render {children} in both
  // branches"). What must wait for the permissions is the data, not the markup: each
  // page's queries are `enabled` by its permission, so nothing is fetched before the
  // profile says the role may, and a page the role cannot open never asks at all.
  // `inert` keeps the covered shell out of reach of the keyboard. docs/dashboard-patterns.md §2.
  return (
    <>
      {isProfileLoading && <AuthLoadingScreen />}
    <div inert={isProfileLoading} className="flex h-dvh overflow-hidden bg-(--bg-page)">

      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 lg:hidden"
          onClick={closeMobile}
        />
      )}

      {/* Desktop space-holder: stays at layoutWidth (70 or 260) so content
          never jumps when hover-mode temporarily widens the sidebar */}
      <div
        className="hidden shrink-0 transition-[width] duration-300 ease-in-out lg:block"
        style={{ width: layoutWidth }}
      />

      <AppSidebar groups={menuGroups} />

      {/* The header sits above every route and cannot know what a dynamic
          segment points at, so the route tells it. See BreadcrumbContext: the
          alternative was a breadcrumb reading 26 characters of ULID. */}
      {/* A related record (an order's customer, a payment's order) opens over the page: see records/peek.tsx. */}
      <RecordPeekProvider>
      <BreadcrumbProvider>
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <AppHeader />
          <main ref={main} className="flex-1 overflow-auto">
            <Suspense>
              <ScrollMemory box={main} />
            </Suspense>
            {/* A page the user's permissions do not cover says so (the menu decides). The guard
                reads the URL, so under a dynamic segment it waits in its own boundary. */}
            <Suspense>
              <PageAccessGuard groups={menuGroups}>{children}</PageAccessGuard>
            </Suspense>
          </main>
        </div>
      </BreadcrumbProvider>
      <RecordPeekHost />
      </RecordPeekProvider>

      {/* Every "Are you sure?" in the dashboard: see ConfirmAction. */}
      <ConfirmActionHost />
    </div>
    </>
  );
}
