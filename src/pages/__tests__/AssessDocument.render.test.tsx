import { describe, expect, it, vi } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import { AssessDocument } from "../AssessDocument";
import { renderPage } from "../../test/harness";
import * as api from "../../lib/api";
import * as auth from "../../auth/AuthContext";
import type { DocumentAssessment } from "../../lib/types";

/// Assessment, with its criteria on screen.
///
/// The two rules worth testing are the two the existing mentor work review breaks: never show a
/// score, and never assess a document whose kind could not be identified. Both are the sort of
/// thing that degrades quietly into "a number appeared, so it must have been judged".

function withPersona(persona: string) {
  vi.spyOn(auth, "useAuth").mockReturnValue({
    isAuthenticated: true,
    isLoading: false,
    profile: { id: "u1", persona } as never,
    signIn: () => {},
    signOut: () => {},
    refetchProfile: async () => {},
  });
}

function assessment(overrides: Partial<DocumentAssessment> = {}): DocumentAssessment {
  return {
    id: "a1",
    fileName: "essay.pdf",
    wasAssessed: true,
    notAssessedReason: null,
    kind: "Essay",
    kindEvidence: "Opens with a thesis paragraph followed by cited argument.",
    assessedAs: "Student" as never,
    criteria: [
      {
        name: "A position",
        asks: "Does the essay state a claim it then defends?",
        verdict: "Partly",
        evidence: "The introduction lists three views but does not say which it defends.",
        fix: "End the introduction with the claim the essay argues for.",
      },
      {
        name: "Evidence",
        asks: "Is each claim supported?",
        verdict: "Met",
        evidence: "Each section cites a source.",
        fix: null,
      },
    ],
    strengths: ["Paragraph four explains why the 2019 data undercuts the earlier finding."],
    mostValuableChange: "State your position in the introduction.",
    assessedAt: "2026-10-27T10:00:00Z",
    summary: "1 of 2 criteria met",
    ...overrides,
  };
}

function upload(file = new File(["x".repeat(500)], "essay.pdf", { type: "application/pdf" })) {
  const input = document.querySelector('input[type="file"]') as HTMLInputElement;
  fireEvent.change(input, { target: { files: [file] } });
}

describe("AssessDocument", () => {
  it("offers the rubric before anything is uploaded", async () => {
    withPersona("Student");
    vi.spyOn(api, "getRubric").mockResolvedValue({
      kind: "Cv",
      assessedAs: "Student",
      criteria: [{ name: "A target", asks: "Is it clear what role this is for?", verdict: "Partly", evidence: "" }],
    });

    renderPage(<AssessDocument />);
    fireEvent.click(screen.getByRole("button", { name: "CV" }));

    expect(await screen.findByText("A target")).toBeTruthy();
    expect(screen.getByText("Is it clear what role this is for?")).toBeTruthy();
  });

  /// The criteria are shown with the judgement. A verdict without the thing it was judged against
  /// is the score-out-of-100 problem wearing different clothes.
  it("shows what each criterion asked alongside the verdict", async () => {
    withPersona("Student");
    vi.spyOn(api, "assessDocument").mockResolvedValue(assessment());

    renderPage(<AssessDocument />);
    upload();

    expect(await screen.findByText("A position")).toBeTruthy();
    expect(screen.getByText("Does the essay state a claim it then defends?")).toBeTruthy();
    expect(screen.getByText("Partly")).toBeTruthy();
    expect(screen.getByText("Met")).toBeTruthy();
  });

  it("gives one priority rather than a list of equals", async () => {
    withPersona("Student");
    vi.spyOn(api, "assessDocument").mockResolvedValue(assessment());

    renderPage(<AssessDocument />);
    upload();

    expect(await screen.findByText("The one change worth making first")).toBeTruthy();
    expect(screen.getByText("State your position in the introduction.")).toBeTruthy();
  });

  /// No score, anywhere. This is the specific thing the existing work review does that this must
  /// not: "76" against no stated rubric is a number the reader cannot check or argue with.
  it("never shows a score", async () => {
    withPersona("Student");
    vi.spyOn(api, "assessDocument").mockResolvedValue(assessment());

    const { container } = renderPage(<AssessDocument />);
    upload();

    await screen.findByText("A position");

    expect(container.textContent).not.toMatch(/\b\d{1,3}\s*\/\s*100\b/);
    expect(container.textContent).not.toMatch(/score/i);
  });

  /// An unidentified document is not assessed against a guessed rubric, because picking a default
  /// is how a CV gets told its argument is underdeveloped.
  it("assesses nothing when the kind could not be identified", async () => {
    withPersona("Student");
    vi.spyOn(api, "assessDocument").mockResolvedValue(
      assessment({
        wasAssessed: false,
        kind: "Unknown",
        notAssessedReason: "Radar could not tell what kind of document this is.",
        criteria: [],
        strengths: [],
        mostValuableChange: null,
        summary: null,
      }),
    );

    renderPage(<AssessDocument />);
    upload();

    expect(await screen.findByText("Not assessed")).toBeTruthy();
    expect(screen.getByText(/could not tell what kind of document/i)).toBeTruthy();
  });

  // Why it read the document as it did, so a wrong guess is arguable rather than mysterious.
  it("says why it read the document as it did", async () => {
    withPersona("Student");
    vi.spyOn(api, "assessDocument").mockResolvedValue(assessment());

    renderPage(<AssessDocument />);
    upload();

    expect(await screen.findByText(/opens with a thesis paragraph/i)).toBeTruthy();
  });

  it("surfaces the reason a file was refused", async () => {
    withPersona("Student");
    vi.spyOn(api, "assessDocument").mockRejectedValue(
      new api.ApiError(422, "Only a few characters came out of that file."),
    );

    renderPage(<AssessDocument />);
    upload();

    expect(
      await screen.findByText(/only a few characters/i, {}, { timeout: 3000 }),
    ).toBeTruthy();
  });
});
