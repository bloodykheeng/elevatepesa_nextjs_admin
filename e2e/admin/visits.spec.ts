import { test, expect, type Locator, type Page } from "@playwright/test";
import { openFromSidebar } from "../helpers/nav";
import { signInThroughPage } from "../helpers/signIn";
import { ADMIN_EMAIL, BRANCH_MANAGER_EMAIL, PASSWORD } from "../helpers/accounts";
import { closeOpenVisitsOf, createThrowawayLead } from "../helpers/laravel";

/**
 * Visits and KYC (docs/visits-and-kyc.md). The System Admin (who holds every permission) does what a
 * relationship officer does on the phone: from 1.4 km away the check-in is refused and says how far;
 * from the stall (the browser's GPS, 5 m off) it is taken, the record shows Visit in progress, the
 * client KYC is filled in two sections and completed, and the check-out must say KYC completed. The
 * visit's link opens the Client KYC list narrowed to it, with the context bar.
 * The lead is a throwaway (`E2E Lead …`), removed with its visits and KYC by `e2e:cleanup`. The branch
 * manager reads Field › Visits and Refused check-ins (folded under Visits in the sidebar) with the
 * seeded visit and refused check-in (VisitsSeeder), and sees the plan's Visited figure.
 */

const LEAD = { latitude: 0.3598, longitude: 32.6131 };
// A 1×1 PNG: the API checks what a photo is from its content.
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=", "base64");
const photo = (name: string) => ({ name, mimeType: "image/png", buffer: PNG });

async function choose(page: Page, scope: Locator, id: string, option: string) {
  await scope.locator(".p-dropdown", { has: page.locator(`#${id}`) }).click();
  await page.locator(".p-dropdown-panel .p-dropdown-item", { hasText: option }).first().click();
}

async function confirm(page: Page, text: RegExp | string, button = "Yes, save") {
  const dialog = page.getByRole("dialog", { name: /Confirm submission|Check in at/ }).last();
  await expect(dialog).toContainText(text);
  await dialog.getByRole("button", { name: button }).click();
}

test("an officer checks in at a lead, completes KYC in two sections and checks out", async ({ browser }) => {
  test.setTimeout(300_000);
  const stamp = Date.now();
  const name = `E2E Lead ${stamp}`;
  const id = createThrowawayLead(name, `25677${String(stamp).slice(-7)}`);
  closeOpenVisitsOf(ADMIN_EMAIL);

  const context = await browser.newContext({ storageState: "e2e/.auth/admin.json", permissions: ["geolocation"], geolocation: { latitude: LEAD.latitude + 0.0126, longitude: LEAD.longitude, accuracy: 8 } });
  const page = await context.newPage();

  // Field › Visits: Check in asks which lead, then shows its saved point on one map.
  await page.goto("/dashboard/visits");
  await page.getByRole("button", { name: "Check in" }).click();
  const pick = page.getByRole("dialog", { name: "Check in at a lead" });
  await pick.getByText("Choose a lead").click();
  await page.getByPlaceholder("Name, client number or phone").fill(name);
  await page.getByText(new RegExp(`${name} · CL`)).click();
  await expect(pick.getByRole("region", { name: "Where you are" })).toBeVisible();
  await expect(pick.locator(".leaflet-container")).toHaveCount(1);
  await pick.getByRole("button", { name: "Cancel" }).click();

  await page.goto(`/dashboard/pipeline/${id}`);
  await expect(page.getByRole("heading", { name: new RegExp(name) })).toBeVisible();

  // 1.4 km north: refused, recorded, and it says how far.
  await page.getByRole("button", { name: "Check in", exact: true }).click();
  const checkIn = page.getByRole("dialog", { name: `Check in at ${name}` });
  await checkIn.getByRole("button", { name: "Check in with my location" }).click();
  await confirm(page, "This browser's location is sent", "Check in");
  await expect(checkIn.getByRole("alert")).toContainText(`You are 1.4 km from ${name}'s saved location; check-in must be within 50 m.`);

  // At the stall: taken.
  await context.setGeolocation({ latitude: LEAD.latitude + 0.00005, longitude: LEAD.longitude, accuracy: 6 });
  await checkIn.getByRole("button", { name: "Check in with my location" }).click();
  await confirm(page, "This browser's location is sent", "Check in");
  await expect(page.getByText(`Checked in at ${name}, 6 m away.`)).toBeVisible({ timeout: 60_000 });
  const bar = page.getByRole("region", { name: "Visit in progress" });
  await expect(bar).toContainText("6 m from where");

  // The client KYC, in two sections, started from one place: the Client KYC tab's table (not the bar).
  await expect(bar.getByRole("button", { name: "Fill in KYC" })).toHaveCount(0);
  await page.getByRole("tab", { name: "Client KYC" }).click();
  const kycTable = page.getByRole("tabpanel");
  await kycTable.getByRole("button", { name: "Fill in KYC" }).click();
  const kyc = page.getByRole("dialog", { name: new RegExp(`Fill in client KYC · ${name}`) });
  await expect(kyc.getByRole("region", { name: "Personal details" })).toBeVisible();
  await kyc.getByRole("button", { name: "Complete KYC" }).click();
  await confirm(page, `the completed KYC for ${name}`);
  await expect(kyc.getByText("Choose their gender, as on the ID.")).toBeVisible();
  await expect(kyc.getByText("Take the photo of the front of the ID.")).toBeVisible();
  // What the client already holds is filled in: the name, the NIN and the phone.
  await expect(kyc.locator("#kyc-name")).toHaveValue(name);
  await expect(kyc.locator("#kyc-nin")).not.toHaveValue("");

  await choose(page, kyc, "kyc-gender", "Woman");
  await kyc.locator("#kyc-born").fill("12 Mar 1992");
  await kyc.locator(".p-dialog-header").dispatchEvent("mousedown");
  await kyc.locator(".p-dialog-header").dispatchEvent("click");
  await choose(page, kyc, "kyc-marital", "Married");
  await kyc.locator("#kyc-dependants").fill("3");
  await choose(page, kyc, "kyc-occupation", "Self-employed");
  await kyc.locator("#kyc-home").fill("Kiwatule, Nakawa");
  await kyc.getByLabel("ID front photo").setInputFiles(photo("front.png"));
  await kyc.getByLabel("ID back photo").setInputFiles(photo("back.png"));
  await kyc.getByLabel("Selfie photo").setInputFiles(photo("selfie.png"));
  // Each chosen photo shows before it is saved.
  await expect(kyc.locator("img[src^='blob:']")).toHaveCount(3);
  await kyc.locator("label[for='kyc-nira_checked']").click();

  // Saved as a draft and opened again: the photos show and the tick is kept.
  await kyc.getByRole("button", { name: "Save draft" }).click();
  await confirm(page, `the KYC draft for ${name}`);
  await expect(page.getByText("Saved. Carry on when ready.")).toBeVisible({ timeout: 60_000 });
  await expect(kyc).toBeHidden();
  // One exists now: the row's Edit, not a second Fill in KYC.
  await expect(kycTable.getByRole("button", { name: "Fill in KYC" })).toHaveCount(0);
  const kycRow = kycTable.getByRole("row", { name: /Draft/ });
  await kycRow.getByRole("button", { name: "Edit" }).click();
  await expect(kyc.locator("#kyc-nira_checked")).toBeChecked();
  await expect(kyc.locator("img[src^='blob:']")).toHaveCount(3, { timeout: 30_000 });
  await kyc.getByRole("button", { name: "Cancel" }).click();
  await kycRow.getByRole("button", { name: "Edit" }).click();
  await expect(kyc.locator("img[src^='blob:']")).toHaveCount(3, { timeout: 30_000 });

  await kyc.locator("label[for='kyc-phone_checked']").click();
  await kyc.getByRole("button", { name: "Complete KYC" }).click();
  await confirm(page, `the completed KYC for ${name}`);
  await expect(page.getByText(`KYC completed: ${name} is ready for the loan application.`)).toBeVisible({ timeout: 60_000 });
  await expect(kyc).toBeHidden();
  await expect(page.getByRole("heading", { name: new RegExp(name) })).toContainText("KYC completed");

  // Edited in place (one per client): it opens with every detail, photo and tick, and stays completed.
  await kycTable.getByRole("row", { name: /Current/ }).getByRole("button", { name: "Edit" }).click();
  const editKyc = page.getByRole("dialog", { name: new RegExp(`Edit client KYC · ${name}`) });
  await expect(editKyc.locator("#kyc-home")).toHaveValue("Kiwatule, Nakawa");
  await expect(editKyc.locator("#kyc-nira_checked")).toBeChecked();
  await expect(editKyc.locator("#kyc-phone_checked")).toBeChecked();
  await expect(editKyc.locator("img[src^='blob:']")).toHaveCount(3, { timeout: 30_000 });
  await expect(editKyc.getByRole("button", { name: "Save draft" })).toHaveCount(0);
  await editKyc.getByRole("button", { name: "Cancel" }).click();

  // Check-out: KYC completed is the only outcome now.
  await bar.getByRole("button", { name: "Check out" }).click();
  const out = page.getByRole("dialog", { name: `Check out of ${name}` });
  await expect(out.locator("#outcome-KYC\\ completed")).toBeChecked();
  await out.getByRole("button", { name: "Check out" }).click();
  await confirm(page, `the check-out of ${name}: KYC completed`);
  await expect(page.getByText(new RegExp(`Checked out of ${name}: \\d+ min\\.`))).toBeVisible({ timeout: 60_000 });
  await expect(bar).toBeHidden();

  // The record keeps it: the client KYC, with its checks.
  await page.getByRole("tab", { name: "Client KYC" }).click();
  await page.getByRole("row", { name: /Current/ }).getByRole("button", { name: "View details" }).click();
  await expect(page.getByRole("dialog", { name: /Client KYC · / })).toContainText("3 of 3 passed");
  await page.getByRole("dialog", { name: /Client KYC · / }).locator(".p-dialog-footer").getByRole("button", { name: "Close" }).click();

  // The visit, with its map and the links to what was done on it.
  await page.getByRole("tab", { name: "Visits" }).click();
  const visit = page.getByRole("row", { name: /KYC completed/ });
  await visit.getByRole("button", { name: "View details" }).click();
  const details = page.getByRole("dialog", { name: new RegExp(`Visit to ${name}`) });
  await expect(details).toContainText("6 m from the saved location");
  await expect(details).toContainText("Client KYC on this visitCompleted");
  await expect(details.locator(".leaflet-marker-icon")).toHaveCount(3);
  // Inside the client's record its links switch the record's tabs rather than leave it.
  await details.getByRole("navigation", { name: "Related records" }).getByRole("link", { name: "Client KYC" }).click();
  await expect(page).toHaveURL(new RegExp(`/dashboard/pipeline/${id}\\?tab=client-kyc`));
  await expect(page.getByRole("tab", { name: "Client KYC" })).toHaveAttribute("aria-selected", "true");

  // Off the record they open the lists: Field › Client KYC, narrowed to that visit.
  await page.goto(`/dashboard/visits?client=${id}`);
  await page.getByRole("row", { name: /KYC completed/ }).getByRole("button", { name: "View details" }).click();
  await page.getByRole("dialog", { name: new RegExp(`Visit to ${name}`) }).getByRole("navigation", { name: "Related records" }).getByRole("link", { name: "Client KYC" }).click();
  await expect(page).toHaveURL(/\/dashboard\/client-kyc\?client=.*visit=/);
  const narrowed = page.getByRole("region", { name: "What this list is narrowed to" });
  await expect(narrowed).toContainText(name);
  await expect(narrowed).toContainText("Visit");
  await expect(page.getByRole("row", { name: new RegExp(name) })).toHaveCount(1);
  await narrowed.getByRole("link", { name: "Visits" }).click();
  await expect(page).toHaveURL(/\/dashboard\/visits\?client=.*visit=/);
  await expect(page.getByRole("row", { name: /KYC completed/ })).toHaveCount(1);
  await narrowed.getByRole("button", { name: "Show all" }).click();
  await expect(narrowed).toBeHidden();
  await context.close();
});

test("a branch manager reads the visits, the refused check-ins and a plan's visited figure", async ({ browser }) => {
  const his = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  const page = await his.newPage();
  await signInThroughPage(page, BRANCH_MANAGER_EMAIL, PASSWORD);

  // Field work folds its lists in the sidebar.
  await openFromSidebar(page, "Field work", "Visits");
  await expect(page.getByRole("heading", { name: "Visits" })).toBeVisible();
  // The seeded visit (the dev database may hold newer ones at Peter's, made by hand).
  const visit = page.getByRole("row").filter({ hasText: "Peter Ssali" }).filter({ hasText: "Joel Mugisha" }).first();
  await expect(visit).toBeVisible();
  await expect(visit).toContainText("Needs more time");
  await visit.getByRole("button", { name: "View details" }).click();
  await expect(page.getByRole("dialog", { name: /Visit to Peter Ssali/ })).toContainText("Wants to agree the amount");
  await page.getByRole("dialog", { name: /Visit to Peter Ssali/ }).locator(".p-dialog-footer").getByRole("button", { name: "Close" }).click();

  await openFromSidebar(page, "Field work", "Refused check-ins");
  await expect(page).toHaveURL(/\/dashboard\/visits\/refused/);
  const refused = page.getByRole("row").filter({ hasText: "Peter Ssali" }).filter({ hasText: "Joel Mugisha" }).first();
  await expect(refused).toContainText("Too far");
  await expect(refused).toContainText("1.4 km");

  // Peter was visited yesterday, inside Kiwatule leads' days.
  await openFromSidebar(page, "Planning", "Journey plans");
  await page.getByRole("row", { name: /Kiwatule leads/ }).first().getByRole("button", { name: "View details" }).click();
  await expect(page.getByText(/checked in at by Joel Mugisha during the plan/)).toBeVisible();
  await expect(page.getByText(/^1 \/ 2$/)).toBeVisible();
  await his.close();
});
