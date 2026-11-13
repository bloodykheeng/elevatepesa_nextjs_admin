import type { AxiosResponse } from "axios";
import axiosAPI, { persistAuthSession, clearAuthCookies } from "../axiosApi";
import type { LoginPayload, LoginResponse, ProfileResponse, ResetPasswordPayload } from "../types/auth";

/** Staff sign-in. Customers are refused with the same message as a wrong password. */
export async function postToLogin(payload: LoginPayload): Promise<AxiosResponse<LoginResponse>> {
  const response = await axiosAPI.post<LoginResponse>("/admin/auth/login", payload);
  persistAuthSession(response.data.token, response.data.user, payload.remember ? 30 : 1);
  return response;
}

export async function postToLogout(): Promise<AxiosResponse<{ message: string }>> {
  const response = await axiosAPI.post<{ message: string }>("/admin/auth/logout");
  clearAuthCookies();
  return response;
}

export async function getAuthProfile(): Promise<AxiosResponse<ProfileResponse>> {
  return axiosAPI.get<ProfileResponse>("/admin/auth/me");
}

/** Emails a reset link to a staff address. Answers the same for any address. */
export async function postForgotPassword(email: string): Promise<AxiosResponse<{ message: string }>> {
  return axiosAPI.post<{ message: string }>("/admin/auth/forgot-password", { email });
}

/**
 * Saves a new password with the token from the emailed link. The shared endpoint: customers who
 * open the mobile app's link land on the same page.
 */
export async function postResetPassword(payload: ResetPasswordPayload): Promise<AxiosResponse<{ message: string }>> {
  return axiosAPI.post<{ message: string }>("/reset-password", payload);
}
