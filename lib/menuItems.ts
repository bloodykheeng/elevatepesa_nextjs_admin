import type { NavGroup } from "@/types/navigation";

/**
 * The sidebar, and the one place that says who may open each page: AppSidebar hides an entry
 * the reader's role cannot open and PageAccessGuard refuses the page, both read from here
 * (lib/pageAccess.ts). No `roles` = every staff role (Admin and Editor). The API holds the same
 * rule: role:Admin on accounts, roles and messages (pesa_back routes/admin.php).
 *
 * Few headings, related pages folded under one parent, so the whole menu fits a laptop screen.
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
        id: "gas-water",
        label: "Gas & water setup",
        iconName: "tag",
        children: [
          { id: "inventory-types", label: "Inventory types", href: "/dashboard/catalog/inventory-types" },
          { id: "product-categories", label: "Categories", href: "/dashboard/catalog/product-categories" },
          { id: "category-brands", label: "Brands", href: "/dashboard/catalog/category-brands" },
          { id: "product-types", label: "Product types", href: "/dashboard/catalog/product-types" },
        ],
      },
      {
        id: "electronics",
        label: "Electronics setup",
        iconName: "inventory",
        children: [
          { id: "electronic-categories", label: "Categories", href: "/dashboard/catalog/electronic-categories" },
          { id: "electronic-brands", label: "Brands", href: "/dashboard/catalog/electronic-brands" },
          { id: "electronic-types", label: "Series", href: "/dashboard/catalog/electronic-types" },
        ],
      },
    ],
  },
  {
    id: "app",
    label: "In the app",
    items: [
      { id: "ads", label: "Adverts", href: "/dashboard/catalog/ads", iconName: "campaign" },
      {
        id: "explore",
        label: "Explore",
        iconName: "document",
        children: [
          { id: "explore-categories", label: "Categories", href: "/dashboard/catalog/explore-categories" },
          { id: "explore-category-blogs", label: "Articles", href: "/dashboard/catalog/explore-category-blogs" },
        ],
      },
      { id: "faqs", label: "FAQs", href: "/dashboard/catalog/faqs", iconName: "help" },
      { id: "referrals", label: "Referrals", href: "/dashboard/catalog/referrals", iconName: "groups" },
    ],
  },
  {
    id: "admin",
    label: "Administration",
    items: [
      { id: "users", label: "Customers & staff", href: "/dashboard/users", iconName: "people", roles: ADMIN_ONLY },
      { id: "messages", label: "Messages to customers", href: "/dashboard/messages", iconName: "bell", roles: ADMIN_ONLY },
      { id: "roles", label: "Roles & access", href: "/dashboard/roles", iconName: "shield", roles: ADMIN_ONLY },
      { id: "audit-trail", label: "Audit trail", href: "/dashboard/audit-trail", iconName: "history", roles: ADMIN_ONLY },
    ],
  },
  {
    id: "reference",
    items: [{ id: "user-manual", label: "User manual", href: "/dashboard/user-manual", iconName: "help" }],
  },
];
