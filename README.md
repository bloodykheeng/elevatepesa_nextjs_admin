# Elevate Pesa admin

The staff dashboard for Elevate Pesa (adb.elevatepesa.com): orders, packages, payments, the catalogue,
the app's content, customers and staff, messages to customers. Next.js 16.4 (App Router, Cache
Components), React 19.3, TanStack Query, PrimeReact 10 (Lara recoloured to emerald), Tailwind 4. Built on
the Letshego Field Sales foundation. The API is `pesa_back` (`/api/admin/*`, see its `docs/api-access.md`).

The mobile app does not use this repo or `/api/admin`; nothing here can break it.

## Setup

```bash
npm install
# .env.local (git-ignored)
#   NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000/api
#   NEXT_PUBLIC_ASSET_BASE_URL=http://127.0.0.1:8000
npx playwright install chromium   # once, for the browser tests
npm run dev                       # http://localhost:3000, with the API running on :8000
```

Sign in with a staff account (role Admin or Editor). Customers are refused.

## Checks (before a commit)

```bash
npx tsc --noEmit
npm run lint
E2E_ADMIN_EMAIL=... E2E_PASSWORD=... npm run e2e      # API and dev server running; see docs/e2e-testing.md
```

## Where things are

| Path | What |
| --- | --- |
| `app/(auth)/` | Sign in, forgot password, `/reset-password` (the mobile app opens this address: keep it) |
| `app/dashboard/` | One folder per page; `catalog/[resource]` serves the twelve simple tables from `catalog.tsx` |
| `components/dashboard/admin/` | The admin building blocks: `useAdminList`, `RecordForm`, `PaymentDialog`, `SendMessageDialog`, `PaymentsList`, pills and thumbnails |
| `components/dashboard/tables/PrimeReactDataTable.tsx` | The standard table (paging, sort, columns menu, export of every page, selection) |
| `lib/menuItems.ts` | The menu, and which role may open each page |
| `services/admin.ts`, `services/types/pesa.ts` | Every API call and its types |
| `docs/` | `dashboard-patterns.md` (how pages are built), `scroll-memory.md`, `user-manual.md`, `e2e-testing.md` |

The theme: `node scripts/build-prime-theme.mjs` regenerates `public/themes/lara-{light,dark}-pesa` after a
PrimeReact upgrade. Brand colours are the `--brand*` tokens in `app/globals.css`.

Deploying: the workspace's `docs/deployment.md` and `docs/redeployment.md`.
