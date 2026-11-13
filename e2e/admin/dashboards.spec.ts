import { test, expect } from "@playwright/test";
import { signInThroughPage } from "../helpers/signIn";
import { BRANCH_MANAGER_EMAIL, PASSWORD } from "../helpers/accounts";
import { openFromSidebar } from "../helpers/nav";

/**
 * The dashboards and reports (docs/dashboards.md) on the default seed: the Overview's figures for the period
 * chosen, a card's own funnel, the Field map's trail (the seeded visit to Peter Ssali yesterday, its refused
 * check-in before it) with its people table and print, picking days, the exports, the reports, and a field
 * person seeing only their own figures.
 */

test("the System Admin reads the Overview for a period and narrows a card", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Sales overview" })).toBeVisible({ timeout: 60_000 });
  const figures = page.getByRole("region", { name: "Headline figures" });
  for (const label of ["Prospects", "Visits", "KYC completed", "Applications", "Approval rate", "Customers"]) {
    await expect(figures.getByText(label, { exact: true })).toBeVisible();
  }
  // The seeded prospects were captured this month: Year holds them too, and the URL keeps the choice.
  await page.getByRole("group", { name: "Period and place" }).getByText("Year", { exact: true }).click();
  await expect(page).toHaveURL(/period=year/);
  await expect(page.getByRole("region", { name: "Funnel" }).locator(".highcharts-container")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("region", { name: "Journey plans" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Needing attention" })).toBeVisible();

  // A card's funnel narrows that card alone, and says so on its face.
  await page.getByRole("region", { name: "Rhythm" }).getByRole("button", { name: "Narrow: Rhythm" }).click();
  const narrow = page.getByRole("dialog", { name: "Narrow: Rhythm" });
  await narrow.getByRole("button", { name: /Any territory/ }).click();
  await page.getByRole("button", { name: /Ntinda · Kiwatule/ }).first().click();
  await narrow.getByRole("button", { name: "Apply" }).click();
  await expect(page.getByRole("region", { name: "Rhythm" })).toContainText("narrowed to Ntinda · Kiwatule");
  await expect(page.getByRole("region", { name: "Funnel" })).not.toContainText("narrowed to");

  // The page's filters are said in one line under the title, not as chips beside the buttons.
  await page.getByRole("group", { name: "Period and place" }).getByRole("button", { name: /^Filters/ }).click();
  const place = page.getByRole("dialog", { name: "Filters" });
  await place.getByRole("button", { name: /Any territory/ }).click();
  await page.getByRole("button", { name: /Ntinda · Kiwatule/ }).first().click();
  await place.getByRole("button", { name: "Apply" }).click();
  await expect(page.getByText(/· Ntinda · Kiwatule/).first()).toBeVisible();
  await expect(page.getByRole("button", { name: /^Remove Territory/ })).toHaveCount(0);
  await page.getByRole("button", { name: "Clear filters" }).click();
  await expect(page).not.toHaveURL(/territory=/);
});

test("the Field map draws a person's visits in order, pages its people in the standard table, and prints", async ({ page, context }) => {
  await page.goto("/dashboard");
  await openFromSidebar(page, "Field work", "Field map");
  await expect(page.getByRole("heading", { name: "Field map" })).toBeVisible({ timeout: 60_000 });
  // A page that allows at most 31 days offers no Quarter or Year.
  const bar = page.getByRole("group", { name: "Period and place" });
  await expect(bar.getByText("Month", { exact: true })).toBeVisible();
  await expect(bar.getByText("Quarter", { exact: true })).toHaveCount(0);
  // The seeded visit was yesterday (Kampala): ask for exactly yesterday and today, whatever the month.
  const day = (offset: number) => new Date(Date.now() + offset * 86_400_000).toLocaleDateString("en-CA", { timeZone: "Africa/Kampala" });
  await page.goto(`/dashboard/field-map?from=${day(-1)}&to=${day(0)}`);
  const joel = page.getByRole("row", { name: /Joel Mugisha/ });
  await expect(joel).toBeVisible({ timeout: 30_000 });
  await joel.getByRole("button", { name: "Only them on the map" }).click();
  const map = page.getByRole("region", { name: "Map" });
  await expect(map.locator('[data-mark="visit"]').first()).toBeVisible();
  await expect(map.locator('[data-mark="refused"]').first()).toBeVisible();
  // One person's route is open, from its Start flag to its End.
  await expect(map.locator('[data-mark="start"]')).toHaveCount(1);
  await expect(map.locator('[data-mark="end"]')).toHaveCount(1);
  // Hiding a layer takes its marks away.
  await page.locator("label", { has: page.locator("#layer-refusals") }).click();
  await expect(map.locator('[data-mark="refused"]')).toHaveCount(0);
  // Folded, they are one flag and nothing else (NICE's): no steps, no End.
  await map.locator('[data-mark="start"]').click();
  await expect(map.locator('[data-mark="end"]')).toHaveCount(0);
  await expect(map.locator('[data-mark="visit"]')).toHaveCount(0);
  await expect(map.locator('[data-mark="start"]')).toHaveCount(1);

  // View: their records in the order they happened, the refused check-in before the visit.
  await joel.getByRole("button", { name: "View details" }).click();
  const records = page.getByRole("dialog", { name: /Joel Mugisha/ });
  // Numbered as on the map: every kind of step counts.
  await expect(records.getByRole("row").nth(1)).toContainText("1. Check-in refused");
  await expect(records.getByRole("row").nth(2)).toContainText("2. Check-in");
  await records.getByRole("button", { name: "Close" }).first().click();

  // Print opens the map on a sheet of its own, with each person's figures.
  const [sheet] = await Promise.all([context.waitForEvent("page"), map.getByRole("button", { name: "Print this map" }).click()]);
  await expect(sheet.getByRole("table")).toContainText("Joel Mugisha", { timeout: 30_000 });
  await sheet.close();
});

test("days are picked as a first and a last day, and every report exports", async ({ page }) => {
  await page.goto("/dashboard/reports/field-team");
  await expect(page.getByRole("heading", { name: "Field team" })).toBeVisible({ timeout: 60_000 });
  await page.getByRole("button", { name: "Pick days" }).click();
  const dialog = page.getByRole("dialog", { name: "Pick days" });
  // It opens on the page's days; cleared, the last day waits for the first, and Apply for both.
  await dialog.locator("#period-from").click();
  await page.locator(".p-datepicker:visible").getByRole("button", { name: "Clear" }).click();
  await expect(dialog.locator("#period-to")).toBeDisabled();
  await expect(dialog.getByRole("button", { name: "Apply" })).toBeDisabled();
  await dialog.getByRole("button", { name: "Last 7 days" }).click();
  await expect(page).toHaveURL(/from=\d{4}-\d{2}-\d{2}/);
  await expect(page).toHaveURL(/to=\d{4}-\d{2}-\d{2}/);
  await expect(page.getByRole("button", { name: /^Days: / })).toBeVisible();

  // A list's Export: Excel, CSV and PDF from the same rows.
  await page.getByRole("button", { name: "Export", exact: true }).click();
  const exportDialog = page.getByRole("dialog", { name: "Export" });
  await expect(exportDialog).toContainText("records ready", { timeout: 30_000 });
  for (const name of ["Excel", "CSV", "PDF"]) await expect(exportDialog.getByRole("button", { name })).toBeEnabled();
  await exportDialog.getByRole("button", { name: "Close" }).first().click();

  // A report of charts: its own Export, a sheet per card; and an (i) saying how it works.
  await page.goto("/dashboard/reports/why");
  await expect(page.getByRole("heading", { name: "Why & why not" })).toBeVisible({ timeout: 60_000 });
  await page.getByRole("button", { name: "How Why & why not works" }).click();
  await expect(page.getByText("Which product suits whom: by the occupation")).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Export", exact: true }).click();
  const report = page.getByRole("dialog", { name: "Export: Why & why not" });
  await expect(report).toContainText("7 parts", { timeout: 30_000 });
  const [file] = await Promise.all([page.waitForEvent("download"), report.getByRole("button", { name: "Excel" }).click()]);
  expect(file.suggestedFilename()).toMatch(/^Why and why not .*\.xlsx$/);
});

test("the reports: field team by state, journey plans, prospect targets, why and why not", async ({ page }) => {
  await page.goto("/dashboard");
  await openFromSidebar(page, "Reports", "Field team");
  await expect(page.getByRole("heading", { name: "Field team" })).toBeVisible({ timeout: 60_000 });
  await expect(page.getByRole("row", { name: /Sarah Nakato/ })).toBeVisible({ timeout: 30_000 });
  await page.getByRole("row", { name: /Sarah Nakato/ }).getByRole("button", { name: "View details" }).click();
  const sarah = page.getByRole("dialog", { name: "Sarah Nakato" });
  await expect(sarah).toContainText("Prospects");
  await expect(sarah.getByRole("button", { name: "On the field map" })).toBeVisible();
  await sarah.locator(".p-dialog-footer").getByRole("button", { name: "Close" }).click();
  // The state cards filter the list, and the URL keeps it.
  const states = page.getByRole("region", { name: "Where people stand" });
  await states.getByRole("button", { name: /Silent/ }).click();
  await expect(page).toHaveURL(/state=Silent/);

  await openFromSidebar(page, "Reports", "Journey plans");
  await expect(page.getByRole("heading", { name: "Journey plans report" })).toBeVisible({ timeout: 60_000 });
  await expect(page.getByRole("region", { name: "The plans in figures" })).toContainText("Leads planned");

  await openFromSidebar(page, "Reports", "Prospect targets");
  await expect(page.getByRole("heading", { name: "Prospect targets report" })).toBeVisible({ timeout: 60_000 });
  await expect(page.getByRole("region", { name: "The targets in figures" })).toContainText("Expected by now");

  await openFromSidebar(page, "Reports", "Why & why not");
  await expect(page.getByRole("heading", { name: "Why & why not" })).toBeVisible({ timeout: 60_000 });
  await expect(page.getByRole("region", { name: "Why they said no" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Which product suits whom" })).toBeVisible();
});

test("a branch manager sees their branch's overview", async ({ browser }) => {
  const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  const page = await context.newPage();
  await signInThroughPage(page, BRANCH_MANAGER_EMAIL, PASSWORD);
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Kampala East overview" })).toBeVisible({ timeout: 60_000 });
  // Head office compares branches; a branch manager has only theirs.
  await expect(page.getByRole("region", { name: "Branches" })).toHaveCount(0);
  await context.close();
});

test("a sales agent sees their own figures, and no reports", async ({ browser }) => {
  const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  const page = await context.newPage();
  await signInThroughPage(page, "sarah@letshego.test", PASSWORD);
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "My figures" })).toBeVisible({ timeout: 60_000 });
  await expect(page.getByRole("region", { name: "Needing attention" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Field team" })).toHaveCount(0);
  await context.close();
});
