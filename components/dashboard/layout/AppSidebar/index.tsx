"use client";

import { LogoMark } from "@/components/brand/Logo";
import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { MdClose } from "react-icons/md";
import SidebarItem, { OpenParentContext, isActiveItem } from "./SidebarItem";
import { useSidebar } from "@/contexts/SidebarContext";
import { useAuth } from "@/contexts/AuthContext";
import { itemOpenTo } from "@/lib/pageAccess";
import type { NavGroup, NavItem } from "@/types/navigation";

interface AppSidebarProps {
  groups: NavGroup[];
}

/**
 * An item that knows the page it is on. The URL is runtime data under a dynamic segment
 * (`/dashboard/prospect-targets/<id>`), so this read sits in its own Suspense, its fallback the
 * same item unhighlighted: the rest of the sidebar prerenders (Next's migrating-to-cache-components
 * guide, "Client hooks that read the route").
 */
function ActiveSidebarItem({ item }: { item: NavItem }) {
  const pathname = usePathname();
  return <SidebarItem item={item} depth={0} pathname={pathname} />;
}

/** On every page change, opens the parent holding that page and folds the rest (none open on a root page). */
function FollowActiveParent({ groups, setOpenId }: { groups: NavGroup[]; setOpenId: (id: string | null) => void }) {
  const pathname = usePathname();
  useEffect(() => {
    const parent = groups.flatMap((g) => g.items).find((i) => i.children?.length && isActiveItem(i, pathname));
    setOpenId(parent?.id ?? null);
  }, [pathname, groups, setOpenId]);
  return null;
}

export default function AppSidebar({ groups }: AppSidebarProps) {
  const [openId, setOpenId] = useState<string | null>(null);
  const openParent = useMemo(() => ({ openId, setOpenId }), [openId]);
  const {
    isMobileOpen,
    isExpanded,
    visualWidth,
    sidebarState,
    closeMobile,
    setHovering,
  } = useSidebar();

  const { user, role } = useAuth();

  const attributes = user as unknown as Record<string, string> | undefined;
  const userName =
    attributes?.name ?? (user as { name?: string })?.name ?? "Account";
  const userEmail =
    attributes?.email ?? (user as { email?: string })?.email ?? "";
  const initials =
    userName
      .split(" ")
      .filter(Boolean)
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "?";

  // One gate, the menu entry's permission (Alpha's model): the same one PageAccessGuard
  // reads, so nothing here links to a page that then says "no access". A parent keeps only
  // its surviving children and disappears with the last of them, and a group with nothing
  // left takes its heading and divider with it. Badges return with Base B.
  const visibleGroups = useMemo(() => {
    const keep = (item: NavItem): NavItem | null => {
      // A parent's roles hold for its children too (lib/pageAccess.ts needs both).
      if (!itemOpenTo(item, role)) return null;
      if (item.children?.length) {
        const children = item.children.map(keep).filter(Boolean) as NavItem[];
        return children.length ? { ...item, children } : null;
      }

      return item;
    };

    return groups
      .map((group) => ({
        ...group,
        items: group.items.map(keep).filter(Boolean) as NavItem[],
      }))
      .filter((group) => group.items.length > 0);
  }, [groups, role]);

  return (
    <aside
      style={{ "--sidebar-w": `${visualWidth}px` } as React.CSSProperties}
      className={[
        "fixed left-0 top-0 z-30 flex h-full flex-col",
        "w-65 lg:w-(--sidebar-w)",
        "overflow-hidden border-r border-(--border-color) bg-(--bg-sidebar)",
        "transition-[width,transform] duration-300 ease-in-out",
        isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
      ].join(" ")}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      {/* The brand is a link, a masthead that does nothing when clicked being
          the first thing every reader tries. There is no public site, so it goes
          to the Overview. */}
      <div
        className={`flex h-16 shrink-0 items-center border-b border-(--border-color) ${
          isExpanded ? "gap-3 px-4" : "justify-center px-3"
        }`}
      >
        <Link
          href="/dashboard"
          onClick={closeMobile}
          aria-label="Go to the overview"
          title="Go to the overview"
          className={`flex min-w-0 cursor-pointer items-center rounded-lg transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--brand) ${
            isExpanded ? "flex-1 gap-3" : ""
          }`}
        >
          <LogoMark className="h-9 w-9 shrink-0" />

          {isExpanded && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold leading-tight text-(--text-primary)">
                Elevate Pesa
              </p>
              <p className="truncate text-[10px] leading-tight text-(--text-muted)">
                Admin
              </p>
            </div>
          )}
        </Link>

        {isExpanded && (
          <>
            <button
              onClick={closeMobile}
              aria-label="Close sidebar"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-(--text-muted) transition-colors hover:text-(--text-primary) lg:hidden"
            >
              <MdClose className="text-xl" />
            </button>
          </>
        )}
      </div>

      {/* State badge (desktop, collapsed only) */}
      {!isExpanded && (
        <div className="hidden justify-center pt-2 lg:flex">
          <span className="rounded text-[9px] font-bold uppercase tracking-widest text-(--text-muted)">
            {sidebarState === "hover" ? "HVR" : "DCK"}
          </span>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-4">
        {/* Two headings, and neither repeats an entry under it.
            
            There were six groups, four of which held a single foldable parent
            carrying the same word as the heading above it, so the nav printed
            "LOCATIONS" over "Locations". Dropping the repeated headings left
            "ADMINISTRATION" floating halfway down with nothing above it, which
            was worse; inventing a second word for an object that already has
            one is worse again. One heading over the five entries that share a
            purpose fixes all three, and takes four section gaps out of a
            sidebar that has to hold the whole app. See lib/sdsMenuItems.ts.
            
            The divider is for the collapsed rail, where the entries are icons
            with no labels and the heading cannot be drawn. */}
        <OpenParentContext.Provider value={openParent}>
        <Suspense fallback={null}>
          <FollowActiveParent groups={visibleGroups} setOpenId={setOpenId} />
        </Suspense>
        {visibleGroups.map((group, idx) => (
          <div key={group.id} className={idx > 0 ? "mt-4" : ""}>
            {group.label && isExpanded && (
              <p className="mb-1.5 px-3 text-[10px] font-semibold tracking-widest text-(--text-muted) uppercase">
                {group.label}
              </p>
            )}
            {!isExpanded && idx > 0 && (
              <hr className="my-2 border-(--border-color)" />
            )}
            <ul className="space-y-0.5">
              {group.items.map((item) => (
                <li key={item.id}>
                  <Suspense fallback={<SidebarItem item={item} depth={0} pathname="" />}>
                    <ActiveSidebarItem item={item} />
                  </Suspense>
                </li>
              ))}
            </ul>
          </div>
        ))}
        </OpenParentContext.Provider>
      </nav>

      {/* User footer */}
      <div
        className={`shrink-0 border-t border-(--border-color) p-3 ${
          isExpanded ? "" : "flex justify-center"
        }`}
      >
        {isExpanded ? (
          <div className="flex items-center gap-2.5">
            <div className="relative shrink-0">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-(--brand) text-sm font-semibold text-white">
                {initials}
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-(--text-primary)">
                {userName}
              </p>
              <p className="truncate text-xs text-(--text-muted)">
                {userEmail}
              </p>
            </div>
          </div>
        ) : (
          <div className="relative">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-(--brand) text-sm font-semibold text-white">
              {initials}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
