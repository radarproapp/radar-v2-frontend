import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { ReferralPanel } from "../ReferralPanel";
import { renderPage } from "../../test/harness";
import * as api from "../../lib/api";
import type { MyReferral } from "../../lib/api";

/// A participant's link, and what it has actually brought in.
///
/// Three numbers rather than a score. A sign-up is not a user: somebody who gets thirty people
/// to create an account and walk away has produced thirty rows, and one number cannot tell that
/// from thirty people who come back every week.

function mine(overrides: Partial<MyReferral> = {}): MyReferral {
  return {
    code: "ABC2345",
    link: "https://www.radarproapp.com/join/ABC2345",
    signedUp: 12,
    personalised: 7,
    cameBack: 3, awaitingConfirmation: 0,
    ...overrides,
  };
}

describe("ReferralPanel", () => {
  it("shows the code and the three counts", async () => {
    vi.spyOn(api, "getMyReferral").mockResolvedValue(mine());

    renderPage(<ReferralPanel />);

    expect(await screen.findByText("ABC2345")).toBeTruthy();
    expect(screen.getByText("12")).toBeTruthy();
    expect(screen.getByText("7")).toBeTruthy();
    expect(screen.getByText("3")).toBeTruthy();
  });

  /// <summary>The counts are labelled by what they mean, not by jargon.</summary>
  ///
  /// A participant reading this screen should learn, without being told, that getting somebody
  /// to the end matters more than getting them through the door.
  it("says what each number actually counts", async () => {
    vi.spyOn(api, "getMyReferral").mockResolvedValue(mine());

    renderPage(<ReferralPanel />);

    expect(await screen.findByText(/returned on a later day/i)).toBeTruthy();
    expect(screen.getByText(/answered the three questions/i)).toBeTruthy();
  });

  /// Nothing yet is said in words, because a row of zeroes could mean anything.
  it("says plainly when nobody has joined yet", async () => {
    vi.spyOn(api, "getMyReferral").mockResolvedValue(mine({ signedUp: 0, personalised: 0, cameBack: 0 }));

    renderPage(<ReferralPanel />);

    expect(await screen.findByText(/nobody has joined through your link yet/i)).toBeTruthy();
  });

  /// <summary>The gap between arriving and staying is pointed at.</summary>
  ///
  /// A large first column and an empty third one is the most useful thing this screen can tell
  /// a participant, and it is invisible if the numbers are left to speak for themselves.
  it("names the gap when people arrive and none come back", async () => {
    vi.spyOn(api, "getMyReferral").mockResolvedValue(mine({ signedUp: 9, personalised: 4, cameBack: 0 }));

    renderPage(<ReferralPanel />);

    expect(await screen.findByText(/none have come back yet/i)).toBeTruthy();
  });

  /// A failure says so rather than showing zeroes, which would read as "you brought nobody".
  it("does not show a failure as a score of zero", async () => {
    vi.spyOn(api, "getMyReferral").mockRejectedValue(new Error("offline"));

    renderPage(<ReferralPanel />);

    expect(await screen.findByText(/could not fetch your referral link/i)).toBeTruthy();
    expect(screen.queryByText(/nobody has joined/i)).toBeNull();
  });
});
