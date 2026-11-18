import type { NavGroup } from "@/types/navigation";

/**
 * The sidebar, and the one place that says who may open each page: AppSidebar hides an entry
 * the reader's role cannot open and PageAccessGuard refuses the page, both read from here
 * (lib/pageAccess.ts). No `roles` = every staff role (Admin and Editor). The API holds the same
 * rule: role:Admin on accounts, roles and messages (pesa_back routes/admin.php).
 *
 * Grouped the way NICE's sidebar is (14/11/2026): a small heading over each group, related pages folded under one
 * parent, and one parent open at a time (AppSidebar), so the menu fits a laptop screen with room to spare. It was
 * sixteen rows with Gas & water setup, Electronics setup and Explore each a parent, and Inventory types (the top
 * level of the whole catalogue, gas and electronics alike) sat under Gas & water. A child's label says whose it
 * is ("Gas brands"), since the breadcrumb shows it alone.
 */
export const ADMIN_ONLY = ["Admin"];

export const menuGroups: NavGroup[] = [
  {
    id: "home",
    items: [{ id: "overview", label: "Dashboard", href: "/dashboard", iconName: "dashboard", exact: true }],
  },
  {
    id: "sales",
    label: "Sales",
    items: [
      { id: "orders", label: "Orders", href: "/dashboard/orders", iconName: "cart" },
      { id: "packages", label: "Packages", href: "/dashboard/packages", iconName: "package" },
      {
        id: "money",
        label: "Payments",
        iconName: "payments",
        children: [
          { id: "order-payments", label: "Order payments", href: "/dashboard/payments" },
          { id: "package-payments", label: "Package payments", href: "/dashboard/package-payments" },
        ],
      },
    ],
  },
  {
    id: "catalogue",
    label: "Catalogue",
    items: [
      { id: "products", label: "Products", href: "/dashboard/products", iconName: "store" },
      {
        // What a product is filed under: the inventory type first (gas & water or electronics), then each side's own.
        id: "product-setup",
        label: "Product setup",
        iconName: "tag",
        children: [
          { id: "inventory-types", label: "Inventory types", href: "/dashboard/catalog/inventory-types" },
          { id: "product-categories", label: "Gas categories", href: "/dashboard/catalog/product-categories" },
          { id: "category-brands", label: "Gas brands", href: "/dashboard/catalog/category-brands" },
          { id: "product-types", label: "Product types", href: "/dashboard/catalog/product-types" },
          { id: "electronic-categories", label: "Fuel categories", href: "/dashboard/catalog/electronic-categories" },
          { id: "electronic-brands", label: "Fuel brands", href: "/dashboard/catalog/electronic-brands" },
          { id: "electronic-types", label: "Fuel types", href: "/dashboard/catalog/electronic-types" },
        ],
      },
      {
        // What the app shows besides the products.
        id: "app-content",
        label: "In the app",
        iconName: "campaign",
        children: [
          { id: "ads", label: "Adverts", href: "/dashboard/catalog/ads" },
          { id: "explore-categories", label: "Explore categories", href: "/dashboard/catalog/explore-categories" },
          { id: "explore-category-blogs", label: "Explore articles", href: "/dashboard/catalog/explore-category-blogs" },
          { id: "faqs", label: "FAQs", href: "/dashboard/catalog/faqs" },
          { id: "referrals", label: "Referrals", href: "/dashboard/catalog/referrals" },
        ],
      },
    ],
  },
  {
    id: "admin",
    label: "Administration",
    items: [
      { id: "users", label: "Customers & staff", href: "/dashboard/users", iconName: "people", roles: ADMIN_ONLY },
      { id: "messages", label: "Messages to customers", href: "/dashboard/messages", iconName: "bell", roles: ADMIN_ONLY },
      {
        id: "settings",
        label: "Settings",
        iconName: "shield",
        roles: ADMIN_ONLY,
        children: [
          { id: "roles", label: "Roles & access", href: "/dashboard/roles" },
          { id: "queues", label: "Queues", href: "/dashboard/queues" },
          { id: "audit-trail", label: "Audit trail", href: "/dashboard/audit-trail" },
        ],
      },
      { id: "user-manual", label: "User manual", href: "/dashboard/user-manual", iconName: "help" },
    ],
  },
];
