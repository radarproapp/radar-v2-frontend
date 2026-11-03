import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

/// The gate on the admin area.
///
/// Gated on the role in the token, not on a profile. An admin account has no profile - it exists
/// to run Radar, not to read it - so `/api/me` answers 404 for one, and this used to read
/// `profile.role` and wait for a profile that was never coming. Somebody who had just set their
/// admin password signed in successfully and then sat on a loading spinner forever.
///
/// This decides which screen to show and nothing more. Every admin endpoint checks the role on
/// the token it was sent, so getting past this with a forged claim buys an admin shell whose
/// every request comes back 401 or 403.
export function RequireAdmin({ children }: { children: ReactNode }) {
  const { isAuthenticated, role } = useAuth();

  if (!isAuthenticated) return <Navigate to="/admin/login" replace />;

  // No wait for a profile. The role arrived with the token, so there is nothing to load and
  // nothing that can fail to arrive.
  if (role !== "SuperAdmin" && role !== "PlatformAdmin") return <Navigate to="/" replace />;

  return <>{children}</>;
}
