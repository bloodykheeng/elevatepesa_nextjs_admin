import { test, expect } from "@playwright/test";

/**
 * Staff enter an order the app lost (New on Orders), pay part of it as an instalment from its details, delete that
 * payment (Admin), edit the whole order, and remove it. Pickers are searched like a person would; stock is left alone
 * (unticked) and everything the test made is deleted again.
 */
test("an order is entered, paid in part, corrected, edited and removed", async ({ page }) => {
  await page.goto("/dashboard/orders");
  await page.getByRole("button", { name: "New" }).click();
  const form = page.getByRole("dialog", { name: "New order" });

  await form.getByRole("button", { name: "Choose the customer" }).click();
  await page.getByPlaceholder("Name, phone or email").fill("a");
  const customer = page.locator("button").filter({ has: page.locator("span.wrap-break-word") }).first();
  const customerName = ((await customer.locator("span.wrap-break-word").first().textContent()) ?? "").trim();
  await customer.click();
  await expect(form.getByRole("button", { name: customerName })).toBeVisible();

  await form.locator("#address").fill("Entered by the browser test");
  await form.getByRole("button", { name: "Choose a product" }).click();
  await page.getByPlaceholder("Search products").fill("gas");
  await page.locator("button").filter({ has: page.locator("span.wrap-break-word") }).first().click();
  await expect(form.getByLabel("Price each")).not.toHaveValue("");
  await form.getByLabel("Quantity").fill("2");
  // The charge follows the items' total.
  await expect(form.locator("#charged_amount")).not.toHaveValue("UGX 0");
  await expect(form.getByText(/Charged: UGX [1-9]/)).toBeVisible();

  await form.locator("#stock").click();
  await form.getByRole("button", { name: "Enter order" }).click();
  await page.getByRole("button", { name: "Yes, save" }).click();
  const toast = page.getByText(/Order #[A-Z0-9]{10} entered for/);
  await expect(toast).toBeVisible();
  const number = ((await toast.textContent()) ?? "").match(/#([A-Z0-9]{10})/)![1];

  // Its details open next: pay part of it, an instalment.
  const details = page.getByRole("dialog", { name: `Order #${number}` });
  await expect(details.getByText("from the dashboard")).toBeVisible();
  await expect(details.getByText(/still owed/)).toBeVisible();
  await details.getByRole("button", { name: "Record a payment" }).click();
  const pay = page.getByRole("dialog", { name: `Record a payment for order #${number}` });
  await pay.locator("#amount").fill("1000");
  await pay.locator("span.p-dropdown-label").filter({ hasText: "Choose" }).click();
  await page.getByRole("option", { name: "Cash" }).click();
  await pay.getByRole("button", { name: "Record payment" }).click();
  await page.getByRole("button", { name: "Yes, save" }).click();
  await expect(page.getByText("Payment of 1,000 UGX recorded.")).toBeVisible();
  await expect(details.getByRole("button", { name: "Record another instalment" })).toBeVisible();

  // Delete it again (Admin): the balance comes back.
  await details.getByRole("button", { name: "Delete this payment" }).click();
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(page.getByText(/Payment of 1,000 UGX deleted/)).toBeVisible();
  await expect(details.getByRole("button", { name: "Record a payment" })).toBeVisible();

  // Edit is the whole order.
  await details.getByRole("button", { name: "Edit" }).click();
  const edit = page.getByRole("dialog", { name: `Edit order #${number}` });
  await expect(edit.locator("#address")).toHaveValue("Entered by the browser test");
  await edit.locator("#address").fill("Edited by the browser test");
  await edit.getByRole("button", { name: "Save" }).click();
  await page.getByRole("button", { name: "Yes, save" }).click();
  await expect(page.getByText(`Order #${number} saved.`)).toBeVisible();
  await expect(page.getByRole("dialog", { name: `Order #${number}` }).getByText("Edited by the browser test")).toBeVisible();
  await page.keyboard.press("Escape");

  await page.getByRole("textbox", { name: "Search" }).fill(number);
  await page.getByRole("button", { name: "Search" }).click();
  const row = page.locator("tbody tr").filter({ hasText: number });
  await expect(row).toHaveCount(1);
  await row.locator("input[type=checkbox], .p-checkbox").first().click();
  await page.getByRole("button", { name: /Delete \(1\)/ }).click();
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(page.getByText("1 order deleted.")).toBeVisible();
});
