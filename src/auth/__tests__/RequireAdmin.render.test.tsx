import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { Route, Routes } from "react-router-dom";
import { RequireAdmin } from "../RequireAdmin";
import { renderPage } from "../../test/harness";
import * as auth from "../AuthContext";
import type { Role } from "../../lib/token";

/// Who gets into the admin area.
///
/// Reported from the product: an invited admin set their password, signed in, and never reached
/// the dashboard. This read `profile.role`, and an admin account has no profile — it exists to
/// run Radar, not to read it, so `/api/me` answers 404 for one. The guard waited for a profile
/// that was never coming and showed a spinner forever, on a correct sign-in with a valid token.
///
/// The role was in the token the whole time, which is what it reads now.

function signedIn({ role, profile = null }: { role: Role | null; profile?: unknown }) {
  vi.spyOn(auth, "useAuth").mockReturnValue({
    isAuthenticated: true,
    role,
    isLoading: false,
    profile: profile as never,
    signIn: () => {},
    signOut: () => {},
    refetchProfile: async () => {},
  });
}

function app() {
  return renderPage(
    <Routes>
      <Route path="/admin" element={<RequireAdmin><div>The dashboard</div></RequireAdmin>} />
      <Route path="/admin/login" element={<div>Admin sign-in</div>} />
      <Route path="/" element={<div>Radar</div>} />
    </Routes>,
    { route: "/admin" },
  );
}

describe("RequireAdmin", () => {
  /// <summary>The case that was broken: an admin with no profile.</summary>
  ///
  /// This is every invited admin, not an edge case — their account is created without one.
  it.each(["SuperAdmin", "PlatformAdmin"] as const)("lets a %s in with no profile at all", async (role) => {
    signedIn({ role, profile: null });

    app();

    expect(await screen.findByText("The dashboard")).toBeTruthy();
  });

  /// <summary>And never waits for one.</summary>
  ///
  /// A spinner that cannot resolve is worse than a redirect: it looks like the product is slow
  /// rather than like something is wrong, so nobody reports it for a week.
  it("does not render a loading state while waiting for a profile", () => {
    signedIn({ role: "SuperAdmin", profile: null });

    const { container } = app();

    expect(container.querySelector(".r-spinner")).toBeNull();
  });

  it("sends an ordinary user away", async () => {
    signedIn({ role: "User", profile: { id: "u1" } });

    app();

    expect(await screen.findByText("Radar")).toBeTruthy();
    expect(screen.queryByText("The dashboard")).toBeNull();
  });

  /// A token carrying no role we recognise is not an admin.
  it("sends somebody with no role away", async () => {
    signedIn({ role: null, profile: { id: "u1" } });

    app();

    expect(await screen.findByText("Radar")).toBeTruthy();
  });

  it("sends somebody signed out to the admin sign-in", async () => {
    vi.spyOn(auth, "useAuth").mockReturnValue({
      isAuthenticated: false,
      role: null,
      isLoading: false,
      profile: null,
      signIn: () => {},
      signOut: () => {},
      refetchProfile: async () => {},
    });

    app();

    expect(await screen.findByText("Admin sign-in")).toBeTruthy();
  });
});
