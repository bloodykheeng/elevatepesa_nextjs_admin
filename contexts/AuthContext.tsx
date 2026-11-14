"use client";

import { disconnectEcho } from "@/lib/echo";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient, type UseMutationResult, type UseQueryResult } from "@tanstack/react-query";
import type { AxiosError, AxiosResponse } from "axios";
import { clearAuthCookies, getStoredToken, getStoredUser, persistAuthSession, type SlimProfile } from "@/services/axiosApi";
import { getAuthProfile, postToLogout } from "@/services/auth/auth-service";
import type { ProfileResponse, UserResource } from "@/services/types/auth";

interface AuthContextValue {
  getUserQuery: UseQueryResult<AxiosResponse<ProfileResponse>>;
  logoutMutation: UseMutationResult<AxiosResponse<{ message: string }>, Error, void>;
  user: UserResource | null;
  /** Admin or Editor. Decides which pages show (lib/menuItems.ts); the API checks the same. */
  role: string | null;
  permissions: string[];
  isAuthenticated: boolean;
  /** True until the profile has answered. The shell waits on it so the menu never paints empty. */
  isProfileLoading: boolean;
  login: (user: unknown, token: string, days?: number) => void;
}

/**
 * Leaves the signed-in app with a FULL page load, never `router.push`: Next keeps pages you
 * left mounted but hidden, state included, so a soft navigation would keep the last user's
 * pages and cached data alive in the tab. A reload drops all of it.
 */
export function leaveToSignIn(): void {
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- a full reload is the point (above)
  window.location.assign("/login");
}

const AuthCtx = createContext<AuthContextValue | undefined>(undefined);

export function AuthContext({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  // The cookies are read on the client after mount, so the server render and the first client
  // render agree ("not known yet"); `ready` tells the two states apart.
  const [token, setToken] = useState<string | null>(null);
  const [cookieProfile, setCookieProfile] = useState<SlimProfile | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setToken(getStoredToken());
    setCookieProfile(getStoredUser());
    setReady(true);
  }, []);

  const getUserQuery = useQuery<AxiosResponse<ProfileResponse>>({
    queryKey: ["auth-profile"],
    queryFn: getAuthProfile,
    enabled: !!token,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const endSession = useCallback(() => {
    // The next session authorises its own live channels.
    disconnectEcho();
    queryClient.cancelQueries();
    leaveToSignIn();
  }, [queryClient]);

  // A token the API no longer knows (expired, signed out elsewhere, password reset) ends the
  // session. Only 401: a network blip is not a sign-out.
  useEffect(() => {
    const status = (getUserQuery.error as AxiosError | null)?.response?.status;
    if (getUserQuery.isError && status === 401) {
      clearAuthCookies();
      setToken(null);
      endSession();
    }
  }, [getUserQuery.isError, getUserQuery.error, endSession]);

  const logoutMutation = useMutation({
    mutationFn: postToLogout,
    meta: { skipGlobalError: true },
    onSettled: () => {
      setToken(null);
      clearAuthCookies();
      endSession();
    },
  });

  const login = useCallback(
    (user: unknown, newToken: string, days = 1) => {
      persistAuthSession(newToken, user, days);
      // Drop everything cached under a previous session, including queries left in a 401 state.
      queryClient.clear();
      setToken(newToken);
    },
    [queryClient]
  );

  const profile = getUserQuery.data?.data?.user;
  const user = (profile ?? (cookieProfile as unknown as UserResource | null)) || null;

  return (
    <AuthCtx.Provider
      value={{
        getUserQuery,
        logoutMutation,
        user,
        role: profile?.role ?? cookieProfile?.role ?? null,
        permissions: profile?.permissions ?? [],
        isAuthenticated: !!token && !!user,
        isProfileLoading: !ready || (!!token && getUserQuery.isPending),
        login,
      }}
    >
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be used within AuthContext");
  return ctx;
}
