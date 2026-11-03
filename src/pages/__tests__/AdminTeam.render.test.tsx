import { describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { Route, Routes } from "react-router-dom";
import { AdminDashboard } from "../AdminDashboard";
import { renderPage } from "../../test/harness";
import * as api from "../../lib/api";
import type { AdminTeam, AdminTeamMember } from "../../lib/api";

/// The one screen that can widen who sees everything.
///
/// It used to list four invented admins with addresses and last-active times, behind no endpoint
/// at all. What matters now is that it is honest about two things a reader cannot otherwise tell
/// apart: access granted by a deploy, which cannot be removed here and is the way back in, and
/// access granted from this screen, which can.

function member(overrides: Partial<AdminTeamMember> = {}): AdminTeamMember {
  return {
    email: "staff@radar.com",
    role: "PlatformAdmin",
    fromConfiguration: false,
    grantedByEmail: "owner@radar.com",
    grantedAt: "2026-11-01T10:00:00Z",
    hasAccount: true,
    joinedAt: "2026-10-01T10:00:00Z",
    canRevoke: true,
    ...overrides,
  };
}

function team(overrides: Partial<AdminTeam> = {}): AdminTeam {
  return {
    team: [member()],
    canInvite: true,
    you: "SuperAdmin",
    configuredBy: "Auth__SuperAdminEmails__n and Auth__AdminEmails__n in the deployment environment",
    ...overrides,
  };
}

/// Rendered behind the route it actually lives on. AdminDashboard reads :Page from the router to
/// decide which section to show, so mounting it bare lands on the dashboard overview instead.
/// One person's row, so an assertion about them cannot be satisfied by the explanatory note at
/// the bottom of the card, which deliberately repeats the same words.
async function rowFor(email: string) {
  const cell = await screen.findByText(email);
  const row = cell.closest(".admin-table-row");

  if (!row) throw new Error(`No row for ${email}`);
  return row as HTMLElement;
}

const show = () => {
  vi.spyOn(api, "getAdminSummary").mockResolvedValue({
    users: 0, publishedContent: 0, openReports: 0, role: "SuperAdmin",
  });

  return renderPage(
    <Routes>
      <Route path="/admin/:Page" element={<AdminDashboard />} />
    </Routes>,
    { route: "/admin/team" },
  );
};

describe("Admin Team", () => {
  it("lists who can sign in, and what each of them holds", async () => {
    vi.spyOn(api, "getAdminTeam").mockResolvedValue(team());

    show();

    const row = await rowFor("staff@radar.com");

    expect(within(row).getByText("Platform Admin")).toBeTruthy();
    expect(within(row).getByText(/added by owner@radar.com/i)).toBeTruthy();
  });

  /// <summary>Granted access nobody has used is said out loud.</summary>
  ///
  /// It is access that exists and is not being watched, and it was invisible — there was no
  /// endpoint behind this screen at all.
  it("says when an address has access but has never signed up", async () => {
    vi.spyOn(api, "getAdminTeam").mockResolvedValue(team({ team: [member({ hasAccount: false })] }));

    show();

    expect(await screen.findByText(/has not signed up yet/i)).toBeTruthy();
  });

  /// <summary>A row from the deployment cannot be removed here, and says so.</summary>
  ///
  /// Those rows are the way back in if the grants are ever wrong. An absent button that does not
  /// explain itself reads as a bug.
  it("offers no remove button for a configured admin, and says why", async () => {
    vi.spyOn(api, "getAdminTeam").mockResolvedValue(team({
      team: [member({ email: "owner@radar.com", fromConfiguration: true, canRevoke: false })],
    }));

    show();

    const row = await rowFor("owner@radar.com");

    expect(within(row).getByText(/set by deploy/i)).toBeTruthy();
    expect(within(row).queryByRole("button", { name: /remove/i })).toBeNull();
  });

  /// Nobody removes their own access — it is what guarantees one admin is always left.
  it("offers no remove button on your own row", async () => {
    vi.spyOn(api, "getAdminTeam").mockResolvedValue(team({ team: [member({ canRevoke: false })] }));

    show();

    const row = await rowFor("staff@radar.com");

    expect(within(row).getByText("You")).toBeTruthy();
    expect(within(row).queryByRole("button", { name: /remove/i })).toBeNull();
  });

  /// A Platform Admin can read the list and change nothing.
  it("hides the form from an admin who cannot use it", async () => {
    vi.spyOn(api, "getAdminTeam").mockResolvedValue(team({ canInvite: false, you: "PlatformAdmin" }));

    show();

    expect(await screen.findByText("staff@radar.com")).toBeTruthy();
    expect(screen.queryByLabelText(/email address/i)).toBeNull();
    expect(screen.queryByRole("button", { name: /remove/i })).toBeNull();
  });

  /// <summary>An invite says what will actually happen next.</summary>
  ///
  /// Somebody already signed in keeps the token they hold until they sign in again. Without
  /// saying so, they try the admin area, are turned away, and report it as broken.
  it("says the access starts at their next sign-in", async () => {
    vi.spyOn(api, "getAdminTeam").mockResolvedValue(team());
    const invite = vi.spyOn(api, "inviteAdmin").mockResolvedValue(undefined);

    show();

    fireEvent.change(await screen.findByLabelText(/email address/i), { target: { value: "new@radar.com" } });
    fireEvent.click(screen.getByRole("button", { name: /^add$/i }));

    await waitFor(() => expect(invite).toHaveBeenCalledWith("new@radar.com", "PlatformAdmin"));
    expect(await screen.findByText(/new@radar\.com can reach the admin area/i)).toBeTruthy();
  });

  /// A refusal is shown rather than swallowed, because the row simply not appearing reads as a
  /// screen that silently does nothing.
  it("shows why an invite was refused", async () => {
    vi.spyOn(api, "getAdminTeam").mockResolvedValue(team());
    vi.spyOn(api, "inviteAdmin").mockRejectedValue(new Error("That does not look like an email address."));

    show();

    fireEvent.change(await screen.findByLabelText(/email address/i), { target: { value: "nonsense" } });
    fireEvent.click(screen.getByRole("button", { name: /^add$/i }));

    expect(await screen.findByText(/does not look like an email address/i)).toBeTruthy();
  });

  it("removes an address and says so", async () => {
    vi.spyOn(api, "getAdminTeam").mockResolvedValue(team());
    const revoke = vi.spyOn(api, "revokeAdmin").mockResolvedValue(undefined);

    show();

    fireEvent.click(await screen.findByRole("button", { name: /remove/i }));

    await waitFor(() => expect(revoke).toHaveBeenCalledWith("staff@radar.com"));
    expect(await screen.findByText(/no longer has admin access/i)).toBeTruthy();
  });

  /// <summary>An empty list is a sentence, not a blank card.</summary>
  it("says plainly when nobody has access", async () => {
    vi.spyOn(api, "getAdminTeam").mockResolvedValue(team({ team: [] }));

    show();

    expect(await screen.findByText(/nobody has admin access in this deployment/i)).toBeTruthy();
  });

  it("does not render a failure as an empty team", async () => {
    vi.spyOn(api, "getAdminTeam").mockRejectedValue(new Error("offline"));

    show();

    expect(await screen.findByText(/could not read the admin list/i)).toBeTruthy();
    expect(screen.queryByText(/nobody has admin access/i)).toBeNull();
  });
});
