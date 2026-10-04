import { lazy } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { MainLayout } from "../components/MainLayout";
import { MarketingLayout } from "../components/MarketingLayout";
import { Today } from "./Today";

// The marketing page is lazy and Today is not, deliberately: a signed-in user landing on "/" is the
// common path and should not pay a chunk round trip for it, while an authenticated visitor never
// needs the marketing bundle at all. Loading Landing eagerly here would also pull it back into the
// entry chunk, undoing its split in App.tsx.
const Landing = lazy(() => import("./Landing").then((m) => ({ default: m.Landing })));

// "/" is the one route that means something different depending on who's looking: a visitor
// with no session should land on the marketing page, not an auth wall, while a signed-in user
// should land on their Today page — same path, different content and chrome.
export function HomeGate() {
  const { isAuthenticated, isLoading, profile } = useAuth();

  if (!isAuthenticated) {
    return (
      <MarketingLayout>
        <Landing />
      </MarketingLayout>
    );
  }

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

  return (
    <MainLayout>
      <Today />
    </MainLayout>
  );
}
