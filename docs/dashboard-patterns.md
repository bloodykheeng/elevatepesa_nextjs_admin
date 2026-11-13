# How the dashboard is built

Read this before adding or changing a page. Every list, dialog and form follows the same pattern, so a new
page starts from an existing one, never from scratch.

## Access

- Sign-in: `POST /api/admin/auth/login` returns a Sanctum token (12 hours, or 30 days with "Keep me signed in").
  The token and a slim profile live in cookies named `pesa_admin_*` (`lib/authCookies.ts`); `proxy.ts` only
  routes on them, the API trusts only the token.
- Pages are opened by **role**, not permission, because the API checks roles: `lib/menuItems.ts` gives each
  entry its `roles` (absent = Admin and Editor). The sidebar hides what a role cannot open and
  `PageAccessGuard` refuses the page; the API refuses the data (`role:Admin` on accounts, roles, messages).
- A 401 from the profile ends the session (`contexts/AuthContext.tsx`).

## A standard list page

```
app/dashboard/<page>/page.tsx      Suspense + ListPageSkeleton, metadata title
app/dashboard/<page>/<Page>List.tsx  the client screen
```

The screen uses `useAdminList({ path, filterKeys })` (`components/dashboard/admin/useAdminList.ts`):

- page, page size (5 by default), search, sort and every filter live in the URL, sent as `filter[key]`;
  Back and reload keep them; `lib/listReturn` makes breadcrumbs return to the same address.
- `view=<id>` in the URL opens the record's View dialog, so the bell and other pages can link straight to a
  record (`/dashboard/orders?view=12`) and Back closes it.
- `confirmDelete(what, note)` asks, then bulk-deletes the ticked rows (`POST /admin/<path>/bulk-delete`).
  No per-row delete. The API refuses rows still in use and says why.
- `fetchPage` feeds the table's Export, which walks every page with the same filters.

Rules every list keeps: View (the eye) before Edit on every row; filters in one Filters dialog with chips;
a column most rows leave empty starts hidden; money with `ugx()`, times with `dateTime()` (Kampala clock);
statuses with `<Pill>` (one colour per meaning everywhere).

## Forms

`RecordForm` (`components/dashboard/admin/RecordForm.tsx`) takes numbered `sections` of fields
(`text`, `textarea`, `number`, `money`, `status`, `select` from `/admin/options`, `date`, `password`,
`email`), a `when` to show a field only when it applies, a `parent` to narrow a select by the one above it
(category > brand > type), and an optional photo:

- the photo shows as a preview before saving; editing shows the current one; replace it or Remove;
- "Confirm submission" before sending; the API's field errors appear under each field;
- closing with changes asks first; saving refreshes the lists named in `invalidate`.

Saves are multipart `POST /api/admin/<path>/<id>` so a photo can travel with the fields.

## The simple tables

`app/dashboard/catalog/[resource]/catalog.tsx` defines the twelve tables the API's `App\Admin\Catalog`
serves (same keys and fields): columns, filters, form sections, View fields, delete note, read-only. Adding
a table means an entry on both sides.

## The dashboard

`components/dashboard/home/DashboardHome.tsx`: All time by default (a fixed recent window showed zeros once
orders stopped); the period in the URL; every figure's arrow (on hover) opens the list it counts with the
same filters (`/dashboard/orders?from=...&to=...&has_balance=1`). Counting rules are the API's
(`DashboardController`): cancelled orders count in Orders but not in values or balances.

## The bell

`NotificationBell` polls `GET /api/admin/inbox` every minute and on window focus, toasts a new alert once,
and links each alert to its record. The API writes alerts on new orders, package bookings and sign-ups
(model observers) and when a message send finishes.

## Look

Brand tokens in `app/globals.css` (`--brand` emerald #059669, amber accent), light and dark, applied before
first paint (`app/layout.tsx`). Check new screens at 1536x745 and 1920x1080 in both themes.
