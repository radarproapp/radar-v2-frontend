import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

// Mirrors SessionAwareBase: no session -> /login; session but onboarding
// incomplete -> /onboarding; else render the page.
export function RequireAuth({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading, profile } = useAuth();

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  if (isLoading || !profile) {
    return (
      <div className="r-page">
        <div className="r-empty">
          <div className="r-spinner" />
        </div>
      </div>
    );
  }

  if (!profile.onboardingComplete) return <Navigate to="/onboarding" replace />;

  return <>{children}</>;
}
