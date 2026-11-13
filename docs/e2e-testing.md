# Testing the screens in a real browser (Playwright)

Type checks and lint prove the code compiles, but not that a form refuses bad input or that a person can
actually sign in. Those are checked in a real Chromium with **Playwright**, the end-to-end tool Next.js
recommends (`node_modules/next/dist/docs/01-app/02-guides/testing/playwright.md`).

## Run it

1. The local database seeded (`php artisan migrate:fresh --seed` in `letshego-laravel`), **before** starting
   the API: rebuilding it under a running queue worker kills the worker.
2. Start the API and the web app: `composer dev` in `letshego-laravel`, `npm run dev` here. Mailpit running
   (Laragon) so the codes go out; the specs read them from the cache, not the inbox.
3. Run:

```bash
npm run e2e                                    # every spec, headless
npm run e2e:ui                                 # Playwright's UI
npx playwright test e2e/admin/users-create.spec.ts
npx playwright show-trace test-results/<test>/trace.zip
```

**Browser.** `npx playwright install chromium` once.

## How it is laid out

| Path | What |
| --- | --- |
| [playwright.config.ts](../playwright.config.ts) | One worker, 180 s per test (a route's first visit in `next dev` compiles it), trace and screenshot on failure |
| [e2e/auth.setup.ts](../e2e/auth.setup.ts) | Signs the admin in through the API once, both steps (password, then the code read from the cache), and saves the session as the app keeps it: cookies `letshego_access_token` and `letshego_profile` |
| `e2e/admin/*.spec.ts` | Signed in as the seeded System Admin (`e2e/helpers/accounts.ts`): logout, users-create, locations, pipeline (clients: capture with a pin and an email, correct, retire), leads (make a throwaway `E2E Lead …` prospect a lead, which saves their loan request; the record's Loan request card and its View; correct the loan request; Sales › Loan requests; `e2e:cleanup` removes it), journey-plans (a branch manager opens the demo plan, its leads in order, numbered pins and the dashed line, and a lead's record names the plan; the admin gives a plan through the Add leads picker, checks the list's buttons never submit the form, removes and re-picks a lead, deletes the plan), visits (the admin opens Check in from Field › Visits and picks a lead (one map); with the browser's location set by Playwright, is refused 1.4 km away, checks in at a throwaway lead, completes the client KYC in its two sections with three photos, checks out with KYC completed, reads the Client KYC tab and the visit's details, and follows its link to Field › Client KYC narrowed to the visit (the context bar) and on to Visits; the branch manager opens Field › Visits › All visits and Refused check-ins from the folding sidebar, and a plan's Visited figure), prospect-targets (a branch manager's figures, one target's map, popup and route filter; the admin gives, overlaps, edits, deletes), loans (a throwaway client past KYC: the admin checks in, takes the loan application in its four sections (an empty submit names what is missing; the instalment and its share of free income as typed), submits it, is told someone else must decide what they made, checks out with Loan application sent; the branch manager, in a fresh context, finds it in Approvals, approves it and records the disbursement, and the client shows Client; the admin reads Loan products and the loan approval workflow's steps), user-manual (search, scroll memory on reload), audit-trail and notifications (need a queue worker and Reverb), announcements (needs a fresh queue worker). `composer dev` runs both; with only `serve` up those three fail on pending jobs |
| `e2e/guest/*.spec.ts` | No session: login, forgot-password |
| [e2e/helpers/signIn.ts](../e2e/helpers/signIn.ts) | `signInThroughPage()` (both steps through the page), `typeCode()` |
| [e2e/helpers/laravel.ts](../e2e/helpers/laravel.ts) | `signInCodeFor()`, `resetCodeFor()` (the cache through `php artisan tinker`), `createThrowawayUser()`, `createThrowawayProspect()`, `createThrowawayLead()`, `createThrowawayKycClient()` (a lead past KYC: a visit, a completed client KYC and its three photos), `closeOpenVisitsOf()`, `clearNotificationsFor()` |
| `e2e/.auth/`, `test-results/` | Saved sessions and run output: git-ignored |

Accounts and password come from `UsersTableSeeder`; override with `E2E_ADMIN_EMAIL`, `E2E_PASSWORD`.

**Codes from emails.** The helpers read `login_otp_{id}` and `pwreset_otp_{id}` from the API's cache. Local
runs only. Read a code only once the page shows the code step: until the API answers, nothing is cached.

**Throwaway accounts are removed after every run.** [e2e/global-teardown.ts](../e2e/global-teardown.ts) runs
`php artisan e2e:cleanup`, which deletes `e2e-%@example.com` accounts, `E2E Lead …` clients with their loan request, visits, KYC and loan applications (and their approvals), and `E2E plan …` plans a failed run left behind, and refuses in production.

## Locators

- **Role locators or `:visible`, never a bare `getByLabel`.** With Cache Components a page you left stays
  mounted but hidden (`<Activity>`): after "Forgot?" the sign-in form is still in the DOM, and `getByLabel`
  finds both. `getByRole` skips hidden elements.
- **A password input has no ARIA role**: find it by id (`#password:visible`, `#user-password`).
- **`getByRole("alert")` needs a filter**: Next's route announcer is an empty alert on every page.
- **Restart the queue worker and Reverb after `migrate:fresh`**: dropping the tables stops a running worker (or leaves it half working) and the notifications spec then waits for a bell count that never comes.
- **A second person signs in in a fresh context**: `browser.newContext({ storageState: { cookies: [], origins: [] } })`; a bare `newContext()` in the admin project carries the admin's session, so the login page sends it straight to the dashboard.
- **PrimeReact InputNumber** takes the typed value when it loses focus: `press("Tab")` before reading what it changed.
- **PrimeReact Dropdown**: click its trigger button (named by its placeholder, "Choose a role") and pick
  from `.p-dropdown-panel .p-dropdown-item`; a hidden native `<select>` carries the same option names.

## Location in the browser

A check-in reads the browser's GPS. A spec sets it on its own context:
`browser.newContext({ storageState, permissions: ["geolocation"], geolocation: { latitude, longitude, accuracy } })`,
and moves with `context.setGeolocation(...)`. A file input hidden in its label takes `setInputFiles({ name,
mimeType, buffer })`; the API reads a photo's type from its content, so the buffer is a real (1×1) PNG.

## Slow saves locally

`php artisan serve` answers one request at a time on Windows, so a save can wait behind the list's own
requests. A toast that follows a save gets `{ timeout: 60_000 }`.

## reCAPTCHA off for the run

Google scores a Playwright browser as a bot, so with reCAPTCHA checked the sign-in specs fail at random and the
setup's direct API sign-in (no token) is refused outright. The API being tested runs with a blank
`RECAPTCHA_SECRET_KEY` (a developer machine's default: letshego-laravel docs/environment-setup.md §5); the gate
itself is held by the API's `RecaptchaTest`, with Google faked.
