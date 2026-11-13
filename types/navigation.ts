export interface NavItem {
  id: string;
  label: string;
  href?: string;
  iconName?: string;
  badge?: string | number;
  badgeVariant?: "default" | "danger" | "warning" | "success";
  children?: NavItem[];
  /**
   * Match this entry's `href` exactly instead of by prefix. Needed by any item
   * whose href is a prefix of its siblings': `/dashboard` would otherwise light
   * up on every page, because the default check is `pathname.startsWith(href + "/")`.
   * An `exact` entry also governs only its own page in `lib/pageAccess.ts`.
   */
  exact?: boolean;
  /**
   * The roles that may open this page. Absent: every staff role (Admin and Editor). The
   * sidebar hides the entry and PageAccessGuard refuses the page for anyone else, both read
   * from here (lib/pageAccess.ts); the API holds the same rule (role:Admin routes).
   * A parent's roles hold for its children too.
   */
  roles?: string[];
}

export interface NavGroup {
  id: string;
  label?: string;
  items: NavItem[];
}
