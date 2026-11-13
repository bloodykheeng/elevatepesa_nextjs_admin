/**
 * The session cookies' names, prefixed with the app. Cookies belong to a host, not a port, so
 * every app on `localhost` shares one cookie jar: with generic names one app reads another's
 * token, gets a 401 from its own API and signs the user out. Read and write the session only
 * through these.
 */
export const AUTH_TOKEN_COOKIE = "pesa_admin_access_token";
export const AUTH_PROFILE_COOKIE = "pesa_admin_profile";
