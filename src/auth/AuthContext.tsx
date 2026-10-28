import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { clearToken, getMe, getToken, onSessionEnded, setToken as persistToken } from "../lib/api";
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

  // Forgetting the session, whether it was given up or taken away.
  //
  // The whole cache, not just ["me"]. What is in it belongs to the account that just ended, and on
  // a shared phone the next person to sign in would otherwise see the previous one's feed for as
  // long as it took to refetch.
  const forget = useCallback(() => {
    clearToken();
    setHasToken(false);
    queryClient.clear();
  }, [queryClient]);

  // The server refusing our token, from any call rather than only the profile one.
  //
  // It used to be watched for on the ["me"] query alone, which was enough while a token could only
  // stop working by expiring thirty days later — ["me"] runs on mount, so it would have been the
  // one to find out. A password reset now ends every session on the account at once, so the first
  // call to be refused is whatever the user happened to be doing, and that query reports its own
  // error message on its own page while the app still shows them as signed in.
  useEffect(() => onSessionEnded(forget), [forget]);

  const signIn = (token: string) => {
    persistToken(token);
    queryClient.clear();
    setHasToken(true);
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      isAuthenticated: hasToken,
      profile: profileQuery.data ?? null,
      isLoading: hasToken && profileQuery.isLoading,
      signIn,
      signOut: forget,
      // refetchQueries, not invalidateQueries. Invalidate marks a query stale and resolves
      // immediately; the caller awaiting it gets no guarantee the new profile has arrived. That
      // is why personalising navigated home and the home screen still believed the profile was
      // unpersonalised, and asked the three questions again.
      refetchProfile: () => queryClient.refetchQueries({ queryKey: ["me"] }),
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
