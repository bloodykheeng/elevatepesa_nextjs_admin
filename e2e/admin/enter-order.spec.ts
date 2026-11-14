import { test, expect } from "@playwright/test";

/**
 * Staff enter an order the app lost (New on Orders): pick a customer and a product from the searchable pickers, the
 * price fills itself in, the order is entered, its details open saying who entered it. The test leaves stock alone
 * (unticked) and deletes the order it made.
 */
test("an order is entered from the dashboard, then removed", async ({ page }) => {
  await page.goto("/dashboard/orders");
  await page.getByRole("button", { name: "New" }).click();
  const form = page.getByRole("dialog", { name: "New order" });

  await form.getByRole("button", { name: "Choose the customer" }).click();
  await page.getByPlaceholder("Name, phone or email").fill("a");
  const customer = page.locator("button").filter({ hasText: /\S/ }).locator("xpath=.").filter({ has: page.locator("span.wrap-break-word") }).first();
  const customerName = ((await customer.locator("span.wrap-break-word").first().textContent()) ?? "").trim();
  await customer.click();
  await expect(form.getByRole("button", { name: customerName })).toBeVisible();

  await form.locator("#address").fill("Entered by the browser test");

  await form.getByRole("button", { name: "Choose a product" }).click();
  await page.getByPlaceholder("Search products").fill("gas");
  const product = page.locator("button").filter({ has: page.locator("span.wrap-break-word") }).first();
  await product.click();
  // The price came from the product.
  await expect(form.getByLabel("Price each")).not.toHaveValue("");
  await form.getByLabel("Quantity").fill("2");

  await form.locator("#deduct_stock").click();
  await form.getByRole("button", { name: "Enter order" }).click();
  await page.getByRole("button", { name: "Yes, save" }).click();

  const toast = page.getByText(/Order #[A-Z0-9]{10} entered for/);
  await expect(toast).toBeVisible();
  const number = ((await toast.textContent()) ?? "").match(/#([A-Z0-9]{10})/)![1];

  // Its details open next, saying who entered it.
  const details = page.getByRole("dialog").filter({ hasText: "Entered by" });
  await expect(details.getByText("from the dashboard")).toBeVisible();
  await details.getByRole("button", { name: /Close/ }).first().click();

  await page.getByRole("textbox", { name: "Search" }).fill(number);
  await page.getByRole("button", { name: "Search" }).click();
  const row = page.locator("tbody tr").filter({ hasText: number });
  await expect(row).toHaveCount(1);
  await row.locator("input[type=checkbox], .p-checkbox").first().click();
  await page.getByRole("button", { name: /Delete \(1\)/ }).click();
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(page.getByText("1 order deleted.")).toBeVisible();
});
