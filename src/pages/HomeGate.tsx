import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { MainLayout } from "../components/MainLayout";
import { MarketingLayout } from "../components/MarketingLayout";
import { Landing } from "./Landing";
import { Today } from "./Today";

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
