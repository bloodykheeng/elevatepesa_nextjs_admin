/**
 * Permission names, byte-identical to RolesAndPermissionsSeeder on the API.
 *
 * The union makes a typo a compile error rather than a silently hidden
 * button. Add a name only after adding it to the seeder AND putting a
 * matching `can:` on the route. Base B adds settings.
 */
export const PERMISSIONS = [
  "view users",
  "manage users",
  "view locations",
  "manage locations",
  "view roles",
  "manage roles",
  "view audit trail",
  "manage queues",
  "send announcements",
  "view clients",
  "capture prospects",
  "manage clients",
  "make leads",
  "drop clients",
  "view prospect targets",
  "manage prospect targets",
  "view journey plans",
  "manage journey plans",
  "visit leads",
  "view visits",
  "take loan applications",
  "view loan applications",
  "decide loans",
  "record disbursement",
  "manage loan products",
  "manage approval workflows",
  // Send yourself a test notice: a system check, the System Admin's alone.
  "send test notifications",
  // Figures for a period and a place (a field person: their own), and the reports (docs/dashboards.md).
  "view dashboards",
  "view reports",
  // Try a loan before applying: the Loan calculator page (every role).
  "use loan calculator",
] as const;

export type Permission = (typeof PERMISSIONS)[number];
