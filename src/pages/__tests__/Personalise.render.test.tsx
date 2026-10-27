import { describe, expect, it, vi } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import { Personalise } from "../Personalise";
import { LearnBuilder } from "../LearnBuilder";
import { renderPage } from "../../test/harness";
import * as auth from "../../auth/AuthContext";

/// The two pages that ask rather than infer.
///
/// Both shipped this week and neither was ever watched rendering. The rules they enforce are the
/// product's, not mine: personalisation is a hard requirement with interests and goals both
/// needed, and the Learn builder opens with one prominent box rather than question one of three.

function withProfile(profile: Record<string, unknown> = {}) {
  vi.spyOn(auth, "useAuth").mockReturnValue({
    isAuthenticated: true,
    isLoading: false,
    profile: { id: "u1", interests: [], goals: [], ...profile } as never,
    signIn: () => {},
    signOut: () => {},
    refetchProfile: async () => {},
  });
}

describe("Personalise", () => {
  it("asks all three questions", () => {
    withProfile();
    renderPage(<Personalise />);

    expect(screen.getByText("What are you interested in?")).toBeTruthy();
    expect(screen.getByText("What are your goals?")).toBeTruthy();
    expect(screen.getByText("What opportunities are you looking for?")).toBeTruthy();
  });

  /// A dead button with no explanation is the thing this avoids: it names the missing answer
  /// rather than leaving the reader to work out why nothing happens.
  it("says which answer is missing rather than leaving a dead button", () => {
    withProfile();
    renderPage(<Personalise />);

    const submit = screen.getByRole("button", { name: /personalise my radar/i });
    expect((submit as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText("Add at least one interest")).toBeTruthy();
  });

  it("moves on to the goal once an interest is chosen", () => {
    withProfile({ interests: ["Computer Science"] });
    renderPage(<Personalise />);

    expect(screen.getByText("Add at least one goal")).toBeTruthy();
  });

  /// Opportunities are asked for and never required — somebody who wants nothing applied for
  /// should still get a feed — so the button unlocks without them.
  it("does not require an opportunity preference", () => {
    withProfile({ interests: ["Nursing"], goals: ["Find a job"], persona: "Student" });
    renderPage(<Personalise />);

    const submit = screen.getByRole("button", { name: /personalise my radar/i });
    expect((submit as HTMLButtonElement).disabled).toBe(false);
  });

  // The catalogue is 235 entries and will not contain everything, so anything typed can be added
  // — and the offer is visible rather than hidden behind knowing to press Enter.
  it("offers to use words that are not in the catalogue", () => {
    withProfile();
    renderPage(<Personalise />);

    const box = screen.getByLabelText("What are you interested in?");
    fireEvent.focus(box);
    fireEvent.change(box, { target: { value: "Agroforestry economics" } });

    expect(screen.getByText(/use .Agroforestry economics./i)).toBeTruthy();
  });
});

describe("LearnBuilder", () => {
  /// The guide's wording, including "or achieve". A learner who knows they want to pass the CCNA
  /// but cannot name the subject behind it was being asked the wrong question.
  it("opens with one prominent box, not question one of three", () => {
    withProfile();
    renderPage(<LearnBuilder />);

    expect(screen.getByText("What do you want to learn or achieve?")).toBeTruthy();
    expect(screen.queryByText(/question 1 of 3/i)).toBeNull();
    expect(screen.getByText("Starts with one answer")).toBeTruthy();
  });

  /// Pressing "Learn this" on a feed card already answered the first question. Asking again
  /// would be asking somebody to retype what they just chose.
  it("skips the first question when the subject was handed to it", () => {
    withProfile();
    renderPage(<LearnBuilder />, { route: "/learn/build?subject=Cybersecurity" });

    expect(screen.getByText("Where are you starting from?")).toBeTruthy();
    expect(screen.getByText("One quick follow-up")).toBeTruthy();
    // And the answer it was handed stays visible, so it is correctable.
    expect(screen.getByRole("button", { name: "Cybersecurity" })).toBeTruthy();
  });

  it("still asks the two follow-ups that make a section correctly levelled", () => {
    withProfile();
    renderPage(<LearnBuilder />, { route: "/learn/build?subject=Pharmacology" });

    fireEvent.click(screen.getByText("Some experience"));

    expect(screen.getByText("What do you want to be able to do?")).toBeTruthy();
    expect(screen.getByText("Last one")).toBeTruthy();
  });
});
