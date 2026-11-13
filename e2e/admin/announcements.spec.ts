import { test, expect } from "@playwright/test";
import { signInThroughPage } from "../helpers/signIn";
import { BRANCH_MANAGER_EMAIL, PASSWORD } from "../helpers/accounts";
import { clearNotificationsFor } from "../helpers/laravel";

/**
 * Announcements: head office picks a person, sends, confirmed with how many it reaches; it goes
 * out (needs a queue worker) and lands in that person's bell; once they have seen it the sender
 * sees it read; deleting it takes it out again. Seeded accounts (UsersTableSeeder): Moses Okello, Kampala East's manager.
 */
test("sends an announcement to a chosen person, who finds it in the bell", async ({ page, browser }) => {
  const title = `Branch meeting ${Date.now()}`;
  // His bell holds only this one, so the read the spec waits for is this one.
  clearNotificationsFor(BRANCH_MANAGER_EMAIL);

  await page.goto("/dashboard/announcements");
  await expect(page.getByRole("heading", { name: "Announcements" })).toBeVisible();
  await page.getByRole("button", { name: "New announcement" }).click();

  const dialog = page.getByRole("dialog", { name: "New announcement" });
  await dialog.getByText("People I choose").click();
  // The picker (NICE's): narrowed by role, ticked in a table, added.
  await dialog.getByRole("button", { name: "Choose people" }).click();
  const picker = page.getByRole("dialog", { name: "Choose people" });
  await picker.getByLabel("Search people").fill("Moses");
  await picker.getByRole("button", { name: "Search" }).click();
  await picker.getByRole("row", { name: /Moses Okello/ }).getByRole("checkbox").first().click();
  await picker.getByRole("button", { name: "Add 1 person" }).click();
  await expect(dialog.getByRole("list", { name: "Chosen people" }).getByText("Moses Okello")).toBeVisible();
  await dialog.getByLabel("Title").fill(title);
  await dialog.getByLabel("Message").fill("Friday at 9, the branch office.");
  await expect(dialog.getByText("This reaches 1 person")).toBeVisible();

  await dialog.getByRole("button", { name: "Send" }).click();
  const confirm = page.getByRole("alertdialog").or(page.getByRole("dialog", { name: "Send this announcement now?" }));
  await expect(confirm.getByText(/It goes to 1 person by the bell/)).toBeVisible();
  await confirm.getByRole("button", { name: "Send" }).click();
  await expect(page.locator(".p-toast").getByText("Your announcement is on its way.")).toBeVisible();

  const row = page.getByRole("row", { name: new RegExp(title) });
  await expect(row.getByText("Sent", { exact: true })).toBeVisible({ timeout: 30_000 });
  await expect(row.getByText(/1 person, 0 read/)).toBeVisible();

  // Moses finds it in his bell.
  const his = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  const mosesPage = await his.newPage();
  await signInThroughPage(mosesPage, BRANCH_MANAGER_EMAIL, PASSWORD);
  // Read once it is in view: wait for that to reach the API before his browser closes.
  const marked = mosesPage.waitForResponse((r) => /\/notifications\/[^/]+\/read$/.test(r.url()) && r.ok());
  await mosesPage.getByRole("button", { name: /notifications$/i }).first().click();
  await expect(mosesPage.getByRole("dialog", { name: "Notifications" }).getByText(title)).toBeVisible();
  await marked;
  await his.close();

  // Seen in his bell is read: the sender sees it.
  await page.reload();
  await expect(row.getByText(/1 person, 1 read/)).toBeVisible({ timeout: 30_000 });
  await row.getByRole("button", { name: "View details" }).click();
  const details = page.getByRole("dialog", { name: title });
  await expect(details.getByText("have read it.")).toContainText("1 of 1");
  await details.getByRole("button", { name: "Close" }).first().click();

  // Deleting (tick, then Delete in the toolbar) takes it out of bells.
  await row.getByRole("checkbox").first().click();
  await page.getByRole("button", { name: "Delete (1)" }).click();
  await page.getByRole("button", { name: "Delete", exact: true }).last().click();
  await expect(page.getByText("Announcement deleted.")).toBeVisible();
  await expect(page.getByRole("row", { name: new RegExp(title) })).toHaveCount(0);
});
