import { test, expect } from "@playwright/test";

/**
 * A full round on one simple table, with a row the test makes and removes itself: create (with the
 * Confirm submission step), find it by search, view, edit, delete (ticked, confirmed).
 */
test("a FAQ is created, found, edited and deleted", async ({ page }) => {
  const question = `E2E question ${Date.now()}`;
  await page.goto("/dashboard/catalog/faqs");

  await page.getByRole("button", { name: "New" }).click();
  const form = page.getByRole("dialog", { name: "New FAQ" });
  await form.locator("#question").fill(question);
  await form.locator("#answer").fill("An answer written by the browser test.");
  await form.getByRole("button", { name: "Create" }).click();
  await page.getByRole("button", { name: "Yes, save" }).click();
  await expect(page.getByText("FAQ created.")).toBeVisible();

  await page.getByRole("textbox", { name: "Search" }).fill(question);
  await page.getByRole("button", { name: "Search" }).click();
  const row = page.locator("tbody tr").filter({ hasText: question });
  await expect(row).toHaveCount(1);

  await row.getByRole("button", { name: "View details" }).click();
  await expect(page.getByRole("dialog").getByText("An answer written by the browser test.")).toBeVisible();
  await page.getByRole("dialog").getByRole("button", { name: "Edit" }).click();
  const edit = page.getByRole("dialog", { name: "Edit FAQ" });
  await edit.locator("#answer").fill("Edited by the browser test.");
  await edit.getByRole("button", { name: "Save" }).click();
  await page.getByRole("button", { name: "Yes, save" }).click();
  await expect(page.getByText("FAQ saved.")).toBeVisible();

  await row.locator("input[type=checkbox], .p-checkbox").first().click();
  await page.getByRole("button", { name: /Delete \(1\)/ }).click();
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(page.getByText("1 FAQ deleted.")).toBeVisible();
  await expect(page.locator("tbody tr").filter({ hasText: question })).toHaveCount(0);
});
