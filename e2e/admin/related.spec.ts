import { test, expect } from "@playwright/test";

/**
 * Related records open where you are (2026-11-14): a payment's eye opens the payment, its order opens over it, and
 * closing the top one goes back to the one under it. Plus the column toggle that crashed the Orders table.
 */
test("a payment opens itself, and its order opens over it", async ({ page }) => {
  await page.goto("/dashboard/payments");
  await page.getByRole("button", { name: "View details" }).first().click();
  const payment = page.getByRole("dialog").filter({ hasText: "Paid for" });
  await expect(payment).toBeVisible();
  await expect(page).toHaveURL(/\/dashboard\/payments\?.*view=/);
  await expect(payment.getByText("Transaction no.")).toBeVisible();

  await payment.getByRole("button", { name: "View the order" }).click();
  const order = page.getByRole("dialog").filter({ has: page.getByRole("heading", { name: "Items" }) });
  await expect(order).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(2);

  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(1);
  await expect(payment).toBeVisible();
});

test("an order's customer opens over the order", async ({ page }) => {
  await page.goto("/dashboard/orders");
  await page.getByRole("button", { name: "View details" }).first().click();
  const order = page.getByRole("dialog").first();
  await expect(order.getByRole("heading", { name: "Items" })).toBeVisible();
  await order.getByTitle("Open its details").first().click();
  await expect(page.getByRole("dialog")).toHaveCount(2);
  await expect(page.getByRole("dialog").last().getByText("Everything of theirs")).toBeVisible();
});

test("showing every column of Orders keeps the table whole", async ({ page }) => {
  const keyErrors: string[] = [];
  page.on("console", (m) => m.type() === "error" && /same key/.test(m.text()) && keyErrors.push(m.text()));
  await page.goto("/dashboard/orders");
  await expect(page.locator("tbody tr").first()).toBeVisible();
  await page.getByRole("button", { name: "Column visibility" }).click();
  await page.getByText("Select all").click();
  await page.keyboard.press("Escape");
  await expect(page.locator("thead").getByText("Created", { exact: true })).toHaveCount(0);
  await expect(page.locator("thead").getByText("Placed")).toBeVisible();
  expect(keyErrors).toEqual([]);
});

test("a dashboard figure says how it is worked out", async ({ page }) => {
  await page.goto("/dashboard");
  await page.getByRole("button", { name: "Order value" }).click();
  await expect(page.getByText("What the period's orders were charged")).toBeVisible();
  await page.getByRole("button", { name: /Filters/ }).click();
  await expect(page.getByRole("dialog", { name: "Filter the dashboard" })).toBeVisible();
});
