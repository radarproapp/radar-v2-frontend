import { describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { InterestControls } from "../InterestControls";
import { renderPage } from "../../test/harness";
import * as api from "../../lib/api";
import * as auth from "../../auth/AuthContext";
import type { UserProfile } from "../../lib/types";

/// Changing what the feed follows, from the feed.
///
/// It meant the profile page — a different section of the product, reached through the account
/// menu — to change the thing the feed in front of you is built from. Radar Learn already puts
/// the same control on the path it changes.

const refetched = vi.fn();

function signedIn(overrides: Partial<UserProfile> = {}) {
  vi.spyOn(auth, "useAuth").mockReturnValue({
    isAuthenticated: true,
    isLoading: false,
    profile: {
      id: "u1",
      persona: "Student",
      hasChosenCategory: true,
      interests: ["Mathematics"],
      goals: ["Win a scholarship"],
      problems: [],
      ...overrides,
    } as UserProfile,
    signIn: () => {},
    signOut: () => {},
    refetchProfile: refetched,
  });
}

function open() {
  fireEvent.click(screen.getByRole("button", { name: /change what radar follows/i }));
}

describe("InterestControls", () => {
  /// Closed until asked for. The common visit to the feed is to read it.
  it("shows nothing but the toggle until it is opened", () => {
    signedIn();

    renderPage(<InterestControls />);

    expect(screen.queryByText(/what are you interested in/i)).toBeNull();
  });

  /// Opened with what is stored, so editing is editing rather than starting over.
  it("opens with the answers already given", () => {
    signedIn();

    renderPage(<InterestControls />);
    open();

    expect(screen.getByText("Mathematics")).toBeTruthy();
    expect(screen.getByText("Win a scholarship")).toBeTruthy();
  });

  /// The three boxes, the same ones asked at the start.
  it("asks the same three questions as the rest of the product", () => {
    signedIn();

    renderPage(<InterestControls />);
    open();

    expect(screen.getByText(/what are you interested in/i)).toBeTruthy();
    expect(screen.getByText(/what are your goals/i)).toBeTruthy();
    expect(screen.getByText(/what is getting in your way/i)).toBeTruthy();
  });

  it("saves the edit without leaving the feed", async () => {
    signedIn();
    const spy = vi.spyOn(api, "personalise").mockResolvedValue({
      isPersonalised: true,
      interests: ["Mathematics"],
      goals: ["Win a scholarship"],
      challenges: [],
      persona: "Student",
    });

    renderPage(<InterestControls />);
    open();
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() =>
      expect(spy).toHaveBeenCalledWith({
        interests: ["Mathematics"],
        goals: ["Win a scholarship"],
        challenges: [],
      }),
    );
  });

  /// Everything the answers feed, not just the screen it was opened from.
  ///
  /// The weekly brief is the same brief over seven days, and an opportunity open in the drawer
  /// keeps its own "why this fits you" - the stale one hardest to notice.
  it("refreshes everything built from the answers", async () => {
    signedIn();
    vi.spyOn(api, "personalise").mockResolvedValue({
      isPersonalised: true,
      interests: ["Mathematics"],
      goals: ["Win a scholarship"],
      challenges: [],
      persona: "Student",
    });

    const { client } = renderPage(<InterestControls />);
    const invalidated = vi.spyOn(client, "invalidateQueries");

    open();
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(invalidated).toHaveBeenCalled());

    const keys = invalidated.mock.calls.map((call) => String(call[0]?.queryKey));
    for (const key of ["feed", "home", "opportunities", "opportunity", "weekly-brief"]) {
      expect(keys).toContain(key);
    }
  });

  /// <summary>Someone who was never asked their category is asked here.</summary>
  ///
  /// PersonaType's default is a real value, so every account began as a Student without anybody
  /// asking. This is the panel they are most likely to be looking at when it matters, so it is
  /// where the question belongs - and it is asked once, not on every edit.
  it("asks for a category only when there is no record of one", () => {
    signedIn({ hasChosenCategory: false } as never);

    renderPage(<InterestControls />);
    open();

    expect(screen.getByText(/which describes you/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Save" }).hasAttribute("disabled")).toBe(true);
  });

  it("does not ask again once it has been answered", () => {
    signedIn();

    renderPage(<InterestControls />);
    open();

    expect(screen.queryByText(/which describes you/i)).toBeNull();
  });

  /// <summary>An abandoned edit does not come back dressed as what Radar has stored.</summary>
  ///
  /// The reseed lived in the toggle handler, and the empty feed's own "edit what you follow"
  /// does not go through it - so that route reopened the panel still holding the edit somebody
  /// had cancelled, presented as their stored answers. Saving from there replaces the whole
  /// list, so two interests deleted and cancelled would be deleted for real without ever having
  /// been shown as present.
  it("forgets an abandoned edit when reopened from outside", () => {
    signedIn({ interests: ["Mathematics", "Physics"] } as never);

    const { rerender } = renderPage(<InterestControls open={false} onOpenChange={() => {}} />);

    rerender(<InterestControls open onOpenChange={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "Physics" }));
    expect(screen.queryByText("Physics")).toBeNull();

    rerender(<InterestControls open={false} onOpenChange={() => {}} />);
    rerender(<InterestControls open onOpenChange={() => {}} />);

    expect(screen.getByText("Physics")).toBeTruthy();
  });

  /// Opened from the page around it, for the empty feed's own button.
  it("can be opened from outside", () => {
    signedIn();

    renderPage(<InterestControls open onOpenChange={() => {}} />);

    expect(screen.getByText(/what are you interested in/i)).toBeTruthy();
  });

  /// The server refuses an empty interest or goal list, and a button that submits anyway
  /// teaches people to press it and be told no.
  it("will not save an answer the server would refuse", () => {
    signedIn({ goals: [] });
    const spy = vi.spyOn(api, "personalise");

    renderPage(<InterestControls />);
    open();

    expect(screen.getByRole("button", { name: "Save" }).hasAttribute("disabled")).toBe(true);
    expect(screen.getByText(/at least one interest and one goal/i)).toBeTruthy();
    expect(spy).not.toHaveBeenCalled();
  });
});
