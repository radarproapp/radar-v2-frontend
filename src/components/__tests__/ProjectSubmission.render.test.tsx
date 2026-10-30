import { describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { ProjectSubmissionPanel } from "../ProjectSubmission";
import { renderPage } from "../../test/harness";
import * as api from "../../lib/api";
import type { ProjectAssessment, StudioProject } from "../../lib/types";

/// Handing a project in, and seeing what Radar made of it.
///
/// All of this existed on the server and nowhere a learner could reach it: submissions, the five
/// kinds, the standards per stage, the mark out of ten and the bar at six. The screen offered a
/// plan, some tips and a share link — so a project could be started and never handed in.

function project(overrides: Partial<StudioProject> = {}): StudioProject {
  return {
    id: "p1",
    templateId: "",
    title: "Map your own network",
    description: "A diagram of every device.",
    userId: "u1",
    isCompleted: false,
    isPublic: false,
    createdAt: "2026-10-01T00:00:00Z",
    completedAt: null,
    ...overrides,
  } as StudioProject;
}

function assessed(score: number | null, overrides: Partial<ProjectAssessment> = {}): StudioProject {
  return project({
    submissions: [
      {
        id: "s1",
        kind: "Document",
        notes: "What I built",
        submittedAt: "2026-10-02T00:00:00Z",
        assessment: {
          score,
          isAccepted: score !== null && score >= 6,
          verdict: score !== null && score >= 6 ? "Accepted. It clears the bar." : "Not accepted yet.",
          criteria: [
            {
              name: "It is finished",
              asks: "Does it do the thing end to end?",
              verdict: "NotMet",
              evidence: "The diagram stops after two devices.",
              fix: "Add the remaining devices and their links.",
            },
          ],
          judgedFrom: "the document you handed in",
          assessedAt: "2026-10-02T00:00:00Z",
          ...overrides,
        },
      },
    ],
  });
}

describe("handing a project in", () => {
  /// The five kinds the spec names.
  it("offers code, image, video, document and link", () => {
    renderPage(<ProjectSubmissionPanel project={project()} />);
    fireEvent.click(screen.getByRole("button", { name: /show your work/i }));

    for (const kind of ["Code", "Image", "Video", "Document", "Link"]) {
      expect(screen.getByRole("button", { name: kind })).toBeTruthy();
    }
  });

  /// A kind Radar cannot read says so, rather than implying it watched the video.
  it("says what it can and cannot read", () => {
    renderPage(<ProjectSubmissionPanel project={project()} />);
    fireEvent.click(screen.getByRole("button", { name: /show your work/i }));
    fireEvent.click(screen.getByRole("button", { name: "Video" }));

    expect(screen.getByText(/cannot watch a video/i)).toBeTruthy();
  });

  /// Nothing is handed in without something to judge.
  it("will not submit an empty attempt", () => {
    const spy = vi.spyOn(api, "submitProject");

    renderPage(<ProjectSubmissionPanel project={project()} />);
    fireEvent.click(screen.getByRole("button", { name: /show your work/i }));

    expect(screen.getByRole("button", { name: /hand it in/i }).hasAttribute("disabled")).toBe(true);
    expect(spy).not.toHaveBeenCalled();
  });

  it("sends a link submission", async () => {
    const spy = vi.spyOn(api, "submitProject").mockResolvedValue(project());

    renderPage(<ProjectSubmissionPanel project={project()} />);
    fireEvent.click(screen.getByRole("button", { name: /show your work/i }));
    fireEvent.click(screen.getByRole("button", { name: "Link" }));

    fireEvent.change(screen.getByPlaceholderText("https://…"), {
      target: { value: "https://github.com/me/thing" },
    });
    fireEvent.change(screen.getByPlaceholderText(/what did you build/i), {
      target: { value: "A scanner that maps the subnet." },
    });

    fireEvent.click(screen.getByRole("button", { name: /hand it in/i }));

    await waitFor(() =>
      expect(spy).toHaveBeenCalledWith("p1", {
        kind: "Link",
        notes: "A scanner that maps the subnet.",
        file: undefined,
        url: "https://github.com/me/thing",
      }),
    );
  });
});

describe("what Radar made of it", () => {
  /// The mark, and what it was judged against.
  it("shows the mark with the criteria behind it", () => {
    renderPage(<ProjectSubmissionPanel project={assessed(4)} />);

    expect(screen.getByText("4 / 10")).toBeTruthy();
    expect(screen.getByText("It is finished")).toBeTruthy();
    expect(screen.getByText("The diagram stops after two devices.")).toBeTruthy();
    expect(screen.getByText(/add the remaining devices/i)).toBeTruthy();
  });

  /// Finishing is offered only once the work has earned it.
  ///
  /// The server refuses below the bar, and a button that is always there teaches people to press
  /// it and be told no.
  it("does not offer to finish work under the bar", () => {
    renderPage(<ProjectSubmissionPanel project={assessed(4)} />);

    expect(screen.queryByRole("button", { name: /mark it finished/i })).toBeNull();
  });

  it("offers to finish work that cleared the bar", () => {
    renderPage(<ProjectSubmissionPanel project={assessed(8)} />);

    expect(screen.getByRole("button", { name: /mark it finished/i })).toBeTruthy();
  });

  /// No mark is not a mark of zero.
  ///
  /// A provider failure is not a finding about the work, and showing it as one tells somebody
  /// their project scored nothing when nobody looked at it.
  it("says nothing was assessed rather than showing a zero", () => {
    renderPage(
      <ProjectSubmissionPanel
        project={assessed(null, {
          notAssessedReason: "Radar could not assess this just now. Submit it again shortly.",
          criteria: [],
        })}
      />,
    );

    expect(screen.getByText(/could not assess this just now/i)).toBeTruthy();
    expect(screen.queryByText("0 / 10")).toBeNull();
  });

  /// And still shows what the work will be measured against.
  ///
  /// The standards come back whether or not a mark could be given - they are authored per stage,
  /// not produced by a model - so a learner waiting to be marked can still see what is being
  /// asked of them. That is the more useful half of an assessment.
  it("shows the standards even when no mark could be given", () => {
    renderPage(
      <ProjectSubmissionPanel
        project={assessed(null, {
          notAssessedReason: "Radar could not assess this just now.",
          criteria: [
            { name: "It is finished", asks: "Does it do the thing end to end?", verdict: "Unjudged", evidence: "" },
            { name: "You can show it", asks: "Could somebody else run it?", verdict: "Unjudged", evidence: "" },
          ],
        })}
      />,
    );

    expect(screen.getByText(/what it will be judged against/i)).toBeTruthy();
    expect(screen.getByText("It is finished")).toBeTruthy();
    expect(screen.getByText("Could somebody else run it?")).toBeTruthy();
  });
});
