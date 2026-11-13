/**
 * The seeded accounts the browser tests sign in with (letshego-laravel UsersTableSeeder), in one
 * place. Override with E2E_ADMIN_EMAIL / E2E_PASSWORD when a database's passwords differ.
 */
export const PASSWORD = process.env.E2E_PASSWORD ?? "#@1letshego";
export const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? "kimerafarouk8@gmail.com";
export const BRANCH_MANAGER_EMAIL = "moses@letshego.test";
