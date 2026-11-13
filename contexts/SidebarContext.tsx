"use client";

import {
  createContext,
  Suspense,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";

// Types

/** expanded = full labels | docked = icons only | hover = icons but expands on mouse-over */
export type SidebarState = "expanded" | "docked" | "hover";

interface SidebarContextType {
  // Persistent state
  sidebarState: SidebarState;
  isMobileOpen: boolean;
  isHovering: boolean;

  // Computed
  /** true when labels should be visible (expanded, or hover+hovering) */
  isExpanded: boolean;
  /** desktop flex-placeholder width, never changes while hovering */
  layoutWidth: number;
  /** actual rendered sidebar width */
  visualWidth: number;

  // Actions
  setSidebarState: (s: SidebarState) => void;
  cycleSidebarState: () => void;
  toggleMobile: () => void;
  closeMobile: () => void;
  setHovering: (h: boolean) => void;
}

// Context

const SidebarContext = createContext<SidebarContextType | null>(null);

const CYCLE: SidebarState[] = ["expanded", "docked", "hover"];

/**
 * Close the mobile drawer on every route change (fixes stale-open bug after 404 nav).
 * Reads the URL, which is runtime data under a dynamic segment with Cache Components,
 * so it is a leaf in its own Suspense rather than a read at the top of the provider.
 */
function CloseOnNavigate({ close }: { close: () => void }) {
  const pathname = usePathname();
  useEffect(() => {
    close();
  }, [pathname, close]);
  return null;
}

// Provider

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [sidebarState, setSidebarState] = useState<SidebarState>("expanded");
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  // Stable, so the drawer closes on navigation only, not on every render.
  const [closeDrawer] = useState(() => () => setIsMobileOpen(false));

  // Clear hover when leaving hover mode
  useEffect(() => {
    if (sidebarState !== "hover") setIsHovering(false);
  }, [sidebarState]);

  const isExpanded =
    sidebarState === "expanded" || (sidebarState === "hover" && isHovering);
  const layoutWidth = sidebarState === "expanded" ? 260 : 70;
  const visualWidth = isExpanded ? 260 : 70;

  return (
    <SidebarContext.Provider
      value={{
        sidebarState,
        isMobileOpen,
        isHovering,
        isExpanded,
        layoutWidth,
        visualWidth,
        setSidebarState,
        cycleSidebarState: () => {
          const next = CYCLE[(CYCLE.indexOf(sidebarState) + 1) % CYCLE.length];
          setSidebarState(next);
        },
        toggleMobile: () => setIsMobileOpen((v) => !v),
        closeMobile: () => setIsMobileOpen(false),
        setHovering: (h) => {
          if (sidebarState === "hover") setIsHovering(h);
        },
      }}
    >
      <Suspense>
        <CloseOnNavigate close={closeDrawer} />
      </Suspense>
      {children}
    </SidebarContext.Provider>
  );
}

// Hook

export function useSidebar() {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error("useSidebar must be inside <SidebarProvider>");
  return ctx;
}
