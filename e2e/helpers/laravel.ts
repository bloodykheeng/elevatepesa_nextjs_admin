import { execFileSync } from "node:child_process";
import path from "node:path";

/**
 * Reads from the local API what an email would carry (a sign-in or reset code). Local runs
 * only: it shells out to `php artisan tinker` in ../letshego-laravel, so never point it at a
 * shared server.
 */
const LARAVEL = process.env.E2E_LARAVEL_DIR ?? path.resolve(__dirname, "../../../letshego-laravel");

function tinker(code: string): string {
  return execFileSync("php", ["artisan", "tinker", `--execute=${code}`], { cwd: LARAVEL, encoding: "utf8" }).trim();
}

const safe = (email: string) => email.replace(/'/g, "");

function cachedCode(email: string, prefix: string): string {
  // String.raw keeps the PHP namespace backslashes (a template literal would drop them).
  const out = tinker(
    String.raw`$u = App\Models\User::where('email', '${safe(email)}')->first(); echo $u ? Illuminate\Support\Facades\Cache::get('${prefix}'.$u->id) : '';`,
  );
  const code = out.match(/\d{6}/)?.[0];
  if (!code) throw new Error(`No ${prefix} code found for ${email}: ${out}`);
  return code;
}

/** The sign-in code waiting for this account (AuthController keeps it in the cache, `login_otp_{id}`). */
export const signInCodeFor = (email: string) => cachedCode(email, "login_otp_");

/** The password-reset code waiting for this account (`pwreset_otp_{id}`). */
export const resetCodeFor = (email: string) => cachedCode(email, "pwreset_otp_");

/**
 * A throwaway Active account (`e2e-…@example.com`, removed by `php artisan e2e:cleanup` after
 * the run) with this password and role.
 */
export function createThrowawayUser(email: string, password: string, role = "Sales Agent"): void {
  tinker(
    String.raw`$u = App\Models\User::create(['name' => 'E2E Reset', 'email' => '${safe(email)}', 'password' => Illuminate\Support\Facades\Hash::make('${password.replace(/'/g, "")}'), 'status' => 'Active']); $u->assignRole('${role.replace(/'/g, "")}'); echo $u->id;`,
  );
}

/**
 * A throwaway prospect (`E2E Lead …`, removed with its lead by `php artisan e2e:cleanup`) on
 * Kiwatule market route with a pin, captured by the System Admin; its client number.
 */
export function createThrowawayProspect(name: string, phone: string): string {
  return tinker(
    String.raw`$r = App\Models\Route::where('name', 'Kiwatule market route')->firstOrFail(); $u = App\Models\User::where('email', 'kimerafarouk8@gmail.com')->firstOrFail(); $c = App\Models\Client::create(['name' => '${name.replace(/'/g, "")}', 'phone' => '${phone.replace(/\D/g, "")}', 'route_id' => $r->id, 'latitude' => 0.3598, 'longitude' => 32.6131, 'location_accuracy' => 5, 'location_name' => 'Kiwatule market, fruit section', 'status' => 'Active', 'captured_by' => $u->id, 'captured_at' => now(), 'created_by' => $u->id, 'updated_by' => $u->id]); $c->stageEvents()->create(['to_stage' => 'Prospect', 'user_id' => $u->id]); echo $c->client_number;`,
  ).split(/\s+/).pop() as string;
}

/** Removes every notice of this account, so a spec starts from an empty bell. */
export function clearNotificationsFor(email: string): void {
  tinker(String.raw`App\Models\User::where('email', '${safe(email)}')->first()?->notifications()->delete();`);
}

/**
 * A throwaway lead (`E2E Lead …`, removed with its visits and KYC by `php artisan e2e:cleanup`) on
 * Kiwatule market route: a prospect made a lead by the System Admin, its point at 0.3598, 32.6131
 * (Kiwatule market), with a NIN. Returns the client's id.
 */
export function createThrowawayLead(name: string, phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return tinker(
    String.raw`$r = App\Models\Route::where('name', 'Kiwatule market route')->firstOrFail(); $u = App\Models\User::where('email', 'kimerafarouk8@gmail.com')->firstOrFail(); $c = App\Models\Client::create(['name' => '${name.replace(/'/g, "")}', 'phone' => '${digits}', 'nin' => 'CF${digits.slice(-12).padStart(12, "0")}', 'route_id' => $r->id, 'latitude' => 0.3598, 'longitude' => 32.6131, 'location_accuracy' => 5, 'location_name' => 'Kiwatule market, fruit section', 'status' => 'Active', 'captured_by' => $u->id, 'captured_at' => now()->subDay(), 'created_by' => $u->id, 'updated_by' => $u->id]); $c->stageEvents()->create(['to_stage' => 'Prospect', 'user_id' => $u->id]); App\Models\LoanRequest::create(['client_id' => $c->id, 'amount' => 3000000, 'latitude' => 0.3598, 'longitude' => 32.6131, 'location_accuracy' => 5, 'location_name' => 'Kiwatule market, fruit section', 'raised_by' => $u->id, 'raised_at' => now(), 'created_by' => $u->id, 'updated_by' => $u->id]); $c->stageEvents()->create(['from_stage' => 'Prospect', 'to_stage' => 'Lead', 'user_id' => $u->id]); echo $c->id;`,
  ).split(/\s+/).pop() as string;
}

/**
 * A throwaway client past KYC (`E2E Lead …`, removed with its visits, KYC and loan applications by
 * `php artisan e2e:cleanup`): a lead as createThrowawayLead makes, visited an hour ago by the System Admin, with
 * a completed client KYC and its three photos (a 1×1 PNG each, on the private disk). Returns the client's id.
 */
export function createThrowawayKycClient(name: string, phone: string): string {
  const id = createThrowawayLead(name, phone);
  tinker(
    String.raw`$c = App\Models\Client::findOrFail('${id}'); $u = App\Models\User::where('email', 'kimerafarouk8@gmail.com')->firstOrFail(); $v = App\Models\Visit::create(['client_id' => $c->id, 'user_id' => $u->id, 'checked_in_at' => now()->subHour(), 'checkin_latitude' => 0.3598, 'checkin_longitude' => 32.6131, 'checkin_accuracy' => 5, 'checkin_distance_metres' => 4, 'radius_metres' => 50, 'checked_out_at' => now()->subMinutes(30), 'outcome' => 'KYC completed', 'created_by' => $u->id, 'updated_by' => $u->id]); $k = App\Models\ClientKyc::create(['client_id' => $c->id, 'visit_id' => $v->id, 'status' => 'Completed', 'full_name' => $c->name, 'gender' => 'Woman', 'date_of_birth' => '1990-01-01 00:00:00', 'marital_status' => 'Married', 'dependants' => 2, 'occupation' => 'Self-employed', 'home_place' => 'Kiwatule', 'nira_checked_by' => $u->id, 'nira_checked_at' => now(), 'phone_checked_by' => $u->id, 'phone_checked_at' => now(), 'checked_name' => $c->name, 'checked_phone' => $c->phone, 'checked_nin' => $c->nin, 'checks' => [], 'completed_at' => now()->subMinutes(40), 'completed_by' => $u->id, 'created_by' => $u->id, 'updated_by' => $u->id]); $png = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='); foreach (['ID front', 'ID back', 'Selfie'] as $kind) { $path = 'kyc/'.$c->id.'/'.Illuminate\Support\Str::ulid().'.png'; Illuminate\Support\Facades\Storage::disk('local')->put($path, $png); $k->photos()->create(['kind' => $kind, 'path' => $path, 'mime_type' => 'image/png', 'size' => strlen($png), 'uploaded_by' => $u->id]); } $c->stageEvents()->create(['from_stage' => 'Lead', 'to_stage' => 'KYC completed', 'user_id' => $u->id]); echo 'ok';`,
  );
  return id;
}

/** Closes any visit this account left open (a run that stopped half way), as signing out would. */
export function closeOpenVisitsOf(email: string): void {
  tinker(String.raw`$u = App\Models\User::where('email', '${safe(email)}')->first(); if ($u) { app(App\Services\VisitClosure::class)->closeFor($u); }`);
}
