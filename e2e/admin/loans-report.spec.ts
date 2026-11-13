import { test, expect } from "@playwright/test";
import { openFromSidebar } from "../helpers/nav";

/**
 * The Overview's cards open the rows they count (an arrow at the card's corner, never the whole card; the user,
 * 10 Nov 2026, as NICE's dashboard does), and Reports › Loans adds up the money with charts and an export
 * (docs/dashboards.md "Loans"). Read only: works on any seed.
 */
test("a card's arrow opens its list for the period, and the Loans report adds up the money", async ({ page }) => {
  await page.goto("/dashboard?period=quarter");
  await expect(page.getByText("Money in the period")).toBeVisible({ timeout: 60_000 });

  // The arrow, not the card: the visits card itself is no link.
  await expect(page.getByRole("link", { name: /^Visits/ })).toHaveCount(0);
  await page.getByRole("link", { name: "Open the loans disbursed" }).first().click();
  await expect(page).toHaveURL(/\/dashboard\/loan-applications\?.*status=Disbursed.*disbursed_from=/);
  await expect(page.getByText("Status: Disbursed")).toBeVisible();
  await expect(page.getByText(/^Disbursed: /)).toBeVisible();

  await page.goto("/dashboard?period=quarter");
  await page.getByRole("link", { name: "Open the visits" }).click();
  await expect(page).toHaveURL(/\/dashboard\/visits\?from=\d{4}-\d{2}-\d{2}&to=/);

  await page.goto("/dashboard");
  await openFromSidebar(page, "Reports", "Loans");
  await expect(page.getByRole("heading", { level: 1, name: /^Loans/ })).toBeVisible({ timeout: 60_000 });
  for (const card of ["Asked for", "Applied for", "Approved", "Disbursed", "Money over time", "By product", "By branch", "Officers"]) {
    await expect(page.getByText(card, { exact: true }).first()).toBeVisible();
  }
  // The loans behind the figures, each with its client.
  const table = page.getByRole("region", { name: "The loans" });
  await expect(table.getByRole("columnheader", { name: "Paid out" })).toBeVisible();
  await table.getByText("Asked for", { exact: true }).click();
  await expect(table.getByRole("columnheader", { name: "Stage now" })).toBeVisible();

  // The page's Export (the loans table has its own).
  await page.getByRole("button", { name: "Export", exact: true }).first().click();
  const report = page.getByRole("dialog", { name: "Export: Loans" });
  await expect(report).toContainText("5 parts", { timeout: 30_000 });
  const [file] = await Promise.all([page.waitForEvent("download"), report.getByRole("button", { name: "Excel" }).click()]);
  expect(file.suggestedFilename()).toMatch(/^Loans .*\.xlsx$/);
});

test("Why & why not opens the visits behind its figures, and a picked range shows as picked", async ({ page }) => {
  await page.goto("/dashboard/reports/why?period=quarter");
  await expect(page.getByRole("heading", { name: "Why & why not" })).toBeVisible({ timeout: 60_000 });
  await page.getByRole("link", { name: /visits ended not interested/ }).first().click();
  await expect(page).toHaveURL(/\/dashboard\/visits\?.*outcome=No\+longer\+interested/);

  await page.goto("/dashboard/reports/why");
  await page.getByRole("button", { name: "Pick days" }).click();
  await page.getByRole("button", { name: "Last 30 days" }).click();
  // The button now names the days: the page has them.
  await expect(page.locator(".insights-days").first()).toContainText(" to ");
  await page.locator(".insights-days").first().click();
  await expect(page.getByRole("button", { name: "Last 30 days" })).toHaveAttribute("aria-pressed", "true");
});
