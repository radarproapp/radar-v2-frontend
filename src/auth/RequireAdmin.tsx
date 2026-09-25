import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

export function RequireAdmin({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading, profile } = useAuth();

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (isLoading || !profile) {
    return <div className="r-page"><div className="r-empty"><div className="r-spinner" /></div></div>;
  }
  if (profile.role !== "SuperAdmin" && profile.role !== "PlatformAdmin") return <Navigate to="/" replace />;

  return <>{children}</>;
}
