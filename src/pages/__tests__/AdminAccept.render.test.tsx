import { describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { AdminAccept } from "../AdminAccept";
import { renderPage } from "../../test/harness";
import * as api from "../../lib/api";
import { ApiError } from "../../lib/api";

/// Setting a password on a new admin account.
///
/// The account this creates is separate from the one the same person reads Radar with, and the
/// screen has to say so — somebody who already has a Radar password will otherwise assume this
/// is changing it.

const at = (token: string) => renderPage(<AdminAccept />, { route: `/admin/accept?token=${token}` });

describe("AdminAccept", () => {
  it("says the admin account is separate from an ordinary one", async () => {
    at("a-token");

    expect(await screen.findByText(/choose a password/i)).toBeTruthy();
    expect(screen.getByText(/separate from any ordinary Radar account/i)).toBeTruthy();
  });

  /// <summary>A truncated link says so before they type anything.</summary>
  ///
  /// Links get mangled between an email client and a browser. Failing on submit instead would
  /// make somebody type a password twice to find out.
  it("says plainly when the link carries no token", async () => {
    renderPage(<AdminAccept />, { route: "/admin/accept" });

    expect(await screen.findByText(/that link is incomplete/i)).toBeTruthy();
    expect(screen.queryByPlaceholderText(/password/i)).toBeNull();
  });

  /// A mistyped password that is accepted leaves somebody with an account they cannot open.
  it("refuses two passwords that do not match, without calling the server", async () => {
    const accept = vi.spyOn(api, "acceptAdminInvite").mockResolvedValue(undefined);

    at("a-token");

    fireEvent.change(await screen.findByPlaceholderText(/at least 8 characters/i), { target: { value: "a-real-password" } });
    fireEvent.change(screen.getByPlaceholderText(/type it again/i), { target: { value: "a-different-one" } });
    fireEvent.click(screen.getByRole("button", { name: /create my admin account/i }));

    expect(await screen.findByText(/not the same/i)).toBeTruthy();
    expect(accept).not.toHaveBeenCalled();
  });

  it("refuses a password under eight characters without calling the server", async () => {
    const accept = vi.spyOn(api, "acceptAdminInvite").mockResolvedValue(undefined);

    at("a-token");

    fireEvent.change(await screen.findByPlaceholderText(/at least 8 characters/i), { target: { value: "short" } });
    fireEvent.change(screen.getByPlaceholderText(/type it again/i), { target: { value: "short" } });
    fireEvent.click(screen.getByRole("button", { name: /create my admin account/i }));

    expect(await screen.findByText(/at least 8 characters/i)).toBeTruthy();
    expect(accept).not.toHaveBeenCalled();
  });

  /// <summary>Creating the account does not sign them in.</summary>
  ///
  /// A leaked link should not hand over a live session as well. Whoever opens it still has to
  /// know the password that was just set.
  it("sends them to sign in rather than signing them in", async () => {
    const accept = vi.spyOn(api, "acceptAdminInvite").mockResolvedValue(undefined);

    at("a-token");

    fireEvent.change(await screen.findByPlaceholderText(/at least 8 characters/i), { target: { value: "a-real-password" } });
    fireEvent.change(screen.getByPlaceholderText(/type it again/i), { target: { value: "a-real-password" } });
    fireEvent.click(screen.getByRole("button", { name: /create my admin account/i }));

    await waitFor(() => expect(accept).toHaveBeenCalledWith("a-token", "a-real-password"));

    expect(await screen.findByText(/your admin account is ready/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: /go to admin sign-in/i })).toBeTruthy();
  });

  /// An expired or used link says so rather than failing silently.
  it("shows why an invitation was refused", async () => {
    vi.spyOn(api, "acceptAdminInvite").mockRejectedValue(
      new ApiError(400, "That invitation is no longer valid. Ask for a new one."),
    );

    at("a-token");

    fireEvent.change(await screen.findByPlaceholderText(/at least 8 characters/i), { target: { value: "a-real-password" } });
    fireEvent.change(screen.getByPlaceholderText(/type it again/i), { target: { value: "a-real-password" } });
    fireEvent.click(screen.getByRole("button", { name: /create my admin account/i }));

    expect(await screen.findByText(/no longer valid/i)).toBeTruthy();
    expect(screen.queryByText(/your admin account is ready/i)).toBeNull();
  });
});
