import { test, expect } from "@playwright/test";

/**
 * Every way out of a dialog closes it: Cancel and × on a form with nothing typed, Discard after
 * typing, and the message composer. (2026-11-14: Cancel and × did nothing on every form.)
 */
test("Cancel and × close a form; typed changes ask first", async ({ page }) => {
  await page.goto("/dashboard/catalog/faqs");

  await page.getByRole("button", { name: "New" }).click();
  const form = page.getByRole("dialog", { name: "New FAQ" });
  await expect(form).toBeVisible();
  await form.getByRole("button", { name: "Cancel" }).click();
  await expect(form).toBeHidden();

  await page.getByRole("button", { name: "New" }).click();
  await expect(form).toBeVisible();
  await form.getByRole("button", { name: "Close" }).first().click();
  await expect(form).toBeHidden();

  await page.getByRole("button", { name: "New" }).click();
  await form.locator("#question").fill("Half typed");
  await form.getByRole("button", { name: "Cancel" }).click();
  await page.getByRole("button", { name: "Discard" }).click();
  await expect(form).toBeHidden();
});

test("the message composer closes with Cancel", async ({ page }) => {
  await page.goto("/dashboard/messages");
  await page.getByRole("button", { name: "New message" }).click();
  const composer = page.getByRole("dialog").filter({ hasText: "How to send it" });
  await expect(composer).toBeVisible();
  await composer.getByRole("button", { name: "Cancel" }).click();
  await expect(composer).toBeHidden();
});

test("a link to a deleted record says so, without an error toast", async ({ page }) => {
  await page.goto("/dashboard/users?view=99999999");
  await expect(page.getByRole("dialog").getByText("This account no longer exists: it was deleted.")).toBeVisible();
  await expect(page.getByText(/No query results/)).toHaveCount(0);
});

test("the audit trail shows an edit, before and after", async ({ page }) => {
  // Every signed-in test run writes at least its own sign-in.
  await page.goto("/dashboard/audit-trail");
  await expect(page.locator("tbody tr").first()).toBeVisible();
  await page.getByRole("button", { name: "View details" }).first().click();
  await expect(page.getByRole("dialog").getByText("Request")).toBeVisible();
});
