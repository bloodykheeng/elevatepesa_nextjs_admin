/**
 * The accounts the browser tests sign in with. Set them in the environment, never here:
 *
 *   E2E_ADMIN_EMAIL     a staff (Admin) account on the API under test
 *   E2E_PASSWORD        its password
 *   E2E_CUSTOMER_EMAIL  a customer account (optional: the "customers are refused" check)
 */
export const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? "";
export const PASSWORD = process.env.E2E_PASSWORD ?? "";
export const CUSTOMER_EMAIL = process.env.E2E_CUSTOMER_EMAIL ?? "";

export function requireAdmin(): void {
  if (!ADMIN_EMAIL || !PASSWORD) {
    throw new Error("Set E2E_ADMIN_EMAIL and E2E_PASSWORD to a staff account on the API under test.");
  }
}

/** The pages in the menu, with the heading each shows. */
export const PAGES: { path: string; heading: string }[] = [
  { path: "/dashboard", heading: "Dashboard" },
  { path: "/dashboard/orders", heading: "Orders" },
  { path: "/dashboard/packages", heading: "Packages" },
  { path: "/dashboard/payments", heading: "Order payments" },
  { path: "/dashboard/package-payments", heading: "Package payments" },
  { path: "/dashboard/products", heading: "Products" },
  { path: "/dashboard/catalog/inventory-types", heading: "Inventory types" },
  { path: "/dashboard/catalog/product-categories", heading: "Categories" },
  { path: "/dashboard/catalog/category-brands", heading: "Brands" },
  { path: "/dashboard/catalog/product-types", heading: "Product types" },
  { path: "/dashboard/catalog/electronic-categories", heading: "Electronic categories" },
  { path: "/dashboard/catalog/electronic-brands", heading: "Electronic brands" },
  { path: "/dashboard/catalog/electronic-types", heading: "Electronic series" },
  { path: "/dashboard/catalog/ads", heading: "Adverts" },
  { path: "/dashboard/catalog/explore-categories", heading: "Explore categories" },
  { path: "/dashboard/catalog/explore-category-blogs", heading: "Articles" },
  { path: "/dashboard/catalog/faqs", heading: "FAQs" },
  { path: "/dashboard/catalog/referrals", heading: "Referrals" },
  { path: "/dashboard/users", heading: "Customers & staff" },
  { path: "/dashboard/messages", heading: "Messages to customers" },
  { path: "/dashboard/roles", heading: "Roles & access" },
  { path: "/dashboard/audit-trail", heading: "Audit trail" },
  { path: "/dashboard/queues", heading: "Queues" },
  { path: "/dashboard/notifications", heading: "Notifications" },
  { path: "/dashboard/profile", heading: "Your profile" },
  { path: "/dashboard/user-manual", heading: "User manual" },
];
