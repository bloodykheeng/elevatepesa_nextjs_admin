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

**Row buttons stay in view** (14 Nov 2026): the Actions column is pinned to the right (`frozen alignFrozen="right"` in
`PrimeReactDataTable`), its cell takes the row's colour with a hairline at its edge (`app/globals.css`), it is unpinned in
the phone card layout, and row tooltips open to the left so their arrow points at the button. Columns that repeat
another start hidden (Orders: Paid; Packages: Status; Accounts: Push, Joined). The same pattern for other projects:
`coding-notes/nextjs/primereact-datatable-pinned-actions.md`.

## Forms

`RecordForm` (`components/dashboard/admin/RecordForm.tsx`) takes numbered `sections` of fields
(`text`, `textarea`, `number`, `money`, `status`, `select` from `/admin/options`, `date`, `password`,
`email`), a `when` to show a field only when it applies, a `parent` to narrow a select by the one above it
(category > brand > type), and an optional photo:

- the photo shows as a preview before saving; editing shows the current one; replace it or Remove;
- "Confirm submission" before sending; the API's field errors appear under each field;
- closing with changes asks first; saving refreshes the lists named in `invalidate`.

Every form dialog closes through `guardedClose(isDirty, isPending, onHide)` (`components/dashboard/ConfirmAction.tsx`)
from Cancel, × and Escape. It runs straight away (until 2026-11-14 it returned a function the callers never
called, so Cancel did nothing on any form; `e2e/admin/dialogs.spec.ts` guards it).

The photo field shows its title once: the section says "Photo"; `PhotoUploaderPicker` prints no label
unless given `heading`. Every thumbnail (`Thumb`) opens full screen on click (PrimeReact `Image` preview).

Saves are multipart `POST /api/admin/<path>/<id>` so a photo can travel with the fields.

## Dates

The rules are the API's (`pesa_back/docs/timezones.md`): UTC on the wire, a day is the Kampala day.

- Show a moment with `dateTime` / `shortDate` / `timeAgo` (`lib/format.ts`): the Kampala clock whatever the laptop
  says. Never `toLocaleString()` or `new Date(x).getDate()`.
- Send a whole day as a bare day (`calendarDay`, "2026-11-04"): every list filter is `days: true`, "Pick days" sends
  days. A Calendar shows one with `calendarDate(value)`, which reads an instant as its Kampala day (never
  `value.slice(0, 10)`, the UTC date).
- A field with a time: show with `calendarMoment(iso)`, send `pickedMoment(date, previous, "start" | "end")` (picking a
  day snaps to its start or end, changing the time keeps it).
- "Today" is `businessDay(new Date())` / `businessNow()`, never the laptop's date. Exports write dates through
  `asDate()` (the Kampala wall-clock).
- Never read the clock when a file loads (a form default frozen at the first import): `npm run check:dates` finds one.

## The simple tables

`app/dashboard/catalog/[resource]/catalog.tsx` defines the twelve tables the API's `App\Admin\Catalog`
serves (same keys and fields): columns, filters, form sections, View fields, delete note, read-only. Adding
a table means an entry on both sides.

## The dashboard

`components/dashboard/home/DashboardHome.tsx`: All time by default (a fixed recent window showed zeros once
orders stopped); the period and the filters in the URL; every figure's arrow (on hover) opens the list it counts
with the same filters (`/dashboard/orders?from=...&to=...&has_balance=1`), and every figure's (i) says how it is
worked out (`KpiCard`'s and `ChartCard`'s `help`). Counting rules are the API's (`DashboardController`): cancelled
orders count in Orders but not in values or balances.

- **Filters** (beside Pick days, at the right): what was ordered (product, inventory type, gas and water category,
  electronics category) and the order's delivery, payment and mode, from `components/dashboard/admin/orderFilters.tsx`.
  The API applies them with `Order::scopeMatching` on the dashboard, `GET /admin/orders` and `GET /admin/payments`
  alike, so the arrows carry them (`listQuery({}, true)`) and the list counts the same rows. Packages, package
  payments and customers follow the period only, and their (i) says so while a filter is on.
- On All time the customers card is "Customers" (every one); with a period, "New customers" (joined in it).
- Order payments and package payments are separate cards, each opening its own list.

## View dialogs and related records

The dialogs of an order, a package, a payment and an account live in `components/dashboard/records/` and are
shared: the list page opens one from `?view=` with its own buttons (`actions`: Edit, Record payment, Message), and
anything else opens one **over what you are reading** with `usePeek().open("order", id)` or a `<PeekLink>`
(`records/peek.tsx`; drawn by `RecordPeekHost` in the layout). They stack (a payment, its order, the order's
customer); Escape or Close takes off the top one; leaving the page closes them all. A peeked one's footer has
"Open in Orders" for its own page. Never navigate to another list to show a related record (the user,
14 Nov 2026: "a link to the order, not automatically going to orders").

- A list narrowed to one customer (`?customer=`) shows `CustomerContextBar` at its top (NICE's visit bar): the
  customer as a chip with an eye, their other lists (`CustomerLists`), and "Everyone" to clear.
- `RecordDetailsDialog` takes `photo` (beside the fields from a tablet up, never alone with the right half empty)
  and `top` (a summary band: totals, contact).
- Editors may open a customer's account (`GET /admin/users/{id}`), never a staff one; the Customers & staff page
  stays Admin-only.
- Two columns on one field crash the table (a repeated React key): `auditColumns({ created: false })` where a list
  shows `created_at` under its own name ("Placed", "Booked"). The table drops a repeat and warns in development.

A View query passes `meta: VIEW_META` and its dialog shows `viewError(query, "order")`
(`components/dashboard/admin/parts.tsx`): a link to a deleted record (an old bell alert) reads "This order no
longer exists: it was deleted." instead of a raw API error toast. `RecordDetailsDialog` takes
`history={{ type: "Order", id }}` for the Admin-only History link into the audit trail.

## Audit trail

`app/dashboard/audit-trail/`: the API's `activity_log` (pesa_back `docs/audit-trail.md`). Values arrive frozen
(relation and enum labels as they were); `components/dashboard/admin/AuditValue.tsx` only formats them.
`?subject_type=Order&subject_id=5` is one record's history, `?request=` one request, `?causer=` one person,
`?kind=changes` or `?kind=sign_ins` the two tabs. Each row shows its first changes (`changes_preview`), the device
("Chrome 158 on Windows") and the IP; "View the record" peeks an order, package, payment or account.

## The bell

`NotificationBell` reads `GET /api/admin/inbox`, refreshed by a live Reverb signal the moment an alert is stored
(and on window focus), toasts a new alert once, and links each alert to its record. Nothing polls. The API writes alerts on new orders, package bookings and sign-ups
(model observers) and when a message send finishes.

## Live updates

`hooks/useLiveSignals.ts` (mounted once in `DashboardLayout`) listens on Reverb through `lib/echo.ts` and refreshes
the queries each API signal names: the bell, the lists after a new order/package/customer, Settings › Queues, a
sending message. A screen that should stay current adds its query key to `REFRESH` there and the API fires
`StaffSignal` where the data changes; never a `refetchInterval`. Settings: `NEXT_PUBLIC_REVERB_*` in `.env.local`.
The whole design: `pesa_back/docs/realtime.md`.

## Look

Brand tokens in `app/globals.css` (`--brand` emerald #059669, amber accent), light and dark, applied before
first paint (`app/layout.tsx`). Check new screens at 1536x745 and 1920x1080 in both themes, and at 390
(phone) and 820 (tablet): the client works from his phone.

To show or hide a PrimeReact component by breakpoint, put `hidden md:block` on a wrapping `div`, never on the
component: PrimeReact's own `display` rule beats the Tailwind class (the dashboard's period dropdown showed on
desktops until 2026-11-14).
