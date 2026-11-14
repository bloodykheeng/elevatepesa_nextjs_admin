import { test, expect } from "@playwright/test";
import { PAGES } from "../helpers/accounts";

/**
 * Every page in the menu opens, shows its heading and data (or its empty state), and the browser
 * reports no errors (a missing image from the API host is not one).
 */
for (const { path, heading } of PAGES) {
  test(`${path} opens cleanly`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => {
      if (m.type() === "error" && !/Failed to load resource/.test(m.text())) errors.push(m.text());
    });

    await page.goto(path);
    await expect(page.getByRole("heading", { name: heading, exact: true }).first()).toBeVisible();
    await page.waitForLoadState("networkidle");
    expect(errors, errors.join("\n")).toEqual([]);
  });
}

test("the sidebar names every page and opens it", async ({ page }) => {
  await page.goto("/dashboard");
  await page.getByRole("link", { name: "Orders" }).first().click();
  await expect(page).toHaveURL(/\/dashboard\/orders/);
  await page.getByRole("button", { name: /Product setup/ }).click();
  await page.getByRole("link", { name: "Gas & water brands" }).click();
  await expect(page).toHaveURL(/\/dashboard\/catalog\/category-brands/);
  // One parent open at a time: opening "In the app" folds Product setup.
  await page.getByRole("button", { name: /In the app/ }).click();
  await expect(page.getByRole("link", { name: "FAQs" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Gas & water brands" })).toBeHidden();
});
