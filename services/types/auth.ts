/**
 * The signed-in staff member, as GET /api/admin/auth/me returns it (AdminResource: the users row
 * minus secrets, with `role` and `has_device`).
 */
export interface UserResource {
  id: number;
  slug: string | null;
  name: string;
  email: string;
  phone: string | null;
  status: string;
  role: string | null;
  photo_url: string | null;
  lastlogin: string | null;
  created_at: string | null;
}

export interface LoginPayload {
  email: string;
  password: string;
  remember?: boolean;
}

export interface LoginResponse {
  token: string;
  expires_at: string;
  user: UserResource & { permissions: string[] };
}

export interface ProfileResponse {
  user: UserResource & { permissions: string[] };
}

export interface ResetPasswordPayload {
  token: string;
  password: string;
  password_confirmation: string;
}
