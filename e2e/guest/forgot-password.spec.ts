import { test, expect } from "@playwright/test";
import { createThrowawayUser, resetCodeFor } from "../helpers/laravel";
import { signInThroughPage } from "../helpers/signIn";

/**
 * Forgot password: a code by email, then a new password, which then signs in. A throwaway
 * account each run (removed by e2e:cleanup), so the seeded passwords never change.
 */
test("resets a forgotten password and signs in with the new one", async ({ page }) => {
  const email = `e2e-reset-${Date.now()}@example.com`;
  createThrowawayUser(email, "Old-password-1");

  await page.goto("/login");
  await page.getByRole("link", { name: "Forgot password?" }).click();
  await expect(page.getByRole("heading", { name: "Forgot your password?" })).toBeVisible();

  await page.getByRole("textbox", { name: "Username, email or phone" }).fill(email);
  await page.getByRole("button", { name: "Send reset code" }).click();

  // The code step appears once the API has answered, and only then is the code cached.
  const codeBox = page.getByRole("textbox", { name: "Reset code" });
  await expect(codeBox).toBeVisible();
  await codeBox.fill(resetCodeFor(email));
  await page.getByRole("button", { name: "Check code" }).click();

  await page.locator("#fp-password:visible").fill("New-password-2");
  await page.locator("#fp-password-confirmation:visible").fill("New-password-2");
  await page.getByRole("button", { name: "Save new password" }).click();

  await expect(page.getByText("Your password is reset")).toBeVisible();
  await expect(page).toHaveURL(/\/login$/, { timeout: 15_000 });

  await signInThroughPage(page, email, "New-password-2");
});

test("asking for a code says the same whether or not an account matches", async ({ page }) => {
  await page.goto("/forgot-password");
  await page.getByRole("textbox", { name: "Username, email or phone" }).fill("nobody-here@example.com");
  await page.getByRole("button", { name: "Send reset code" }).click();

  await expect(page.getByRole("textbox", { name: "Reset code" })).toBeVisible();
});
