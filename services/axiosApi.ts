"use client";
import axios from "axios";
import Cookies from "js-cookie";
import { AUTH_TOKEN_COOKIE, AUTH_PROFILE_COOKIE } from "@/lib/authCookies";

const axiosAPI = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
  withCredentials: false,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// Read the token on every request instead of once at module load
axiosAPI.interceptors.request.use((config) => {
  const token = Cookies.get(AUTH_TOKEN_COOKIE);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Session helpers

const COOKIE_OPTS = {
  secure: process.env.NODE_ENV === "production",
  sameSite: "Strict" as const,
};

// Only the fields the middleware and UI shell actually need
export interface SlimProfile {
  id: number | string;
  name: string;
  role: string;
  email: string;
}

/** `days`: how long the browser keeps the session; the API's token expires on the same schedule. */
export function persistAuthSession(token: string, user: any, days = 1): void {
  // A single record comes back wrapped as { data: { … } }.
  const u = user?.data ?? user;
  const profile: SlimProfile = {
    id: u?.id ?? "",
    name: u?.name ?? "",
    role: u?.role ?? "",
    email: u?.email ?? "",
  };
  Cookies.set(AUTH_TOKEN_COOKIE, token, { ...COOKIE_OPTS, expires: days });
  Cookies.set(AUTH_PROFILE_COOKIE, JSON.stringify(profile), { ...COOKIE_OPTS, expires: days });
}

export function getStoredToken(): string | null {
  return Cookies.get(AUTH_TOKEN_COOKIE) ?? null;
}

export function getStoredUser(): SlimProfile | null {
  try {
    const raw = Cookies.get(AUTH_PROFILE_COOKIE);
    return raw ? (JSON.parse(raw) as SlimProfile) : null;
  } catch {
    return null;
  }
}

export function clearAuthCookies(): void {
  Cookies.remove(AUTH_TOKEN_COOKIE);
  Cookies.remove(AUTH_PROFILE_COOKIE);
}

export default axiosAPI;
