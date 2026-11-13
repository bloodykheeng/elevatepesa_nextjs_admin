"use client";

import { Suspense } from "react";
import { MdMenu, MdMenuOpen } from "react-icons/md";
import Breadcrumb from "./Breadcrumb";
import NotificationBell from "./NotificationBell";
import ThemeToggle from "../../../common/ThemeToggle";
import UserMenu from "./UserMenu";
import type { UserMenuProps } from "./UserMenu";
import { useSidebar } from "@/contexts/SidebarContext";

interface AppHeaderProps {
  user?: UserMenuProps;
}

// The bell fetches its own count: the feed is narrowed to the reader by the
// API, so the header has nothing to hand it.
export default function AppHeader({ user }: AppHeaderProps) {
  const { sidebarState, cycleSidebarState, isExpanded, toggleMobile } =
    useSidebar();

  const stateLabel =
    sidebarState === "expanded"
      ? "Dock sidebar"
      : sidebarState === "docked"
        ? "Hover mode"
        : "Expand sidebar";

  /*
   * `relative z-[1001]`: a stacking context above the map.
   *
   * Leaflet ships absolute z-indexes, 400 on its panes and 1000 on its
   * controls, so the notification panel at `z-50` drew UNDERNEATH the
   * Performance map. Fixed here rather than on `.leaflet-container`, which is
   * somebody else's component and whose fullscreen depends on how it is
   * positioned: containing it there cost two clicks to go fullscreen.
   *
   * The scale, in one place: Leaflet tops out at 1000, the chrome sits just
   * above it, and PrimeReact's dialogs start at 1100 and cover both.
   */
  return (
    <header className="relative z-1001 flex h-16 shrink-0 items-center gap-2 border-b border-(--border-color) bg-(--bg-nav) px-4">
      {/* Mobile: toggle drawer */}
      <button
        onClick={toggleMobile}
        aria-label="Open menu"
        className="flex h-9 w-9 items-center justify-center rounded-lg text-(--text-secondary) transition-colors hover:bg-(--sidebar-hover-bg) lg:hidden"
      >
        <MdMenu className="text-xl" />
      </button>

      {/* Desktop: cycle expanded, docked, hover */}
      <button
        onClick={cycleSidebarState}
        aria-label={stateLabel}
        title={stateLabel}
        className="hidden h-9 w-9 items-center justify-center rounded-lg text-(--text-secondary) transition-colors hover:bg-(--sidebar-hover-bg) lg:flex"
      >
        {isExpanded ? (
          <MdMenu className="text-xl" />
        ) : (
          <MdMenuOpen className="text-xl" />
        )}
      </button>

      {/* Breadcrumb */}
      <div className="hidden min-w-0 flex-1 sm:block">
        {/* Reads the URL: its own boundary, so a dynamic segment does not hold up the header. */}
        <Suspense>
          <Breadcrumb />
        </Suspense>
      </div>

      {/* Right actions */}
      <div className="ml-auto flex items-center gap-1">
        <ThemeToggle />
        {/* Its router (nextjs-toploader) reads the URL: its own boundary too. */}
        <Suspense>
          <NotificationBell />
        </Suspense>

        <div className="mx-1 h-6 w-px bg-(--border-color)" />

        <UserMenu {...user} />
      </div>
    </header>
  );
}
