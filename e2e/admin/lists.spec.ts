import { test, expect } from "@playwright/test";

test.describe("lists remember where you were", () => {
  test("page, search and the open record live in the address, and Back returns", async ({ page }) => {
    await page.goto("/dashboard/orders?page=3");
    const firstRow = page.locator("tbody tr").first();
    await expect(firstRow).toBeVisible();

    // Open the first order on page 3: its View dialog is part of the address.
    await page.getByRole("button", { name: "View details" }).first().click();
    await expect(page).toHaveURL(/view=\d+/);
    await expect(page.getByRole("dialog")).toBeVisible();

    // Close it, go elsewhere, come Back: still page 3.
    await page.keyboard.press("Escape");
    await expect(page).not.toHaveURL(/view=/);
    await page.goto("/dashboard/products");
    await page.goBack();
    await expect(page).toHaveURL(/page=3/);
  });

  test("a search narrows the list and a reload keeps it", async ({ page }) => {
    await page.goto("/dashboard/users");
    await page.getByRole("textbox", { name: "Search" }).fill("gmail");
    await page.getByRole("button", { name: "Search" }).click();
    await expect(page).toHaveURL(/search=gmail/);
    await page.reload();
    await expect(page.getByRole("textbox", { name: "Search" })).toHaveValue("gmail");
  });

  test("a dashboard figure opens the rows it counts", async ({ page }) => {
    await page.goto("/dashboard");
    await page.getByRole("heading", { name: "Dashboard" }).waitFor();
    await page.getByText("Balance due").first().hover();
    await page.getByRole("link", { name: "Open orders with a balance" }).click();
    await expect(page).toHaveURL(/\/dashboard\/orders\?.*has_balance=1/);
    await expect(page.getByText("Balance").first()).toBeVisible();
  });
});
