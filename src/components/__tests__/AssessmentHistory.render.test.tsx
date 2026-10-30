import { describe, expect, it, vi } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import { AssessmentHistory } from "../AssessmentHistory";
import { renderPage } from "../../test/harness";
import * as api from "../../lib/api";
import type { DocumentAssessment } from "../../lib/types";

/// Everything Radar has assessed, reachable.
///
/// Every assessment was already stored, and getAssessments was already written against an
/// endpoint that already existed - and nothing in the product called it. So somebody handed in
/// a CV, read the feedback, closed the tab, and it was gone.

function assessment(overrides: Partial<DocumentAssessment> = {}): DocumentAssessment {
  return {
    id: "a1",
    fileName: "my-cv.pdf",
    wasAssessed: true,
    kind: "Cv",
    kindEvidence: "It lists roles and dates.",
    kindWasDeclared: false,
    assessedAs: "Graduate",
    criteria: [],
    strengths: [],
    mostValuableChange: "Lead with what you built, not where you sat.",
    assessedAt: "2026-10-28T09:00:00Z",
    ...overrides,
  } as DocumentAssessment;
}

describe("AssessmentHistory", () => {
  it("lists what was handed in before", async () => {
    vi.spyOn(api, "getAssessments").mockResolvedValue([
      assessment(),
      assessment({ id: "a2", fileName: "essay.docx", kind: "Essay" }),
    ]);

    renderPage(<AssessmentHistory onOpen={() => {}} />);

    expect(await screen.findByText("my-cv.pdf")).toBeTruthy();
    expect(screen.getByText("essay.docx")).toBeTruthy();
  });

  it("opens the one that was pressed", async () => {
    vi.spyOn(api, "getAssessments").mockResolvedValue([assessment()]);
    const opened = vi.fn();

    renderPage(<AssessmentHistory onOpen={opened} />);
    fireEvent.click(await screen.findByText("my-cv.pdf"));

    expect(opened).toHaveBeenCalledWith(expect.objectContaining({ id: "a1" }));
  });

  /// Nothing yet is not a state worth a panel. The first assessment makes it appear.
  it("shows nothing at all before anything has been assessed", async () => {
    vi.spyOn(api, "getAssessments").mockResolvedValue([]);

    const { container } = renderPage(<AssessmentHistory onOpen={() => {}} />);

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(container.querySelector(".assess-history")).toBeNull();
  });

  /// An assessment Radar could not complete says so, rather than showing a summary of nothing.
  it("does not summarise an assessment that never happened", async () => {
    vi.spyOn(api, "getAssessments").mockResolvedValue([
      assessment({ wasAssessed: false, mostValuableChange: null, notAssessedReason: "Radar could not read it." }),
    ]);

    renderPage(<AssessmentHistory onOpen={() => {}} />);

    expect(await screen.findByText("Not assessed")).toBeTruthy();
  });

  /// Text pasted in has no filename, and "undefined" is not a title.
  it("names pasted work rather than leaving it blank", async () => {
    vi.spyOn(api, "getAssessments").mockResolvedValue([assessment({ fileName: "" })]);

    renderPage(<AssessmentHistory onOpen={() => {}} />);

    expect(await screen.findByText("Pasted text")).toBeTruthy();
  });
});
