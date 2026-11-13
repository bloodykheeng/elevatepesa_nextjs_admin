import { test, expect, type Locator, type Page } from "@playwright/test";
import { signInThroughPage } from "../helpers/signIn";
import { ADMIN_EMAIL, BRANCH_MANAGER_EMAIL, PASSWORD } from "../helpers/accounts";
import { closeOpenVisitsOf, createThrowawayKycClient } from "../helpers/laravel";

/**
 * Loan applications and their maker-checker approval (docs/loan-applications.md, docs/approvals.md). The
 * System Admin (who holds every permission) does what a relationship officer does: checks in at a client past
 * KYC, takes the loan application in its three sections from the Loan applications tab's table (its one
 * place), saves a draft and opens it again whole (photos and all), submits it, and is told they cannot decide
 * what they made; the visit must end Loan application sent. The branch manager finds it in Approvals,
 * approves it and records the disbursement with the loan system's application ID: the person becomes a Customer. The client is a throwaway (`E2E Lead …`), removed
 * with its visits, KYC and loan applications by `e2e:cleanup`.
 */

const CLIENT = { latitude: 0.3598, longitude: 32.6131 };
// A 1×1 PNG: the API checks what a photo is from its content.
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=", "base64");
const photo = (name: string) => ({ name, mimeType: "image/png", buffer: PNG });

async function choose(page: Page, scope: Locator, id: string, option: string) {
  await scope.locator(".p-dropdown", { has: page.locator(`#${id}`) }).click();
  await page.locator(".p-dropdown-panel .p-dropdown-item", { hasText: option }).first().click();
}

async function confirm(page: Page, text: RegExp | string, button = "Yes, save") {
  const dialog = page.getByRole("dialog", { name: /Confirm submission|Check in at|Approve\?/ }).last();
  await expect(dialog).toContainText(text);
  await dialog.getByRole("button", { name: button }).click();
}

test("an officer takes a loan application during a visit; a branch manager approves it and records the disbursement", async ({ browser }) => {
  test.setTimeout(300_000);
  const stamp = Date.now();
  const name = `E2E Lead ${stamp}`;
  const ref = `E2E-APP-${stamp}`;
  const id = createThrowawayKycClient(name, `25678${String(stamp).slice(-7)}`);
  closeOpenVisitsOf(ADMIN_EMAIL);

  const context = await browser.newContext({ storageState: "e2e/.auth/admin.json", permissions: ["geolocation"], geolocation: { latitude: CLIENT.latitude + 0.00004, longitude: CLIENT.longitude, accuracy: 6 } });
  const page = await context.newPage();

  // Past KYC: the record offers a check-in; the tab's Take loan application is greyed until then.
  await page.goto(`/dashboard/pipeline/${id}?tab=loan-applications`);
  await expect(page.getByRole("heading", { name: new RegExp(name) })).toContainText("KYC completed");
  const loansTab = page.getByRole("tabpanel");
  await expect(loansTab.getByRole("button", { name: "Take loan application" })).toBeDisabled();
  await page.getByRole("button", { name: "Check in", exact: true }).click();
  const checkIn = page.getByRole("dialog", { name: `Check in at ${name}` });
  await checkIn.getByRole("button", { name: "Check in with my location" }).click();
  await confirm(page, "This browser's location is sent", "Check in");
  await expect(page.getByText(new RegExp(`Checked in at ${name}, \\d+ m away\\.`))).toBeVisible({ timeout: 60_000 });

  // The application, in three sections; submitting with nothing names what is missing.
  await expect(page.getByRole("region", { name: "Visit in progress" }).getByRole("button", { name: "Loan application" })).toHaveCount(0);
  await loansTab.getByRole("button", { name: "Take loan application" }).click();
  const form = page.getByRole("dialog", { name: new RegExp(`Loan application · ${name}`) });
  await form.getByRole("button", { name: "Submit application" }).click();
  await confirm(page, "submitted for approval");
  await expect(form.getByText("Choose the product.")).toBeVisible({ timeout: 30_000 });
  await expect(form.getByText("Check them with the CRB, then record what you found.")).toBeVisible();
  // The loan system's ID is not the officer's: it is entered at disbursement.
  await expect(form.locator("#loan-ref")).toHaveCount(0);

  await choose(page, form, "loan-product", "MSE Business Loan");
  await form.locator("#loan-amount").fill("6000000");
  await form.locator("#loan-term").fill("18");
  await form.locator("#loan-term").press("Tab");
  await expect(form.getByLabel("Monthly instalment")).toHaveText("UGX 432,600");
  await choose(page, form, "loan-purpose", "Business equipment");
  await choose(page, form, "loan-income-source", "Business");
  await form.locator("#loan-income").fill("2400000");
  await form.locator("#loan-expenses").fill("1150000");
  await form.locator("#loan-expenses").press("Tab");
  await expect(form.getByText("35% of free income ✓")).toBeVisible();
  await form.getByRole("button", { name: "Add collateral" }).click();
  await form.locator("#loan-collateral-0").fill("Motorcycle UBF 412K");
  await form.locator("#loan-collateral-value-0").fill("6300000");
  await form.getByLabel("Proof of income photo").setInputFiles(photo("book.png"));
  await form.getByLabel("Premises photo").setInputFiles(photo("shop.png"));
  await form.getByLabel("Collateral photo").setInputFiles(photo("logbook.png"));
  await form.locator("label[for='loan-crb_consent']").click();
  await choose(page, form, "loan-crb", "Clear");
  // Saved as a draft and opened again from the row's Edit: every field and the photos come back.
  await form.getByRole("button", { name: "Save draft" }).click();
  await confirm(page, "as a draft");
  await expect(page.getByText("Saved. Carry on when ready.")).toBeVisible({ timeout: 60_000 });
  await expect(form).toBeHidden();
  await loansTab.getByRole("row", { name: /Draft/ }).getByRole("button", { name: "Edit" }).click();
  await expect(form.locator("#loan-collateral-0")).toHaveValue("Motorcycle UBF 412K", { timeout: 30_000 });
  await expect(form.locator("#loan-income")).toHaveValue("UGX 2,400,000");
  await expect(form.locator("#loan-crb_consent")).toBeChecked();
  await expect(form.locator("img[src^='blob:']")).toHaveCount(3, { timeout: 30_000 });
  await form.getByRole("button", { name: "Submit application" }).click();
  await confirm(page, "submitted for approval");
  await expect(page.getByText(`Submitted: ${name}'s loan application goes to step 1, Branch decision.`)).toBeVisible({ timeout: 60_000 });
  await expect(form).toBeHidden();

  // Maker-checker: the one who took it is told someone else decides it.
  await expect(loansTab.locator("tbody tr", { hasText: "Submitted" })).toContainText("No ID yet");
  // The eye reads what the page reads: the summary and the documents with their photos.
  await page.goto(`/dashboard/loan-applications?search=${encodeURIComponent(name)}`);
  await page.getByRole("row", { name: new RegExp(name) }).getByRole("button", { name: "View details" }).click();
  const view = page.getByRole("dialog", { name: `Loan application · ${name}` });
  await expect(view).toContainText("Summary for the decision", { timeout: 30_000 });
  await expect(view).toContainText("Required items · 7 of 7");
  await expect(view.locator("img[src^='blob:']")).toHaveCount(6, { timeout: 30_000 });
  // Six in two groups, so the count reads true: the application's three and the client KYC's three.
  await expect(view.getByRole("region", { name: "This application" }).locator("img[src^='blob:']")).toHaveCount(3);
  await expect(view.getByRole("region", { name: "From the client KYC" }).locator("img[src^='blob:']")).toHaveCount(3);
  await view.locator(".p-dialog-footer").getByRole("button", { name: "Close" }).click();
  await page.getByRole("row", { name: new RegExp(name) }).getByRole("button", { name: "Open the application" }).click();
  await expect(page.getByText("You took or edited this loan application, so someone else must decide it.")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("Required items · 7 of 7")).toBeVisible();

  // Approvals shows it to its maker too, in approval, though nothing waits for them (as Alpha does).
  await page.goto("/dashboard/approvals");
  await expect(page.getByRole("tab", { name: /Waiting for me/ })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("row", { name: new RegExp(name) })).toHaveCount(0);
  await page.getByRole("tab", { name: /^Submitted/ }).click();
  await expect(page.getByRole("row", { name: new RegExp(name) })).toBeVisible({ timeout: 30_000 });
  // Its dialog says why the decision is not theirs (Alpha's lock), in the one dialog that loaded in place.
  await page.getByRole("row", { name: new RegExp(name) }).getByRole("button", { name: "View details" }).click();
  const locked = page.getByRole("dialog", { name: new RegExp(`Loan application · ${name}`) });
  await expect(locked).toContainText("You cannot decide this step. You took or edited this loan application, so someone else must decide it.", { timeout: 30_000 });
  await expect(locked).toContainText("History");
  await locked.locator(".p-dialog-footer").getByRole("button", { name: "Close" }).click();
  await expect(locked).toBeHidden();

  // Opened from the client's record it stays under the client: the sidebar, the breadcrumb and Back.
  await page.goto(`/dashboard/pipeline/${id}?tab=loan-applications`);
  await page.getByRole("tabpanel").getByRole("row", { name: /Submitted/ }).getByRole("button", { name: "Open the application" }).click();
  await expect(page).toHaveURL(new RegExp(`/dashboard/pipeline/${id}/loan-applications/`));
  await expect(page.getByRole("navigation", { name: "Breadcrumb" })).toContainText(name);
  await page.getByRole("button", { name, exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/dashboard/pipeline/${id}\\?tab=loan-applications`));

  // The visit ends Loan application sent: the only outcome now.
  await page.goto(`/dashboard/pipeline/${id}`);
  await page.getByRole("region", { name: "Visit in progress" }).getByRole("button", { name: "Check out" }).click();
  const out = page.getByRole("dialog", { name: `Check out of ${name}` });
  await expect(out.locator("#outcome-Loan\\ application\\ sent")).toBeChecked();
  // Where you are, on the same map as the check-in.
  await expect(out.getByRole("region", { name: "Where you are" }).locator(".leaflet-container")).toHaveCount(1);
  await out.getByRole("button", { name: "Check out" }).click();
  await confirm(page, `the check-out of ${name}: Loan application sent`);
  await expect(page.getByText(new RegExp(`Checked out of ${name}: \\d+ min\\.`))).toBeVisible({ timeout: 60_000 });
  await context.close();

  // The branch manager: in their queue, approved, disbursed.
  const managerContext = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  const manager = await managerContext.newPage();
  await signInThroughPage(manager, BRANCH_MANAGER_EMAIL, PASSWORD);
  await manager.goto("/dashboard/approvals");
  await expect(manager.getByRole("heading", { name: "Approvals" })).toBeVisible();
  // Decided from the queue's dialog, as Alpha decides from its details dialog.
  await manager.getByRole("row", { name: new RegExp(name) }).getByRole("button", { name: "View details" }).click();
  const review = manager.getByRole("dialog", { name: new RegExp(`Loan application · ${name}`) });
  await expect(review.getByText("Your decision")).toBeVisible({ timeout: 30_000 });
  await review.locator("label", { has: manager.locator("#decision-Approved") }).click();
  await review.getByRole("button", { name: "Record decision: approve" }).click();
  await confirm(manager, "is told", "Yes, approve");
  await expect(manager.getByText(`Approved: ${name}. It can be disbursed.`)).toBeVisible({ timeout: 60_000 });
  await expect(review.getByText("Your decision")).toHaveCount(0);
  await review.locator(".p-dialog-footer").getByRole("button", { name: "Open the application" }).click();

  await manager.getByRole("button", { name: "Record disbursement" }).click();
  const disburse = manager.getByRole("dialog", { name: `Record disbursement · ${name}` });
  // The loan system's application ID, keyed in there, is entered here.
  await disburse.getByRole("button", { name: "Record disbursement" }).click();
  await expect(disburse.getByText("Enter the loan application ID from the loan system.")).toBeVisible();
  await disburse.locator("#loan-ref").fill(ref);
  await disburse.locator("#loan-account").fill("LA-E2E");
  await disburse.getByRole("button", { name: "Record disbursement" }).click();
  await confirm(manager, "the disbursement of UGX 6,000,000");
  await expect(manager.getByText(`Disbursed: ${name} is now a Letshego client.`)).toBeVisible({ timeout: 60_000 });
  await expect(manager.getByRole("heading", { level: 1 })).toContainText(ref);
  // The history is a thread: each step with who decided it.
  await expect(manager.getByText("Approved by Moses Okello")).toBeVisible();
  // The round keeps what it asked for, as the approver read it.
  const round = manager.locator("details:visible", { hasText: "What was submitted" });
  await round.locator("summary").click();
  await expect(round).toContainText("MSE Business Loan");
  await expect(round).toContainText("UGX 432,600 at 2.9% a month");

  // Back to Approvals: the dialog left as the page changed is gone, nothing blocks the page (it used to come back
  // half closed, deaf to Close, its mask over the sidebar), and the disbursed one is under Approved.
  await manager.getByRole("link", { name: "Approvals" }).last().click();
  await expect(manager).toHaveURL(/\/dashboard\/approvals/);
  await expect(manager.locator(".p-dialog-mask")).toHaveCount(0);
  await manager.getByRole("tab", { name: /^Approved/ }).click();
  await expect(manager.getByRole("row", { name: new RegExp(name) })).toContainText("Disbursed", { timeout: 30_000 });

  await manager.goto(`/dashboard/pipeline/${id}`);
  await expect(manager.getByRole("heading", { name: new RegExp(name) })).toContainText("Customer");
  await managerContext.close();
});

test("the System Admin reads the loan products and the loan approval workflow", async ({ page }) => {
  await page.goto("/dashboard/loan-products");
  await expect(page.getByRole("heading", { name: "Loan products" })).toBeVisible();
  const mse = page.getByRole("row", { name: /MSE Business Loan/ });
  await expect(mse).toContainText("6 to 24 months");
  await mse.getByRole("button", { name: "View details" }).click();
  await expect(page.getByRole("dialog", { name: "MSE Business Loan" })).toContainText("2.9%, reducing balance");
  await page.getByRole("dialog", { name: "MSE Business Loan" }).locator(".p-dialog-footer").getByRole("button", { name: "Close" }).click();
  // The repayment period is two month fields, explained by an (i) on the technical fields only.
  await mse.getByRole("button", { name: "Edit" }).click();
  const product = page.getByRole("dialog", { name: "Edit MSE Business Loan" });
  await expect(product.locator("#product-min-term")).toHaveValue("6 months");
  await expect(product.locator("#product-max-term")).toHaveValue("24 months");
  await product.getByRole("button", { name: "Repayment period" }).click();
  await expect(page.getByText("How many months the client has to repay the loan.")).toBeVisible();
  await expect(product.getByRole("button", { name: "Name" })).toHaveCount(0);
  await page.keyboard.press("Escape");
  await product.getByRole("button", { name: "Cancel" }).click();
  await expect(product).toBeHidden();

  await page.goto("/dashboard/approval-workflows");
  const loans = page.getByRole("row", { name: /Loan applications/ });
  // The steps read as a thread (number, name, role, which loans), not one run-on line.
  await expect(loans).toContainText("HQ credit decision");
  await expect(loans).toContainText("Decided by HQ Credit Approver");
  await expect(loans).toContainText("Above UGX 10,000,000");
  await loans.getByRole("button", { name: "Edit" }).click();
  const edit = page.getByRole("dialog", { name: /Edit Loan approval/ });
  // Alpha's step cards: each step edited where it stands.
  await expect(edit.locator("#step-0-name")).toHaveValue("Branch decision");
  await expect(edit.getByLabel("Step 1", { exact: true })).toContainText("Branch Manager");
  await expect(edit.locator("#step-0-above")).toHaveValue("");
  await expect(edit.locator("#step-1-name")).toHaveValue("HQ credit decision");
  await expect(edit.locator("#step-1-above")).toHaveValue("UGX 10,000,000");
  await edit.getByRole("button", { name: "Cancel" }).click();
  await expect(edit).toBeHidden();
});
