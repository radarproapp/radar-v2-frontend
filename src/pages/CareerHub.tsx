import { lazy, Suspense } from "react";
import { useAuth } from "../auth/AuthContext";

const GraduateCareerDashboard = lazy(() =>
  import("./GraduateCareerDashboard").then((m) => ({ default: m.GraduateCareerDashboard })),
);
const ProfessionalCareerDashboard = lazy(() =>
  import("./ProfessionalCareerDashboard").then((m) => ({ default: m.ProfessionalCareerDashboard })),
);

function CareerLoading() {
  return (
    <div className="r-page">
      <div className="r-empty">
        <div className="r-spinner" />
      </div>
    </div>
  );
}

export function CareerHub() {
  const { profile } = useAuth();

  return (
    <Suspense fallback={<CareerLoading />}>
      {profile?.persona === "Graduate" ? (
        <GraduateCareerDashboard />
      ) : (
        <ProfessionalCareerDashboard />
      )}
    </Suspense>
  );
}
