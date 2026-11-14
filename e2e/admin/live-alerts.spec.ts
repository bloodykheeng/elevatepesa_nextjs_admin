import { test, expect } from "@playwright/test";
import { execSync } from "node:child_process";
import path from "node:path";

/**
 * Live updates (pesa_back docs/realtime.md): a bell alert stored on the API reaches the open admin through Reverb, with
 * no reload and no polling; the bell fetches its list once, after the signal. Needs the local API's Reverb server
 * (`php artisan reverb:start`) and shells into ../pesa_back, so it is skipped against another API (E2E_API_URL).
 */
test("a bell alert arrives live, without polling", async ({ page }) => {
  test.skip(!!process.env.E2E_API_URL, "stores the alert through the local pesa_back");
  const sockets: string[] = [];
  page.on("websocket", (ws) => sockets.push(ws.url()));
  const apiCalls: string[] = [];
  page.on("request", (r) => { if (r.url().includes("/admin/inbox")) apiCalls.push(new Date().toISOString()); });

  await page.goto("/dashboard");
  await page.waitForLoadState("networkidle");
  await expect.poll(() => sockets.some((u) => u.includes(":8080/app/")), { timeout: 15000 }).toBe(true);
  await page.waitForTimeout(2000); // channels authorised
  const before = apiCalls.length;

  const title = `Live check ${Date.now()}`; // left in the local bell; harmless
  execSync(`php artisan tinker --execute="App\\Notifications\\StaffAlert::toStaff('order', '${title}', 'From the live probe.', '/dashboard/orders');"`, {
    cwd: path.resolve(__dirname, "../../../pesa_back"), stdio: "pipe",
  });

  await expect(page.getByText(title)).toBeVisible({ timeout: 10000 });
  // One fetch, because of the signal; none on a timer.
  expect(apiCalls.length - before).toBeLessThanOrEqual(2);
});
