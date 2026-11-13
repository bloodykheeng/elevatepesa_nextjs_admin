import { test, expect } from "@playwright/test";
import { ADMIN_EMAIL } from "../helpers/accounts";
import { clearNotificationsFor } from "../helpers/laravel";

/**
 * A test notice reaches the bell live, is read, found by search, archived and moved back. Needs a
 * queue worker (notices are queued) and Reverb (the live toast and count). Push to the browser is
 * not covered: a headless browser has no notification centre, so it is checked by hand
 * (docs/dashboard-patterns.md, "Notifications").
 */
test("sends a test, reads it in the bell, searches, archives it and moves it back", async ({ page }) => {
  clearNotificationsFor(ADMIN_EMAIL);

  await page.goto("/dashboard/notifications");
  await expect(page.getByRole("heading", { name: "Notifications" })).toBeVisible();
  await expect(page.getByText("No notifications yet.")).toBeVisible();

  await page.getByRole("button", { name: "Send me a test" }).click();
  await expect(page.locator(".p-toast").getByText("Test sent")).toBeVisible();

  // Arrives on the socket: a toast, the bell's count and the list, without a reload.
  await expect(page.locator(".p-toast").getByText("Test notification")).toBeVisible();
  const bell = page.getByRole("button", { name: "1 unread notifications" });
  await expect(bell).toBeVisible();
  const row = page.getByRole("row", { name: /Notifications reach you here/ });
  await expect(row.getByText("Unread", { exact: true })).toBeVisible();

  // Seen in the bell is read.
  await bell.click();
  const panel = page.getByRole("dialog", { name: "Notifications" });
  await expect(panel.getByText("Test notification")).toBeVisible();
  await expect(page.getByRole("button", { name: "Notifications", exact: true })).toBeVisible();
  await page.getByRole("heading", { name: "Notifications" }).click();
  await expect(panel).toBeHidden();
  await expect(row.getByText("Read", { exact: true })).toBeVisible();

  // Search: a word in the message finds it, another does not.
  await page.getByLabel("Search notifications").fill("nothing like this");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page.getByText("No notice matches.")).toBeVisible();
  await page.getByLabel("Search notifications").fill("reach you");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(row).toBeVisible();

  // Archive keeps it: out of the list, in Archived, and back again.
  await row.getByRole("button", { name: "Archive" }).click();
  // Confirmed first, like every action that changes something.
  await page.getByRole("alertdialog").or(page.getByRole("dialog", { name: "Archive this notice?" })).getByRole("button", { name: "Archive" }).click();
  await expect(page.getByText("No notice matches.")).toBeVisible();
  await page.getByRole("radio", { name: "Archived" }).or(page.getByRole("button", { name: "Archived" })).first().click();
  await row.getByRole("button", { name: "Move back" }).click();
  await page.getByRole("alertdialog").or(page.getByRole("dialog", { name: "Move this back?" })).getByRole("button", { name: "Move back" }).click();
  await expect(page.getByText("Nothing archived.", { exact: false })).toBeVisible();
  await page.getByRole("radio", { name: "All" }).or(page.getByRole("button", { name: "All", exact: true })).first().click();
  await expect(row).toBeVisible();
});
