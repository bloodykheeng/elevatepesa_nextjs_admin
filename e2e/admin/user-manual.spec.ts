import { test, expect } from "@playwright/test";

/**
 * The user manual (docs/user-manual.md): the start page, a module's page from the side menu with
 * "On this page", and a search that opens the topic it found.
 */
test("opens a module from the menu and finds a topic by search", async ({ page }) => {
  await page.goto("/dashboard/user-manual");
  await expect(page.getByRole("heading", { name: "How Letshego Field Sales works" })).toBeVisible();

  const menu = page.getByRole("navigation", { name: "Manual" });
  await menu.getByRole("button", { name: "Client pipeline" }).click();
  await expect(page).toHaveURL(/m=pipeline/);
  await expect(page.getByRole("heading", { name: "Add a prospect" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "On this page" }).getByRole("button", { name: "Using the map" })).toBeVisible();

  await page.getByLabel("Search the manual").fill("satellite");
  const result = page.getByRole("button", { name: /Using the map/ });
  await expect(result).toContainText("Sales › Client pipeline");
  await result.click();
  await expect(page.getByRole("heading", { name: "Using the map" })).toBeInViewport();
});

test("a reload comes back to the same place on the page", async ({ page }) => {
  await page.goto("/dashboard/user-manual?m=pipeline");
  await expect(page.getByRole("heading", { name: "Add a prospect" })).toBeVisible();
  // The dashboard's scroll box: the page's one <main>.
  const main = page.getByRole("main");
  await main.evaluate((el) => el.scrollTo({ top: 700 }));
  await page.waitForTimeout(300);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Add a prospect" })).toBeAttached();
  await expect.poll(() => main.evaluate((el) => Math.round(el.scrollTop)), { timeout: 8000 }).toBeGreaterThan(650);
});
