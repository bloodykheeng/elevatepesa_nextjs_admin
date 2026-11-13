# Dashboard patterns

How a dashboard screen behaves in Letshego. Each section names the rule, why it exists, and the
file to copy from. A new list, toggle or form follows these; a review checks against them. Most rules
came from GiftNest, Alpha and SDS; their worked examples (`giftnest-nextjs/docs/dashboard-patterns.md`)
show screens Letshego does not have.

## 1. Page access (Alpha's model)

Who may open a page is decided **once, by its menu entry** ([lib/menuItems.ts](../lib/menuItems.ts)):

| Layer | File | Decides |
| --- | --- | --- |
| Proxy | [proxy.ts](../proxy.ts) | Routing only: a public page passes, a visitor goes to /login, a signed-in person on `/` or a sign-in page goes to /dashboard |
| Sidebar | [AppSidebar](../components/dashboard/layout/AppSidebar/index.tsx) | Hides an entry whose `permission` the user lacks |
| Page guard | [PageAccessGuard](../components/dashboard/layout/PageAccessGuard.tsx) + [lib/pageAccess.ts](../lib/pageAccess.ts) | The deepest menu entry covering the path (`/dashboard/users/<id>` follows Users) needs every `permission` down to it; without it the page says "You don't have access to this page" |
| API | `can:` on every route | **The boundary.** The other three only decide what the person sees |

- **No per-role route lists.** GiftNest's `lib/routeAccess.ts` listed pages per role; it drifted from the
  permissions and locked out any role missing from the map. It is gone.
- **A new page:** add its menu entry with the right `permission` and protect its API routes with the same
  one. Nothing else. A page no entry covers (profile, user manual) is open to everyone signed in.
- Permission names are mirrored from `RolesAndPermissionsSeeder` in [lib/permissions.ts](../lib/permissions.ts)
  (a typo is a compile error). The user manual filters its chapters with the same rule.

## 2. Cache Components and hidden pages (Next 16.4)

The skeleton `create-next-app@latest` writes turns on `cacheComponents` and `partialPrefetching`
([next.config.ts](../next.config.ts)).

No opt-outs (`instant = false`): the documented way, checked in the browser with zero Insights.

- **The root layout reads no request data** ([app/layout.tsx](../app/layout.tsx)), so it is part of the
  prerendered shell. The theme is applied before first paint by an inline script reading the `theme`
  cookie (Next's "Preventing flash before hydration" guide). That script also **creates** the PrimeReact
  theme `<link id="theme-link">`: React 19 hydrates a stylesheet link only if its `href` is unchanged, so a
  rendered light link the script turned dark failed hydration on every dark load. It is inserted where the
  script stands, after the stylesheets Next hoists, because the theme's rules are in `@layer primereact` and
  layers rank by first declaration (ahead of Tailwind's, Tailwind's reset won: unpadded tabs).
- **`<html>` and `<body>` carry `suppressHydrationWarning`**: the theme script changes `<html>`, and browser
  extensions write attributes on `<body>` before React hydrates (Scrnli adds `location="localhost"`, a red
  hydration error in dev: 10 Nov 2026). It ignores those two tags' own attributes only; everything inside is
  still checked, so a real mismatch in our code still shows.
- **Who is signed in is read on the client** ([AuthContext](../contexts/AuthContext.tsx), after mount), so
  server and client agree; `isProfileLoading` is true until the profile (and its permissions) lands.
- **The dashboard shell and page always render**, server included
  ([DashboardLayout](../components/dashboard/layout/DashboardLayout.tsx)); the branded loader covers them
  (`inert`) until the profile lands. Never leave `{children}` out or put it in a hidden `<Activity>` (React
  does not server-render hidden Activity): the page is then "dropped from rendering" and Next cannot validate
  it (`docs/messages/instant-unrendered-segment`).
- **What waits for permissions is the data, not the markup:** every page query is `enabled` by the page's
  permission (`enabled: can("view users")`), realtime subscriptions too. Nothing fetches before the profile,
  and a page the role cannot open never sends a request; PageAccessGuard shows "no access".
- **Leaving a session is a full page reload** (`leaveToSignIn()` in AuthContext, sign-out and every 401), as
  Next's preserving-UI-state guide advises for logout: the previous user's hidden pages and cache go with it.
- **Whatever reads the URL in the shell sits in its own `<Suspense>`** (`usePathname`, `useSearchParams`,
  `useParams`, and routers that read them, such as `nextjs-toploader`'s). Under a dynamic segment
  (`/dashboard/prospect-targets/[id]`) the path is runtime data, so a read outside a boundary failed the
  server render ("encountered URL data `usePathname()` outside of `<Suspense>`"). The read is pushed to the
  smallest leaf: each sidebar item (its fallback the same item unhighlighted), the breadcrumb, the bell, the
  page guard, and the two providers' URL effects (`CloseOnNavigate` in SidebarContext, `ErrorDepsSync` in
  TanstackContext). Every other page stays fully static; the `[id]` page is a partial prerender. Source: Next's
  `02-guides/migrating-to-cache-components.md`, "Client hooks that read the route".
- **A page you leave stays mounted, hidden** (React `<Activity>`, the "preserving UI state" guide): going
  from Sign in to Forgot password keeps the sign-in form in the DOM. Effects that must stop when a page is
  left clean up as usual; browser tests use role locators or `:visible`, never a bare `getByLabel`
  ([e2e-testing.md](e2e-testing.md)).
- **Every dialog is `@/components/common/Dialog`, never PrimeReact's directly.** Leaving a page while a dialog
  fades out (a link out of it, Record disbursement then back) cut its close short: coming back found it half
  closed, deaf to Close, its mask blocking every click, the sidebar too (the user, 30 Oct 2026). The wrapper
  remounts the dialog when its page is hidden (a layout effect's cleanup, the guide's "reset on hide"), so it comes
  back as its parent says. Held by the stuck-dialog path in `e2e/admin/loans.spec.ts`.
- **PrimeReact's TabView counts a tab left out** (`{see && <TabPanel>}`) as a slot: index tabs by their place in
  the full list, never in the shown ones (ClientRecord's `TABS.indexOf`), or a hidden tab shifts the rest.

## 3. Brand and themes

- Tokens in [app/globals.css](../app/globals.css): `--brand` #2F2E80 (Letshego indigo), `--accent-mid`
  #FBD405 (yellow), the prototype's ink, line and background (`mockups/_src/kit.py`). Light first; `.dark`
  redefines them. Type is the prototype's system stack (Segoe UI, Roboto…), no web font.
- PrimeReact 10's Lara themes hard-code their palette, so [scripts/build-prime-theme.mjs](../scripts/build-prime-theme.mjs)
  generates `public/themes/lara-{light,dark}-letshego` from Lara Indigo with Letshego's scale (dark lifts the
  brand). Run it again after any `primereact` upgrade. `ThemeSync` swaps the two on the theme toggle.
- Overrides that bend PrimeReact into the tokens: [app/primereact-theme.css](../app/primereact-theme.css).
- **PrimeReact stays on 10.x.** npm's 11 is a rewrite into unstyled primitives with new APIs; every table,
  dialog, filter and export here is 10 (settled with the user, 23 Oct 2026).
- The mark: [components/brand/Logo.tsx](../components/brand/Logo.tsx) (the faceted triangle on its indigo
  tile, `app/icon.svg` from the prototype's favicon). Sign-in is the prototype's W00 page,
  [AuthShell](../components/auth/AuthShell.tsx). It fits one screen with no scroll down to 1280×650: the
  wordmark floats from `lg`, and under 820 px tall the `short:` variant (globals.css) tightens the card.
  Check 1536×745 (a 1920 laptop at 125%, the usual office screen), not only 1920×1080.

## 4. Every action asks, then waits

**Every action that writes** (delete, archive, move back, mark all read, send) opens `confirmAction()`
([ConfirmAction.tsx](../components/dashboard/ConfirmAction.tsx)). Pass the mutation's promise: the dialog
keeps its spinner until the request settles, closes on success, and stays open on failure.

```tsx
confirmAction({ header: `Delete ${u.name}?`, message: "...", danger: true, acceptLabel: "Delete",
  accept: () => remove.mutateAsync([u]) });
```

- **One way to delete:** tick rows, then the toolbar's Delete (n). No per-row Delete button.
- **Can never succeed?** Then don't offer it. Users lets only an Inactive account the signed-in person may
  change be ticked ([UsersList.tsx](../app/dashboard/users/UsersList.tsx), `isSelectable`); the API still
  refuses a referenced one with a 409, shown as it is.
- **Per-row loading.** One mutation serves every row: compare `mutation.variables?.id === row.id`.
- **Toast after the refresh.** In `onSuccess`, await the invalidations first, then `toast.success(...)`.

## 5. One Export per list, walking every page

Exports walk the API 100 rows at a time with the list's current filters, then write typed cells to Excel
or CSV ([lib/exportRows.ts](../lib/exportRows.ts), [ExportDialog.tsx](../components/dashboard/export/ExportDialog.tsx)).
On a `PrimeReactDataTable`: `exportAll={{ fetchPage, columns }}`. `fetchPage` is the list's own service call
with the same `filters` object the query uses; `columns` end with `...auditExportColumns<T>()`.

## 6. Rows that cannot be ticked

`selection={{ selected, onChange, isSelectable, lockedReason }}`: a row that must not be selected keeps a
locked checkbox with a tooltip saying why, not a hidden one.

## 7. Unsaved changes are never lost silently

Closing a dirty form (X, Escape, Cancel) asks **Discard your changes?**; a successful save closes it
directly. One helper, `guardedClose(isDirty, isPending, onHide)` in
[ConfirmAction.tsx](../components/dashboard/ConfirmAction.tsx), is the dialog's `onHide` and Cancel.

### Reset a form when it OPENS, never on data that arrives later

`useEffect(() => reset(...), [visible, user, reset])`. Not on a query's data: the user form once reset on
`roles` (the assignable-roles query), which finished after the dialog opened and wiped what had been typed.
Data that arrives later fills only its own field (`setValue("role", ...)` when still empty).

### Blank `defaultValues` on every form

`useForm({ resolver, defaultValues: { ...every field, blank } })`, then `reset()` on open. Without them the
inputs mount with `undefined` (React warns "uncontrolled to controlled"), and a PrimeReact `InputNumber` filled
later by `reset()` misses the value: the plan form showed an empty KYC goal for a plan whose goal was 2, sent
`null` back on blur, made the form dirty (a plain Cancel asked "Discard your changes?") and would have wiped the
goal on save (found 26 Oct 2026; fixed in every form).

## 8. Forms: react-hook-form + zod, valid before confirmed

Every form is **react-hook-form + zod**, as in Alpha.

- **Rules from [lib/validation.ts](../lib/validation.ts)**: `requiredText`, `optionalText`, `email`, `phone`.
  Messages say what to do: "Enter the full name."
- **Cross-field checks** go in `.superRefine(fn, ALWAYS)` so every problem shows at once.
- **Valid, then confirmed (Alpha's Confirm Submission), on every create and edit form.** Only a valid
  form asks, and nothing is sent until Yes:

  ```tsx
  onSubmit={handleSubmit((v) => confirmSubmit(`the branch ${v.name}`, () => save.mutateAsync(v)))}
  ```

  "Are you sure you want to save the branch Kampala East?" → **Yes, save** sends it with a spinner; success
  closes the confirm and the form (the mutation's `onSuccess`); a 422 closes only the confirm
  (`closeOnError`), so the API's errors show on the form's fields behind it.
- **Server errors land on their fields**: `applyServerErrors(error, setError, fields)`; mutations set
  `meta: { skipGlobalError: true }` so the toast does not say it twice.
- **Labels name their inputs**: `Field htmlFor="x"` with the control's `id` / `inputId`. A label that names
  nothing is invisible to a screen reader and to `getByRole(..., { name })`.
- **Red borders**: `Field error={...}` marks itself `data-invalid`; globals.css turns any control inside red.

- **A long form reads in numbered sections**: [FormSection](../components/dashboard/ui.tsx) (`n`, `title`, a one-line
  `hint`) groups what belongs together, never a heap of inputs. The client form: 1 Where they work, 2 Who they
  are (name, phone, optional email), 3 Where they were met (the map), 4 Status.
- **A place is chosen from the top down: branch, then territory, then route.** Nobody knows every route by
  heart. Each level is an `InfiniteSelect` `disabled` and not `enabled` until the level above is chosen; a new
  choice clears the levels below; a level with one choice fills itself in without marking the form dirty
  ([useSoleChoice](../hooks/useSoleChoice.ts)), so a branch manager starts at the territory. The API offers each
  level only what leads somewhere the person may use (`/clients/capture-branches`, `capture-territories`,
  `capture-routes`; for a prospect target's lines, the person's own routes: `/prospect-targets/route-branches`,
  `route-territories`, `routes?user_id=`).
- **Rows of a form** (a target's routes) are a `useFieldArray`, one small component per row so each row runs
  its own pickers and `useSoleChoice`; the API's `lines.0.route_id` maps to the form's `lines.0.route`
  (`applyServerErrors` with a field map), and a whole-list error to `lines.root`.
- **Every calendar carries Today and Clear** (`showButtonBar`): one press for today, one to empty an optional
  day, rather than hunting the month or deleting text. A day that cannot be picked is greyed with
  `minDate` / `maxDate` (a new target's last day: today or later), and the API still says why if one is typed.
- **Every list row has View (the eye)**, opening the record read only (`RecordDetailsDialog`, or the record's page),
  before Edit or any other action: reading never goes through an edit form.
- **A dialog opens and closes smoothly** (the user, 29 Oct 2026: "that snap or closing and reopening is ugly"):
  - **One dialog, never a loading dialog swapped for another.** A record fetched on opening passes `loading` (and
    `error`) to `RecordDetailsDialog`, which shows the shape of its fields in the same dialog, at the same width,
    until the record lands (`LoanApplicationDetailsDialog`). Two `<Dialog>`s, one while loading and one after,
    close and open again: that was the snap.
  - **It fades out with its record.** Take `visible` from the live value and draw from `useLastValue(value)`
    (`hooks/useLastValue.ts`): clearing the record on close otherwise empties the dialog while it animates out, so
    it shrinks to nothing first. Every details dialog does this (the lists' `shown`, the shared visit, KYC, loan
    request and loan application dialogs, the field map's and field team's people); the audit trail and queues keep
    their record until the next is opened.
  - **A link out of a dialog closes it** (`onClick={onHide}` on the footer's link, the `links` slot already does):
    Next keeps the page left mounted, so the dialog would still be open (and in the page) on coming back.
- **A wide record keeps a short row by opening in place**: `expansion={{ render }}` on `PrimeReactDataTable` adds
  a chevron first and draws what the columns leave out under the row (PrimeReact's row expansion; rows need an
  `id`). The client pipeline shows client, phone, stage, status, route and when; the contact, visits, where in
  full and who captured them open under it (the user, 29 Oct 2026). A list inside a record page too (a
  client's leads: the eye opens the lead with its map). Any GPS shown as numbers is a link to
  Google Maps.
- **A record that grows with each module is a page, not a dialog** (the client: W06's header, then tabs in the
  URL, `?tab=loans`): `/dashboard/pipeline/<id>`, read under Suspense like a target's page. Dialogs stay for one
  short thing (a form, a confirmation).
- **A standard list inside a form** (a plan's leads, and its Add leads picker) never submits the form: every
  button the table draws is `type="button"` (a bare `<button>` in a form is a submit button), and a search in it
  has no `<form>` of its own (forms do not nest, and React carries a submit out of a portal to the form around
  it): the input searches on Enter, the button is `type="button"`.
- **Picking rows for a form** is a table select dialog (SAP Fiori's pattern): the form shows what it holds as
  the standard list (Add, tick + Remove, row actions), and **Add** opens a dialog of the choices as the standard
  list with ticks that hold across pages (`dataKey="id"`); its Add button puts them in, Cancel adds nothing. What
  the form already holds is left out by the API (`exclude=`), so the count and pages stay true. Not two tables
  in one view.
- **Editing from a list row** whose resource leaves out what the form needs (a target's lines): the form fetches
  the record when it opens and shows a skeleton until then, rather than opening with a blank row.

- **Help that does not fit under a field** goes in
  [InfoHint](../components/common/InfoHint.tsx) (Alpha's): a `?` icon (how to do something) or `i` (what a figure
  means) that opens a small panel on click, so it works on a phone too. The short version stays in the field's
  hint; paragraphs and `- ` bullets in `text` (a list is its own block: a blank line between its heading line and
  its bullets, or they run on as one paragraph). A long one scrolls inside the panel (at most 75% of the screen's
  height), never off a laptop's screen. First use: "Remember me for 7 days" on sign-in.

## 9. Filters live in one dialog

A list's toolbar is the search box, one **Filters** button and Export
([FiltersButton.tsx](../components/dashboard/filters/FiltersButton.tsx)). Values live in the URL
(`useListParams`), so a reload or a shared link keeps them, lists inside a record page too (a target's
prospects: search, route, page and sort in the URL).

A client's number and email show in one **Contact** column, and as Phone and Email in a pin's popup
([ClientContact](../components/dashboard/clients/ClientContact.tsx): `ContactCell`, `contactLines`). Shared pickers:
[pickers.ts](../components/dashboard/filters/pickers.ts) (`accountPicker`, `dateRange`, `optionsOf`) and, for
locations, [locations/pickers.ts](../components/dashboard/locations/pickers.ts) (`branchFilter`,
`territoryFilter`; `branchPicker` / `territoryPicker` for forms, Active only). Hide the branch filter from a
branch manager: their lists are their branch already (the API's scoping).

A place in the dialog **cascades before Apply** (a picker's `cascade` reads the draft): a branch narrows the
territories and routes offered, a territory the routes, and a new branch empties what was picked under it
(`clears`). **A refused save says so twice**: under each field, and in a "Not saved" toast with the first
reason, with the first marked field scrolled into view (`applyServerErrors`, `revealFirstInvalid` as
`handleSubmit`'s second argument): a long form's error at its top was out of sight (the user, 28 Oct 2026). A
product's range is checked in the form before it is sent. A row action that cannot be done now is **greyed with
why** (`disabledReason`), not hidden, the reason on a wrapper React owns (`components/common/WhyNot.tsx`). **Never PrimeReact's `tooltipOptions.showOnDisabled`**: it wraps the button in a `<div>` outside React, and the next re-render that removes or swaps the button crashes the page ("Failed to execute 'removeChild' on 'Node'", the KYC draft crash of 28 Oct 2026).

## 9b. Locations and where people work

- [Locations](../app/dashboard/locations/LocationsPage.tsx): three level cards act as tabs (`?level=`), each
  level one [LevelList](../app/dashboard/locations/LevelList.tsx) driven by a config (columns, filters, export,
  form). A new level of the same shape is a config, not a copy of the list.
- [WhereTheyWork](../components/dashboard/admin/WhereTheyWork.tsx) in the user form: asks only what the role
  needs (head office nothing, branch manager a branch, officer / agent a branch, territories, all or some
  routes), mirroring `UserController::placement()`; the API's 422s land on `placement.*`.

## 10. No list without paging, and loading you can see

Every list is paged on the API (5 a page, `PerPage`), tables with the paginator, long option lists with
`InfiniteSelect`. Lists keep `placeholderData: (previous) => previous` and show loading with
`loading={query.isPending || query.isPlaceholderData}`. Dashboards keep the figures shown while another period
loads, dimmed (`ChartCard refreshing`, the KPI row's opacity), with **Updating** by the filter sentence
(`ScopeLine busy`): a switch never looks like nothing happened (the user, 30 Oct 2026).

### Loading shapes

A page that loads shows **its own shape**, never one grey block: a record page composes its skeleton from
`components/dashboard/RecordSkeleton.tsx` (`HeaderSkeleton`, `PageHeaderSkeleton`, `TabsSkeleton`,
`StatCardsSkeleton`, `DetailsCardSkeleton`, `TableCardSkeleton`, `MapCardSkeleton`, `TimelineSkeleton`) in the same
order and grid as the real page (the client: header, tabs, details beside the map; a journey plan: heading, four
figures, the leads, the map). Lists use the standard table's skeleton; dialogs `RecordDetailsDialog`'s; charts
`ChartCard`'s. A new page adds its shape with it (the user, 10 Nov 2026: "the skeleton doesn't match the data, and it's
not only in this place"). Spinners are for actions (saving, sending) and "loading more" in a feed, never a page. A table's skeleton is the standard
table's frame (toolbar buttons on the right, one cell per column spread across the whole width, the round View button, the
pager), never bars bunched to the left; a figure card's is StatCard's (label top left, icon top right, figure, hint).

### No blank page between pages

A navigation never shows an empty white page (the user, 10 Nov 2026: "is it a crash?"). Next.js shows a route's
`loading.tsx` at once while its code and data arrive (prefetched with the route; in development the first visit also
compiles the page): `app/dashboard/loading.tsx` picks the shape by the address (the Overview, reports and field map as a
report, the calculator, profile and manual as cards, the rest as a list), and each record route has its own
`loading.tsx` in its shape. **Every page's `<Suspense>` has a fallback** in the same shape (`ListPageSkeleton`,
`ReportPageSkeleton`, `CardsPageSkeleton` with `padded={false}`, or the record's), never a bare `<Suspense>`; the record
components use the same record shape while their data loads, so the two always match. A new page adds both.

### Columns that are mostly empty start hidden

A column most rows leave empty (a plan's or target's Description) starts hidden (`visible: false` on the column): it
stays in the column menu (the gear) and in the export, and the row keeps its width for what is filled (the user, 10 Nov
2026).

### Back returns to the list where it was left

Every list page remembers its own address, page, filters, search and sort, as it changes (`useListParams` →
`rememberListUrl`, sessionStorage, this tab only). A record's back button (`useListReturn("/dashboard/pipeline")`) and
the breadcrumb's list links return there, so page 3 stays page 3 (the user, 10 Nov 2026). The sidebar opens a list
fresh. The first paint uses the bare path (the server has no storage, and the markup must match). Any new record page
with a back button uses `useListReturn`. Test: e2e `pipeline.spec.ts` "back from a client's record".

## 11. Phone numbers

Digits with the country code, no "+", `PhoneField`, `phone()` rule; any country. A sign-in box takes a
phone as typed (`CredentialInput`: a digit or "+" turns it into a phone field).

## 12. Multipart payloads

A request with a file goes as `FormData` only when a file is in play (the profile's `buildPayload` in
[EditProfileDialog.tsx](../app/dashboard/profile/EditProfileDialog.tsx)): booleans as "1"/"0", null left
out, and `multipart/form-data` declared on that call. A plain save stays JSON.

## 13. Words on screen

- The prototype's words: **prospect, lead, KYC completed, client** (loan disbursed); **prospect targets**
  for a sales agent's route and daily target; **lead journey plans** for an officer's visits. No "journey
  plan" for prospect targets.
- Sign-in says **username, email or phone**; the second step is **your code**.
- Copy is short and plain, no em dashes, and describes what the reader sees.

## 14. Notifications: the bell, the feed and push

The API half (channels, who hears what): `letshego-laravel/docs/realtime-queues-notifications.md`. **Who is
online** (the `online` presence channel, its id-and-branch payload, counting only the reader's reach, the users
list's dots, pill, count and Online filter, and leaving every channel on logout) is set out there too, under
"`online`: who is online".

- **Feed:** [useNotificationFeed](../components/dashboard/notifications/useNotificationFeed.ts) (GiftNest's,
  as is): pages with Load more, every action shown at once on every copy (the bell and the page share the
  `["notifications"]` root) and put back if the API refuses. `enabled` on a signed-in user (§2).
- **Bell:** [NotificationBell](../components/dashboard/layout/AppHeader/NotificationBell.tsx) in the header.
  New (unread when the panel opened, so a row read while scrolling stays put) and Earlier; a row is read once
  half in view; only the arrow navigates. Live on `echo.private("App.Models.User.{id}").notification()`
  (Laravel's type `letshego.notification`): a toast, the feed refetched now and 2.5 s later (the row and the
  broadcast are separate queued jobs), and the profile refetched for a `placement` notice. `KIND_STYLE`
  maps each `kind` to an icon; a new kind adds a line there.
- **The bell is enough on its own:** every notice can be read in the overlay, without leaving the page.
  "10 of 34" under the list, and the next page loads when the end of the list scrolls into view (a
  `useInView` sentinel); Load more stays for a list too short to scroll.
- **Page:** `/dashboard/notifications`, no menu entry (open to everyone, §1): the standard list (search,
  rows per page, skeleton, Export, state in the URL), All / Unread / Archived, mark all read, row actions
  Open, Mark read and **Archive** (Move back in the Archived view; archive, never delete, as Novu and
  Courier), and **Send me a test** (`POST notifications/test`). For those who prefer a page; never required.
- **Every list inside a dialog is the standard list too** (Who read it, the people picker): rows per page,
  skeleton, Export where it means something. A raw PrimeReact DataTable shows a spinner and a fixed page.
- **See all** is a quiet link in the panel's header, not a footer: the list is where people read.
- **Announcements:** `/dashboard/announcements` (menu Admin, `send announcements`):
  [AnnouncementsList](../app/dashboard/announcements/AnnouncementsList.tsx) and
  [AnnouncementFormDialog](../app/dashboard/announcements/AnnouncementFormDialog.tsx), GiftNest's ported. Send to
  roles and locations (roles, and branches, territories, routes; all optional) or chosen people; In-app
  always, Email and SMS ticked (`send_email`, `send_sms`); Start, End, Active. The form counts who it reaches
  (`preview`) as it is filled; sending now confirms with that number, saving for later uses the usual Confirm
  submission. A branch manager's form has no branch picker (their branch is the bound), their territories and
  routes, and branch roles. People are chosen in
  [PeoplePickerDialog](../app/dashboard/announcements/PeoplePickerDialog.tsx) (NICE's Select users): a paged
  table narrowed by name, role and branch, ticked across pages, shown back in the form as removable chips. A
  sent one's details show [WhoReadIt](../app/dashboard/announcements/WhoReadIt.tsx): read of reached, and the
  people, Read / Not read. The data model and why: letshego-laravel/docs/realtime-queues-notifications.md,
  "Announcements".
- **Toasts sit below the header** (`primereact-theme.css`, "Toast"): over it they covered the bell, and
  PrimeReact keeps a toast while the pointer rests on it.

### Push to the browser

- [usePushNotifications](../hooks/usePushNotifications.ts) holds the permission, **called by the bell**, which
  is on every page (inside the panel it ran only once the panel opened). **The browser is asked
  only from "Turn on"** in the bell (a prompt on page load gets blocked, and Chrome answers it with its quiet
  UI). Blocked says how to allow it; Allow notifications off in the profile says so instead (the API pushes
  nothing then).
- Allowed: register the worker, `getToken(messaging, {vapidKey, serviceWorkerRegistration})`,
  `POST push-tokens`, keep the token in localStorage (`lib/pushToken.ts`, `letshego_push_token`). **Every
  sign-in re-registers silently** when already allowed (once per page load and account). Sign-out sends
  `push_token` in `auth/logout` and forgets it; permission taken back in the browser unregisters it.
- [public/firebase-messaging-sw.js](../public/firebase-messaging-sw.js) gets the config from its own
  registration URL (`lib/firebase.ts` `messagingServiceWorkerUrl()`, Alpha's: one file for Test and
  Production). Messages are **data-only**, so `onBackgroundMessage` draws them (icon `/apple-icon.png`) and
  `notificationclick` focuses an open tab and navigates it, or opens one. Its `importScripts` version
  matches the `firebase` package: bump both.
- **No foreground handler.** A focused tab has the Reverb toast; Firebase calls the worker only when no tab
  is focused, so nothing shows twice.
- **A subscription made with another key is dropped first** (`dropForeignSubscription()`): Firebase's
  `getToken()` reuses any push subscription the origin has, and localhost:3000 had one from Alpha's or
  GiftNest's project, so Firebase issued a token Chrome then refused ("Permission denied by the third party
  webpush service", kreait `SenderIdMismatch`). A new token also unregisters the browser's previous one.
- The SDK is imported dynamically, so it is not in any page's first download.
- **Checking push by hand**: Playwright's browsers cannot (its headless shell reports `denied`, and every
  context is incognito, where Chrome has no Push API). Turn on,
  Allow, see `POST push-tokens` 201; Send me a test (toast and bell); press it again and switch tab or
  minimise: a system notification; clicking it opens the link. DevTools > Application > Service workers
  shows the worker URL carrying `projectId`.

## 15. Records that belong together, one click apart

What the field work makes about one client (their lead, visits, refused check-ins, client KYC) has a
list of its own in the sidebar, to search across clients and export, and the lists are joined, as NICE joins a
customer's visit, orders and stock counts (`VisitQuickLinks`, `CustomerVisitDetailsBar`; the user, 26 Oct 2026):

- **The context in the URL**: `?client=…&visit=…` (the lead is the client at that stage). Each list narrows by the keys it can
  (`contextFilters` in `components/dashboard/field/ContextBar.tsx`) and keeps the rest, so the bar still names them.
- **The context bar** (`ContextBar`) on top of a narrowed list: a chip each for the client (opens the record; what
  they asked for on hover) and the visit (the eye opens its details), the links to the same client's other lists (`RecordLinks`, the
  current page marked, not linked) and **Show all**.
- **The same links in View dialogs** (the `links` slot of `RecordDetailsDialog`): a visit links to its record and the
  client KYC saved on it; a lead and a KYC link to the rest. **Inside the client's record** they switch its tabs
  (`?tab=visits`, `client-kyc`, `loan-applications`; the loan request is on Overview) instead of leaving it, and
  refused check-ins, which have no tab there, are left out; elsewhere they open the lists (the user, 28 Oct 2026).
- **One place per action** (the user, 28 Oct 2026: three Fill in KYC buttons were "clutter"): an action lives on
  the table it belongs to, a toolbar button to start one (`ToolbarAction.disabled`, greyed with the reason as its
  tooltip when it cannot be now) and the row's Edit after. No second copy in a header, a bar or a note, and no
  sentence repeating what the screen already shows.
- **Steps and events read as a thread** (`components/dashboard/thread.tsx`, Alpha's approval timeline look): a rail
  with a bubble per node, its title and lines under it; workflow steps and each submission's decisions use it,
  never one line joined with " · ".
- **Related lists fold** in the sidebar under one parent, as SDS does: few headings (Work, Administration) and
  folds (Field work › Loan requests, Visits, Refused check-ins, Client KYC; Loan applications and Approvals stand alone, each with room for its count;
  Planning › Prospect targets, Journey plans; Setup › Locations, Loan products, Approval workflows; System › Roles &
  access, Audit trail, Queues), so folded the menu fits a laptop screen without scrolling (the user, 28 Oct 2026). A
  parent opens itself on its own pages, never repeats its heading's word, and its permission holds for its children.
  Specs open a folded page with `openFromSidebar` (e2e/helpers/nav.ts).
- **Loan applications join them** (step 6, docs/loan-applications.md): Loan applications narrows by client
  and visit like the field lists and is a pill in `RecordLinks`; Approvals is the same list as a queue (waiting
  for you, newest first; Approved holds the disbursed too); the decision sits at the very foot of its View dialog
  (`RecordDetailsDialog after`); one application opens as a page of its own (`/dashboard/loan-applications/<id>`, prototype
  W08) where the decision, withdrawing and the disbursement live.

Current practice agrees: related records shown in context and opened from there rather than searched for again
([ServiceNow, related records in the contextual side panel](https://www.servicenow.com/docs/r/5M2H7PAkXUuakbtz~5Kfeg/gBCENPB7s0jNvgunH7EVsw)),
an active filter chip that says what is applied and clears it
([Stripe Apps, filter controls](https://docs.stripe.com/stripe-apps/patterns/filter-controls)), and grouped,
collapsible sidebar sections that open on the active page
([Singapore Government Design System, sidebar](https://designsystem.tech.gov.sg/components/sidebar)).

## 16. Dashboards: one period bar, cards that narrow, charts through one wrapper

The dashboards and reports (letshego-laravel `docs/dashboards.md`) share their parts
(`components/dashboard/insights/parts.tsx`, `hooks/useReportScope.ts`):

- **One period bar** per page: Today / Week / Month / Quarter / Year so far as tabs (`lib/period.ts`, Luxon; only
  the presets within the page's `maxDays`, from `useReportScope`) and **Pick days** (`PeriodPicker`: one day or a
  first and a last day, each on its own calendar, quick picks for finished windows, Apply; the last day can never
  be before the first, after today or past the limit), and the one Filters dialog for where, who and product, all
  in the URL (`period`, `from`, `to`, `branch`, `territory`, `route`, `person`, `product`). Never one range
  calendar controlled by the URL: it drops the first click whenever the page redraws, which is how "selecting a
  day does nothing" happened.
- **How a page works** goes in `PageHeader help` (an (i) by the title), only where the figures follow rules the
  reader cannot see; bullets as `- Term: detail` (InfoHint bolds the term).
- **A card's own funnel** (SDS's `useCardFilters`; here `useCardScope` and `FiltersButton compact`): narrows that
  card only, never widens the page or changes its period, and says "this card is narrowed" on its face.
- **`ChartCard`**: title, an (i) with the rule behind the figure, the card's actions, and its loading, failed and
  empty states (failed is not empty, checked in that order). **`KpiCard`**: the figure, its move against the
  previous period, a line under it, the list it opens.
- **Charts** go through `components/common/charts/BaseChart` (GiftNest's Highcharts wrapper: one client-only
  boundary, theme and dark mode, the export menu with the period as subtitle). A screen never keeps its own
  copy of a rule's numbers: the bands come from the API (`bands`).
- **Dates** are Luxon on the business clock (`lib/format.ts`): `calendarDay` / `calendarDate` at a PrimeReact
  Calendar's edge, `businessNow`, `onBusinessClock`; no `toLocaleString` or hand-built `Date` arithmetic.

**The dashboards say their filters as a sentence** (`ScopeLine`, `describeFilters`), never chips beside the period
bar: chips pushed the header out of shape. The sentence is **its own row under the period and filter buttons**
(placed right after `PageHeader`; the user, 29 Oct 2026: "below the filters, not above them"), and the subtitle
says what the page is about. `PageHeader` wraps its actions under the title rather than cutting the
title. **Help shows the colours it means** (`helpLegend`: `StandingLegend` draws the target-so-far scale with its
cut points, the states as tags, the week squares).

### Cards link with an arrow, never as a whole

A figure's card opens the rows it counts through **an arrow at its top right** (`OpenLink` in
`components/dashboard/insights/parts.tsx`, `KpiCard`'s `href` and `openLabel`, labelled "Open the loans disbursed"),
NICE's pattern; the card itself is not a link (the user, 10 Nov 2026). The arrow **shows when the card is pointed
at** or the link has the keyboard's focus (always on touch screens): a row of cards must not read as a row of arrows. The link carries the page's period and place
as the target list's own URL filters, so the list shows exactly the rows counted (docs: letshego-laravel
`docs/dashboards.md` "Cards open their rows").

## 17. Exports and printing

Every way out of the dashboard (the user, 28 Oct 2026: "Excel, PDF ... mind scalability"; SDS's pattern):

- **A list**: the table's Export (`exportAll`) opens `ExportDialog`, which walks every page matching the list's
  filters (100 at a time, its progress shown), then writes **Excel, CSV or PDF** from those same rows and columns.
- **A page of charts and cards** (Overview, Why & why not): `ReportExport` in the header gathers the page's figures
  (`collect`, walking pages where they are paged), then **Excel** writes one workbook, a sheet per card
  (`writeWorkbook`), and **PDF** one document, each chart lifted as drawn (`chartToPrintSvg`, Highcharts'
  `getSVG` with the PNG export's own options) then its table. A card ties to its chart by its title
  (`data-chart-card`).
- **PDF is the browser's**: `printDocument` renders the document to a string (`renderToStaticMarkup`) and prints it
  from an off-screen iframe with its own stylesheet (`components/dashboard/print`): the letterhead and footer on
  every sheet, landscape for wide tables, and the tab renamed so Save as PDF names the file after the report. No
  PDF engine in the bundle: every browser the office uses offers Save as PDF, and the iframe means printing never
  prints the page around it (SDS printed the app twice before moving to it).
- **A map**: its Print button opens a print page that draws the same map at A4 (`app/print/map`,
  `app/print/field-map`) and prints once the tiles are in.

## Checking it

Browser checks in `e2e/`: [e2e-testing.md](e2e-testing.md).
