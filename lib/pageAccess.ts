import type { NavGroup, NavItem } from "@/types/navigation";

/**
 * What a dashboard page requires, read from the menu the sidebar is built from:
 * one definition of "who may open what", never a second list. Alpha's model
 * (alpha-fund-laravel/docs/access-control.md); GiftNest's per-role route lists
 * were replaced because they drifted from the permissions and locked out any role
 * missing from the map. Elevate Pesa gates by role (Admin, Editor) because its API does.
 *
 * A page is governed by the deepest menu entry whose `href` is the path or a parent
 * of it (`/dashboard/users/<id>` follows Users), and needs every `permission` on the
 * way down to that entry, the parents' included. A page no menu entry covers (the
 * profile, the user manual) is open to everyone signed in.
 *
 * This decides what the screen shows. The API's own `can:` checks remain the
 * security boundary.
 */
export interface PageRequirement {
  /** The menu entry that governs the page, for the message. */
  label: string;
  /** Every role list on the way down; the reader's role must be in each. */
  roles: string[][];
}

const covers = (item: NavItem, pathname: string) =>
  !!item.href && (pathname === item.href || (!item.exact && pathname.startsWith(`${item.href}/`)));

export function pageRequirement(pathname: string, groups: NavGroup[]): PageRequirement | null {
  let best: { item: NavItem; trail: NavItem[] } | null = null;

  const walk = (items: NavItem[], trail: NavItem[]) => {
    items.forEach((item) => {
      const path = [...trail, item];
      if (covers(item, pathname) && (!best || item.href!.length > best.item.href!.length)) best = { item, trail: path };
      if (item.children) walk(item.children, path);
    });
  };
  groups.forEach((g) => walk(g.items, []));

  if (!best) return null;
  const { item, trail } = best as { item: NavItem; trail: NavItem[] };

  return {
    label: item.label,
    roles: trail.map((i) => i.roles).filter((r): r is string[] => !!r),
  };
}

/** Whether a user with this role may open the page. */
export function mayOpen(requirement: PageRequirement | null, role: string | null): boolean {
  if (!requirement) return true;
  return requirement.roles.every((allowed) => !!role && allowed.includes(role));
}

/** Whether a menu entry is open to this role (the sidebar's filter). */
export function itemOpenTo(item: NavItem, role: string | null): boolean {
  return !item.roles || (!!role && item.roles.includes(role));
}
