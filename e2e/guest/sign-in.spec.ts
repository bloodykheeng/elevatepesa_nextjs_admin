import { test, expect } from "@playwright/test";
import { ADMIN_EMAIL, CUSTOMER_EMAIL, PASSWORD, requireAdmin } from "../helpers/accounts";

test.describe("signing in", () => {
  test("a page behind sign-in sends a visitor to /login", async ({ page }) => {
    await page.goto("/dashboard/orders");
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  });

  test("a wrong password says so without saying which part was wrong", async ({ page }) => {
    requireAdmin();
    await page.goto("/login");
    await page.locator("#email:visible").fill(ADMIN_EMAIL);
    await page.locator("#password:visible").fill("definitely-not-it");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page.getByRole("alert").filter({ hasText: "Wrong email or password." })).toBeVisible();
  });

  test("empty fields are explained before anything is sent", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page.getByText("Enter your email")).toBeVisible();
    await expect(page.getByText("Enter your password")).toBeVisible();
  });

  test("a customer account cannot open the dashboard", async ({ page }) => {
    test.skip(!CUSTOMER_EMAIL, "Set E2E_CUSTOMER_EMAIL to check this");
    await page.goto("/login");
    await page.locator("#email:visible").fill(CUSTOMER_EMAIL);
    await page.locator("#password:visible").fill(PASSWORD);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page.getByRole("alert").filter({ hasText: "Wrong email or password." })).toBeVisible();
  });

  test("staff sign in, land on the dashboard and sign out", async ({ page }) => {
    requireAdmin();
    await page.goto("/login");
    await page.locator("#email:visible").fill(ADMIN_EMAIL);
    await page.locator("#password:visible").fill(PASSWORD);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

    await page.getByRole("button", { name: "Account menu" }).click();
    await page.getByRole("button", { name: /Sign out/i }).click();
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe("reset password page", () => {
  test("without a code it explains and offers a new link", async ({ page }) => {
    await page.goto("/reset-password");
    await expect(page.getByText("This link is missing its reset code.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Ask for a new link" })).toBeVisible();
  });

  test("an expired code is refused with a way out", async ({ page }) => {
    await page.goto("/reset-password?token=not-a-real-token");
    await page.locator("#password:visible").fill("newpass123");
    await page.locator("#password_confirmation:visible").fill("newpass123");
    await page.getByRole("button", { name: "Save new password" }).click();
    await expect(page.getByText(/invalid or has expired/)).toBeVisible();
  });

  test("forgot password answers the same for any address", async ({ page }) => {
    await page.goto("/forgot-password");
    await page.locator("#email:visible").fill("nobody-here@example.com");
    await page.getByRole("button", { name: "Send reset link" }).click();
    await expect(page.getByText(/If that address belongs to a staff account/)).toBeVisible();
  });
});
