import { describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
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
    kindWasDeclared: false,
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

    // Titled as a question now, because the reader can answer it.
    expect(await screen.findByText("What is this?")).toBeTruthy();
    expect(screen.getByText(/could not tell what kind of document/i)).toBeTruthy();
    // And crucially: no criteria are shown, because none were applied.
    expect(screen.queryByText("Against the criteria")).toBeNull();
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

  /// An unidentified document is a question, not a dead end.
  ///
  /// Detection is not reliable enough to be the only route: measured on staging, the same CV came
  /// back as Cv in full and as Unknown when shortened by a third. Being told Radar cannot tell
  /// what your own CV is, with nothing to do about it, is honest and useless.
  it("asks what the document is rather than giving up", async () => {
    withPersona("Student");
    const assessSpy = vi.spyOn(api, "assessDocument").mockResolvedValue(
      assessment({
        wasAssessed: false,
        kind: "Unknown",
        notAssessedReason: "Radar could not work out what kind of document this is.",
        criteria: [],
      }),
    );

    renderPage(<AssessDocument />);
    upload();

    expect(await screen.findByText("What is this?")).toBeTruthy();

    // Saying what it is re-sends the same file with the kind, rather than asking for it again.
    fireEvent.click(screen.getByRole("button", { name: "CV" }));

    // Awaited: mutate() schedules the call, so asserting synchronously catches only the upload.
    await waitFor(() =>
      expect(assessSpy).toHaveBeenLastCalledWith({ file: expect.any(File), kind: "Cv" }),
    );
  });

  // A declared kind is labelled differently, because it is worth more: the criteria are certainly
  // the right ones rather than probably.
  it("says when the reader supplied the kind", async () => {
    withPersona("Student");
    vi.spyOn(api, "assessDocument").mockResolvedValue(
      assessment({ kindWasDeclared: true, kindEvidence: "You told Radar what this is." }),
    );

    renderPage(<AssessDocument />);
    upload();

    expect(await screen.findByText(/assessed as a/i)).toBeTruthy();
  });

  // A wrong detection is correctable without re-uploading.
  it("offers a correction when it detected the kind itself", async () => {
    withPersona("Student");
    vi.spyOn(api, "assessDocument").mockResolvedValue(assessment());

    renderPage(<AssessDocument />);
    upload();

    expect(await screen.findByText(/not a essay\?|not an essay\?/i)).toBeTruthy();
  });
});

/// Pasting, which is how most work actually arrives.
///
/// The screen took a file and nothing else, so anybody whose writing was open in a window had to
/// export it first - a step that existed only because the endpoint wanted one. The endpoint took
/// pasted text the whole time.
describe("handing in work that was never a file", () => {
  function paste(body: string) {
    fireEvent.change(screen.getByPlaceholderText(/paste your work here/i), {
      target: { value: body },
    });
  }

  it("sends what was pasted", async () => {
    withPersona("Student");
    const assessSpy = vi.spyOn(api, "assessDocument").mockResolvedValue(assessment());

    renderPage(<AssessDocument />);
    paste("a".repeat(500));
    fireEvent.click(screen.getByRole("button", { name: "Assess this" }));

    await waitFor(() =>
      expect(assessSpy).toHaveBeenLastCalledWith({ text: "a".repeat(500), kind: undefined }),
    );
  });

  /// Said before the round trip, not after it.
  ///
  /// The endpoint refuses anything under four hundred characters, because below that an
  /// assessment is confident nonsense about something nobody read. Finding that out by waiting
  /// for a refusal teaches the same thing more slowly.
  it("will not send an extract too short to judge", () => {
    withPersona("Student");
    const assessSpy = vi.spyOn(api, "assessDocument").mockResolvedValue(assessment());

    renderPage(<AssessDocument />);
    paste("Too short to judge.");

    expect(screen.getByRole("button", { name: "Assess this" }).hasAttribute("disabled")).toBe(true);
    expect(screen.getByText(/more characters before there is enough/i)).toBeTruthy();
    expect(assessSpy).not.toHaveBeenCalled();
  });

  /// And nothing is said about an empty box, which is not a mistake yet.
  it("says nothing about a box nobody has typed in", () => {
    withPersona("Student");

    renderPage(<AssessDocument />);

    expect(screen.queryByText(/more characters before there is enough/i)).toBeNull();
  });

  /// A declared kind is carried with the paste, the same as with a file.
  it("sends the kind the reader typed along with the text", async () => {
    withPersona("Student");
    vi.spyOn(api, "getRubric").mockResolvedValue({
      kind: "GrantApplication",
      assessedAs: "Student",
      criteria: [],
    });
    const assessSpy = vi.spyOn(api, "assessDocument").mockResolvedValue(assessment());

    renderPage(<AssessDocument />);
    paste("a".repeat(500));
    fireEvent.click(screen.getByRole("button", { name: "Grant or scholarship application" }));
    fireEvent.click(screen.getByRole("button", { name: "Assess this" }));

    await waitFor(() =>
      expect(assessSpy).toHaveBeenLastCalledWith({
        text: "a".repeat(500),
        kind: "GrantApplication",
      }),
    );
  });
});

/// Typing what you have, rather than choosing which of seven it is least unlike.
describe("saying what kind of work it is", () => {
  function typeKind(what: string) {
    fireEvent.change(screen.getByPlaceholderText(/dissertation chapter/i), {
      target: { value: what },
    });
  }

  it("offers every standard before anything is typed", () => {
    withPersona("Student");

    renderPage(<AssessDocument />);

    expect(screen.getByRole("button", { name: "CV" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Pitch deck" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Technical documentation" })).toBeTruthy();
  });

  it("narrows to the standard that fits what was typed", () => {
    withPersona("Student");

    renderPage(<AssessDocument />);
    typeKind("funding bid");

    expect(screen.getByRole("button", { name: "Grant or scholarship application" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "CV" })).toBeNull();
  });

  /// Nothing rather than the nearest thing.
  ///
  /// Quietly judging a wedding speech against the personal-statement standard is how a judgement
  /// nobody can account for happens. The rubrics are authored, so when none fits, the screen says
  /// so and the work is read as whatever it is instead.
  it("says when it has no standard for what was typed", () => {
    withPersona("Student");

    renderPage(<AssessDocument />);
    typeKind("wedding speech");

    expect(screen.getByText(/no written standard for that/i)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Essay" })).toBeNull();
  });
});
