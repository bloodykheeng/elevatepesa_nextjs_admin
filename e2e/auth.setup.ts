import { test as setup, expect } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { ADMIN_EMAIL, PASSWORD, requireAdmin } from "./helpers/accounts";

/**
 * Signs the admin in through the API once and saves the session the way the app keeps it
 * (lib/authCookies.ts): the token cookie and the slim profile cookie. Admin specs start signed in.
 */
const API = process.env.E2E_API_URL ?? "http://127.0.0.1:8000/api";
const BASE = new URL(process.env.E2E_BASE_URL ?? "http://localhost:3000");

setup("sign in as admin", async ({ request, browser }) => {
  requireAdmin();
  const response = await request.post(`${API}/admin/auth/login`, { data: { email: ADMIN_EMAIL, password: PASSWORD }, headers: { Accept: "application/json" } });
  expect(response.ok(), `login answered ${response.status()}`).toBeTruthy();
  const { token, user } = await response.json();

  const context = await browser.newContext();
  const cookie = { domain: BASE.hostname, path: "/", sameSite: "Lax" as const };
  await context.addCookies([
    { ...cookie, name: "pesa_admin_access_token", value: token },
    { ...cookie, name: "pesa_admin_profile", value: encodeURIComponent(JSON.stringify({ id: user.id, name: user.name, role: user.role, email: user.email })) },
  ]);
  mkdirSync("e2e/.auth", { recursive: true });
  await context.storageState({ path: "e2e/.auth/admin.json" });
  await context.close();
});
