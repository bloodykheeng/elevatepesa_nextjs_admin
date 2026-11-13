# Scroll memory

On a **reload**, or **Back / Forward**, the dashboard comes back to the same place on the same page, as GitHub
does. A link to a page starts at the top, as it should.

## Why the browser's own restoration is not enough

- It restores the **window**; the dashboard scrolls `<main>` (the shell is one viewport tall, `main` is the
  only thing that scrolls: DashboardLayout).
- It fires when the HTML is parsed, **before the list has loaded**, so there is nothing tall enough to scroll to.

## How it works ([hooks/useScrollMemory.ts](../hooks/useScrollMemory.ts))

- **Saved per URL**, path and query (a list's page, filters and search live in the query), in
  `sessionStorage` (`pesa-admin.scroll:<url>`), once a frame at most while the person scrolls. Per tab and gone
  when the tab closes, which is what a scroll position should be.
- **Restored only when coming back**: the page load was a `reload` or `back_forward`
  (`PerformanceNavigationTiming.type`), or a `popstate` inside the app. A fresh visit or a link starts at the top.
- **When the page is tall enough**: checked every 100 ms while the data arrives, for at most 8 seconds. (A
  `ResizeObserver` on `main`'s children missed pages whose nodes are replaced as they load, such as a prospect
  target's: it went on watching the old ones.) Nothing is saved while a restore waits, so the short page of the
  first moments cannot overwrite the place being restored.
- **Paging, filtering or sorting a list keeps the place**: `useListParams` pushes with `{ scroll: false }` (Next
  scrolls to the top on a push by default, which threw the reader off the list they were paging); so do the
  queue and location tabs.
- **The person wins**: wheel, touch, a key or a mouse press stops the restore.
- Mounted in DashboardLayout as `<ScrollMemory>` in its own `<Suspense>` (it reads the URL; see
  dashboard-patterns.md §2). The page's one `<main>` is the box: the user manual's content is an `<article>`.

## Testing

`e2e/admin/prospect-targets.spec.ts`, "paging a target's prospects keeps the place, and a reload comes back to
it": scrolls a target's page to the bottom, pages its prospects, reloads, and checks it is still down there.

`e2e/admin/user-manual.spec.ts`, "a reload comes back to the same place on the page": scrolls `main` to 700,
reloads, and waits for `scrollTop` to be back (about 2 seconds, once the profile and the content are in).
Locate the box with `getByRole("main")`: one `<main>` per page.

Sources: [next-scroll-restoration](https://github.com/javascripter/next-scroll-restoration) (per-URL positions
in sessionStorage, restored after content renders),
[react-server scroll restoration](https://react-server.dev/router/scroll-restoration) (restore on back/forward
and reload, top on new navigation),
[DEV: browser scroll restoration is broken on SPAs](https://dev.to/ktg0215/browser-scroll-restoration-is-broken-on-spas-heres-how-a-chrome-extension-fixes-it-578p)
(why the native one misses inner scroll containers and late content).
