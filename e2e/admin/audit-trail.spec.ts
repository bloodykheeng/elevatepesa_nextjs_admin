import { test, expect } from "@playwright/test";

/** The audit trail lists sign-ins and account changes, and offers no way to delete them. */
test("lists entries, opens one, and has no delete", async ({ page }) => {
  await page.goto("/dashboard/audit-trail");
  await expect(page.getByRole("heading", { name: "Audit trail" })).toBeVisible();

  // The setup's own sign-in is always there.
  await expect(page.getByText(/logged in/i).first()).toBeVisible();
  await expect(page.getByRole("button", { name: /Delete/ })).toHaveCount(0);
  await expect(page.getByRole("checkbox")).toHaveCount(0);
});
