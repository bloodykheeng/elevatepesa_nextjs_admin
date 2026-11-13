# Letshego Field Sales web

The dashboard for Letshego Uganda's branch managers and head office. Next.js 16.4 (App Router, Cache
Components), React 19.3, TanStack Query, PrimeReact 10, Tailwind 4, laravel-echo. Built on GiftNest's
foundation; the design is the prototype at https://letshego.vercel.app. The API is `letshego-laravel`.

## Setup

```bash
npm install
cp .env.example .env.local        # then set NEXTAUTH_SECRET to a long random string
npx playwright install chromium   # once, for the browser tests
npm run dev                       # http://localhost:3000, with the API's `composer dev` running
```

Google sign-in is off until `NEXT_PUBLIC_GOOGLE_SIGN_IN=true` and the Google OAuth client is set here
(`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`) and on the API (`GOOGLE_CLIENT_ID`). See `.env.example`.

## Checks (all must pass before a commit)

```bash
npx tsc --noEmit -p tsconfig.json
npx eslint app components lib services hooks
npm run build
npm run e2e                        # Playwright: both apps running, database seeded
```

## Docs

- [docs/dashboard-patterns.md](docs/dashboard-patterns.md): page access (Alpha's model), Cache Components,
  the brand themes, forms, lists, exports, filters.
- [docs/e2e-testing.md](docs/e2e-testing.md): the browser suite, its helpers and locator rules.
- [AGENTS.md](AGENTS.md): this Next.js differs from training data; read `node_modules/next/dist/docs/` first.
- `node scripts/build-prime-theme.mjs` regenerates the Letshego PrimeReact themes after a `primereact` upgrade.
