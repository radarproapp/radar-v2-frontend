import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError, clearToken, getMe, getToken, setToken as persistToken } from "../lib/api";
import type { UserProfile } from "../lib/types";

interface AuthContextValue {
  isAuthenticated: boolean;
  profile: UserProfile | null;
  isLoading: boolean;
  signIn: (token: string) => void;
  signOut: () => void;
  refetchProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [hasToken, setHasToken] = useState(() => getToken() !== null);
  const queryClient = useQueryClient();

  const profileQuery = useQuery({
    queryKey: ["me"],
    queryFn: getMe,
    enabled: hasToken,
    retry: false,
  });

  const { error } = profileQuery;

  // A 401 means the token expired or is invalid — drop it so the guard bounces to /login.
  useEffect(() => {
    if (error instanceof ApiError && error.status === 401) {
      clearToken();
      setHasToken(false);
    }
  }, [error]);

  const signIn = (token: string) => {
    persistToken(token);
    queryClient.removeQueries({ queryKey: ["me"] });
    setHasToken(true);
  };

  const signOut = () => {
    clearToken();
    setHasToken(false);
    queryClient.removeQueries({ queryKey: ["me"] });
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      isAuthenticated: hasToken,
      profile: profileQuery.data ?? null,
      isLoading: hasToken && profileQuery.isLoading,
      signIn,
      signOut,
      refetchProfile: () => queryClient.invalidateQueries({ queryKey: ["me"] }),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [hasToken, profileQuery.data, profileQuery.isLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
