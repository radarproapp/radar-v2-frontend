import { describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { VerifyEmail } from "../VerifyEmail";
import { renderPage } from "../../test/harness";
import * as api from "../../lib/api";
import { ApiError } from "../../lib/api";

/// Confirming an address, from the link in the email.
///
/// Nothing in Radar is locked until somebody does this — what it changes is whether a referral
/// counts. So the screen has to be reassuring about the first and clear about the second.

const at = (token: string) => renderPage(<VerifyEmail />, { route: `/verify-email?token=${token}` });

describe("VerifyEmail", () => {
  it("confirms on arrival rather than behind a button", async () => {
    const verify = vi.spyOn(api, "verifyEmail").mockResolvedValue({ verified: true, alreadyDone: false });

    at("a-token");

    await waitFor(() => expect(verify).toHaveBeenCalledWith("a-token"));
    expect(await screen.findByText(/that's confirmed/i)).toBeTruthy();
  });

  it("says what confirming was for", async () => {
    vi.spyOn(api, "verifyEmail").mockResolvedValue({ verified: true, alreadyDone: false });

    at("a-token");

    expect(await screen.findByText(/their referral counts now/i)).toBeTruthy();
  });

  /// <summary>A second tap is not a failure.</summary>
  ///
  /// It is the ordinary thing a person does when they are not sure the first one worked, and
  /// "invalid" would send them asking for a link they do not need.
  it("tells an already-confirmed address apart from a broken link", async () => {
    vi.spyOn(api, "verifyEmail").mockResolvedValue({ verified: true, alreadyDone: true });

    at("a-token");

    expect(await screen.findByText(/already confirmed/i)).toBeTruthy();
  });

  it("says plainly when the link has expired", async () => {
    vi.spyOn(api, "verifyEmail").mockRejectedValue(
      new ApiError(400, "That link is no longer valid. Ask for a new one from your settings."),
    );

    at("a-token");

    expect(await screen.findByText(/that link has expired/i)).toBeTruthy();
    expect(screen.getByText(/ask for a new one/i)).toBeTruthy();
  });

  /// A truncated link says so before anything is attempted.
  it("says when the link carries no token, without calling the server", async () => {
    const verify = vi.spyOn(api, "verifyEmail").mockResolvedValue({ verified: true, alreadyDone: false });

    renderPage(<VerifyEmail />, { route: "/verify-email" });

    expect(await screen.findByText(/that link is incomplete/i)).toBeTruthy();
    expect(verify).not.toHaveBeenCalled();
  });

  /// <summary>The token is spent once, however many times the effect runs.</summary>
  ///
  /// React invokes effects twice in development. Without a guard the first run spends the
  /// single-use token and the second reports it invalid — on a correct link.
  it("confirms once even if the effect runs twice", async () => {
    const verify = vi.spyOn(api, "verifyEmail").mockResolvedValue({ verified: true, alreadyDone: false });

    const { rerender } = at("a-token");
    rerender(<VerifyEmail />);

    await waitFor(() => expect(verify).toHaveBeenCalledTimes(1));
  });
});
