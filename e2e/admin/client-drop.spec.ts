import { test, expect } from "@playwright/test";
import { createThrowawayProspect } from "../helpers/laravel";

/**
 * Drop and reopen (docs/leads.md; the user, 10 Nov 2026): the System Admin drops a prospect with a reason from
 * their record; the pipeline still lists them, tagged Dropped (Show: Not dropped hides them, Dropped finds them), then come back at Prospect on
 * Reopen. The prospect is a throwaway (`E2E Lead …`), removed with its drops by `e2e:cleanup`.
 */
test("the System Admin drops a prospect, finds them under Dropped, and reopens them", async ({ page }) => {
  const stamp = Date.now();
  const name = `E2E Lead ${stamp}`;
  createThrowawayProspect(name, `25676${String(stamp).slice(-7)}`);

  await page.goto(`/dashboard/pipeline?search=${encodeURIComponent(name)}`);
  const row = page.getByRole("row", { name: new RegExp(name) });
  await row.getByRole("button", { name: "View details" }).click();
  await expect(page.getByRole("heading", { name: new RegExp(name) })).toBeVisible();

  await page.getByRole("button", { name: "Drop", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: `Drop ${name}` });
  await dialog.getByRole("button", { name: "Drop", exact: true }).click();
  await expect(dialog.getByText("Pick why they are dropped.")).toBeVisible();
  await dialog.getByText("Other", { exact: true }).click();
  await dialog.getByRole("button", { name: "Drop", exact: true }).click();
  await expect(dialog.getByText("Say what the other reason is.")).toBeVisible();
  await dialog.getByText("Cannot be reached", { exact: true }).click();
  await dialog.locator("#drop-note").fill("Phone off for a week.");
  await dialog.getByRole("button", { name: "Drop", exact: true }).click();
  await page.getByRole("dialog", { name: `Drop ${name}?` }).getByRole("button", { name: "Drop", exact: true }).click();
  await expect(page.getByText(`${name} dropped.`)).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText(/Dropped at Prospect on .* by System Admin: Cannot be reached\. "Phone off for a week\."/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Make a lead" })).toHaveCount(0);

  // Still on the pipeline, tagged; Not dropped leaves them out, Dropped finds them.
  await page.goto(`/dashboard/pipeline?search=${encodeURIComponent(name)}`);
  await expect(row).toContainText("Dropped");
  await page.goto(`/dashboard/pipeline?search=${encodeURIComponent(name)}&show=Not%20dropped`);
  await expect(page.getByText("No client matches.")).toBeVisible();
  await page.goto(`/dashboard/pipeline?search=${encodeURIComponent(name)}&show=Dropped`);
  await expect(row).toContainText("Dropped");

  // They changed their mind.
  await row.getByRole("button", { name: "View details" }).click();
  await page.getByRole("button", { name: "Reopen" }).click();
  await page.getByRole("dialog", { name: `Reopen ${name}?` }).getByRole("button", { name: "Reopen" }).click();
  await expect(page.getByText(`${name} reopened, at Prospect.`)).toBeVisible({ timeout: 60_000 });
  await expect(page.getByRole("button", { name: "Make a lead" })).toBeVisible();
});
