import { test as setup, expect } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { signInCodeFor } from "./helpers/laravel";

/**
 * Signs each test account in through the API once (both steps: the password, then the code
 * from the cache) and saves the session the way the app keeps it (lib/authCookies.ts): the
 * token cookie and the slim profile cookie. Specs then start signed in. Seeded accounts
 * (UsersTableSeeder); override with env vars.
 */
const API = process.env.E2E_API_URL ?? "http://127.0.0.1:8000/api";
const BASE = new URL(process.env.E2E_BASE_URL ?? "http://localhost:3000");
import { ADMIN_EMAIL, PASSWORD } from "./helpers/accounts";

const ACCOUNTS = {
  admin: ADMIN_EMAIL,
};

for (const [who, email] of Object.entries(ACCOUNTS)) {
  setup(`sign in as ${who}`, async ({ request, browser }) => {
    const headers = { Accept: "application/json" };
    const step1 = await request.post(`${API}/v1/auth/login`, { data: { email, password: PASSWORD }, headers });
    expect(step1.ok(), `login for ${email} answered ${step1.status()}`).toBeTruthy();

    const response = await request.post(`${API}/v1/auth/login/verify`, {
      data: { email, otp: signInCodeFor(email), device_name: "e2e" },
      headers,
    });
    expect(response.ok(), `code for ${email} answered ${response.status()}`).toBeTruthy();
    const body = await response.json();
    const user = body.user?.data ?? body.user ?? {};
    const profile = { id: user.id ?? "", name: user.name ?? "", role: user.role ?? "", email: user.email ?? email };

    const context = await browser.newContext();
    const cookie = { domain: BASE.hostname, path: "/", sameSite: "Lax" as const };
    await context.addCookies([
      { ...cookie, name: "letshego_access_token", value: body.token },
      // js-cookie stores values URI-encoded.
      { ...cookie, name: "letshego_profile", value: encodeURIComponent(JSON.stringify(profile)) },
    ]);
    mkdirSync("e2e/.auth", { recursive: true });
    await context.storageState({ path: `e2e/.auth/${who}.json` });
    await context.close();
  });
}
