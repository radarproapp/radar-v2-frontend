import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";

/// No session goes to /login. A session whose profile has not answered the three questions goes
/// to /personalise, which is where those questions are asked.
///
/// It used to go to /onboarding — the persona picker, which leads to a grid of forty-odd
/// subjects picked as buttons. That screen was replaced by the typed questions everywhere a
/// learner normally meets it, and left standing here. So adding a second profile created a
/// profile with nothing answered, this sent it to the old screen, and somebody who had been
/// through the new flow walked straight back into the one it replaced.
///
/// Answering is what clears it: POST /api/me/personalise sets OnboardingComplete.
/// Where somebody with nothing answered is sent.
const ASK = "/personalise";

export function RequireAuth({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading, profile } = useAuth();
  const { pathname } = useLocation();

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

  // Not when already there, or the redirect sends the questions screen to itself for ever.
  if (!profile.onboardingComplete && pathname.toLowerCase() !== ASK) {
    return <Navigate to={ASK} replace />;
  }

  return <>{children}</>;
}
