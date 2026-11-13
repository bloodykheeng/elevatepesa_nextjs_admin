import { test, expect } from "@playwright/test";
import { signInThroughPage } from "../helpers/signIn";
import { PASSWORD } from "../helpers/accounts";
import { openFromSidebar } from "../helpers/nav";

/**
 * Loans › Loan calculator (docs/loan-applications.md "The calculator"): a seeded product, an amount and a period
 * give the instalment, the totals and the schedule month by month; a range the product does not lend is said;
 * the (i) explains it; a sales agent opens it too.
 */

async function choose(page: import("@playwright/test").Page, id: string, option: string) {
  await page.locator(".p-dropdown", { has: page.locator(`#${id}`) }).click();
  await page.locator(".p-dropdown-panel .p-dropdown-item", { hasText: option }).first().click();
}

test("tries a loan: the instalment, the totals and each month", async ({ page }) => {
  await page.goto("/dashboard");
  await openFromSidebar(page, null, "Loan calculator");
  await expect(page.getByRole("heading", { name: "Loan calculator" })).toBeVisible({ timeout: 60_000 });

  // The worked example of the (i): UGX 2,000,000 over 12 months at 2.8% a month.
  await choose(page, "calc-product", "Agri Asset Loan");
  await page.locator("#calc-amount").fill("2000000");
  await page.locator("#calc-months").fill("12");
  await page.locator("#calc-months").blur();
  await expect(page.getByLabel("Monthly instalment")).toHaveText("UGX 198,600");
  await expect(page.getByText("Repaid in all")).toBeVisible();
  await expect(page.getByText("UGX 2,382,258")).toBeVisible();
  await expect(page.getByText("UGX 382,258")).toBeVisible();

  // Month by month: the first month's interest and what is left, then the twelfth pays it off.
  await expect(page.getByRole("row", { name: /^1 UGX 198,600 UGX 56,000 UGX 142,600 UGX 1,857,400/ })).toBeVisible();
  await expect(page.getByRole("row", { name: /^12 UGX 197,658 .* UGX 0$/ })).toBeVisible();

  // Affordability, when income and expenses are given.
  await page.locator("#calc-income").fill("900000");
  await page.locator("#calc-expenses").fill("500000");
  await page.locator("#calc-expenses").blur();
  await expect(page.getByText("50% of free income ✓")).toBeVisible();

  // An amount the product does not lend says so, and nothing is worked out.
  await page.locator("#calc-amount").fill("20000000");
  await page.locator("#calc-amount").blur();
  await expect(page.getByText("Agri Asset Loan lends UGX 500,000 to UGX 10,000,000.")).toBeVisible();
  await expect(page.getByLabel("Monthly instalment")).toHaveCount(0);

  // The (i): how it works, the formula, an example.
  await page.getByRole("button", { name: "How Loan calculator works" }).click();
  await expect(page.getByText(/The formula \(reducing balance\)/)).toBeVisible();
  await expect(page.getByText("56,000 ÷ 0.2821 = 198,533, rounded up: UGX 198,600 a month")).toBeVisible();
});

test("a sales agent opens the calculator too", async ({ browser }) => {
  const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  const page = await context.newPage();
  await signInThroughPage(page, "sarah@letshego.test", PASSWORD);
  await page.goto("/dashboard/loan-calculator");
  await expect(page.getByRole("heading", { name: "Loan calculator" })).toBeVisible({ timeout: 60_000 });
  await choose(page, "calc-product", "Agri Asset Loan");
  await expect(page.getByText("6 to 18 months")).toBeVisible();
  await context.close();
});
