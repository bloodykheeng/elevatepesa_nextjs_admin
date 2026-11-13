# Browser tests (Playwright)

```bash
# the API on :8000 and `npm run dev` on :3000, both running
E2E_ADMIN_EMAIL=staff@example.com E2E_PASSWORD='...' E2E_CUSTOMER_EMAIL=customer@example.com npm run e2e
```

- `e2e/auth.setup.ts` signs the admin in through `/api/admin/auth/login` once and saves the cookies to
  `e2e/.auth/admin.json` (git-ignored); the `admin` project starts signed in.
- `e2e/guest/sign-in.spec.ts`: the redirect to /login, wrong password, empty fields, customers refused,
  signing in and out, the reset-password page's states, forgot password's single answer.
- `e2e/admin/pages.spec.ts`: every page in the menu opens with its heading and no browser errors.
- `e2e/admin/lists.spec.ts`: page and open record in the URL, Back returns, search survives a reload, a
  dashboard figure opens its rows.
- `e2e/admin/catalog.spec.ts`: a FAQ created, found, edited and deleted (the test cleans up after itself).

Accounts come from the environment only (`e2e/helpers/accounts.ts`), never from the code. Point
`E2E_BASE_URL` / `E2E_API_URL` elsewhere to run against another server; the catalog spec writes and deletes
one FAQ, so never point it at production.
