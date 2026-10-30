import { describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { LearnPath } from "../LearnPath";
import { renderPage } from "../../test/harness";
import * as api from "../../lib/api";
import type { GrowthRoadmap } from "../../lib/types";

/// The path screen, and the two tabs on it.
///
/// The tab bar is on every state this page can be in, and the two that mattered most were the two
/// that used to be dead ends. An empty path is where somebody lands after removing their last
/// section, and a path that fails to load is the other way to end up with no path on screen — and
/// in both of those states the paths a learner had already built were unreachable.
///
/// Which is why the history branch sits ahead of the loading and error branches: behind them it
/// would have been covered by a skeleton while the open lesson loaded, and gone altogether when
/// the active path failed.

function roadmap(overrides: Partial<GrowthRoadmap> = {}): GrowthRoadmap {
  return {
    id: "r1",
    userId: "u1",
    title: "Prompt engineering",
    goal: "Win a scholarship",
    interest: "Prompt engineering",
    level: "Beginner",
    createdAt: "2024-03-04T09:00:00Z",
    isActive: true,
    progressPercent: 0,
    modules: [
      {
        id: "m1",
        title: "Beginner: Foundations",
        description: "",
        order: 1,
        isCompleted: false,
        isLocked: false,
        lessons: [
          { id: "l1", title: "What a prompt is", body: "Some prose.", order: 1, isCompleted: false, estimatedTime: "10 min" },
        ],
        contentItemIds: [],
      },
    ],
    ...overrides,
  } as GrowthRoadmap;
}

describe("LearnPath tabs", () => {
  it("lists the paths built before, from the path screen", async () => {
    vi.spyOn(api, "getActiveRoadmap").mockResolvedValue(roadmap());
    vi.spyOn(api, "getRoadmaps").mockResolvedValue([
      roadmap(),
      roadmap({ id: "r2", title: "Public health", isActive: false }),
    ]);

    renderPage(<LearnPath />);

    expect(await screen.findByRole("heading", { name: "What a prompt is" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /path history/i }));

    expect(await screen.findByText("Public health")).toBeTruthy();
  });

  /// The state somebody lands on after removing their last section. Without the tab, the paths
  /// they built became unreachable at exactly the moment they needed one of them.
  it("reaches the paths built before from an empty path", async () => {
    vi.spyOn(api, "getActiveRoadmap").mockRejectedValue(new api.ApiError(404, "No active roadmap"));
    vi.spyOn(api, "getRoadmaps").mockResolvedValue([
      roadmap({ id: "r2", title: "Public health", isActive: false }),
    ]);

    renderPage(<LearnPath />);

    expect(await screen.findByText(/your path is empty/i)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /path history/i }));

    expect(await screen.findByText("Public health")).toBeTruthy();
  });

  /// The error branch returned an error and nothing else, so a learner whose active path would not
  /// load had no route to the three others they had built.
  it("reaches the paths built before from a path that failed to load", async () => {
    vi.spyOn(api, "getActiveRoadmap").mockRejectedValue(new api.ApiError(503, "Radar is restarting."));
    vi.spyOn(api, "getRoadmaps").mockResolvedValue([
      roadmap({ id: "r2", title: "Public health", isActive: false }),
    ]);

    renderPage(<LearnPath />);

    expect(await screen.findByText(/radar is restarting/i)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /path history/i }));

    expect(await screen.findByText("Public health")).toBeTruthy();
  });

  /// Resuming is a move, not a report. It lands the learner on the path they chose rather than
  /// leaving them on the list wondering whether the press did anything.
  it("returns to the path after one is resumed from the history", async () => {
    vi.spyOn(api, "getActiveRoadmap").mockResolvedValue(roadmap());
    vi.spyOn(api, "getRoadmaps").mockResolvedValue([
      roadmap(),
      roadmap({ id: "r2", title: "Public health", isActive: false }),
    ]);
    const spy = vi
      .spyOn(api, "activateRoadmap")
      .mockResolvedValue(roadmap({ id: "r2", title: "Public health" }));

    renderPage(<LearnPath />);

    fireEvent.click(await screen.findByRole("button", { name: /path history/i }));
    fireEvent.click(await screen.findByRole("button", { name: /open this path/i }));

    await waitFor(() => expect(spy).toHaveBeenCalledWith("r2"));
    expect(await screen.findByRole("heading", { name: "What a prompt is" })).toBeTruthy();
  });

  /// <summary>Two surfaces for two jobs, and never both on screen at once.</summary>
  ///
  /// The inline panel is the quick move - change the open path, or switch to another, without
  /// leaving what you are reading. The tab is the fuller view: every path with its progress,
  /// when it was started and whether it is finished. They are on separate tabs, so a learner
  /// never meets two lists of the same thing, and the inline control stays where it was asked
  /// for - it is the pattern Radar Intelligence was asked to copy, not one to retire.
  it("keeps the quick switcher on the path tab and the fuller history on its own", async () => {
    vi.spyOn(api, "getRoadmaps").mockResolvedValue([
      roadmap(),
      roadmap({ id: "r2", title: "Public health", isActive: false }),
    ]);
    vi.spyOn(api, "getActiveRoadmap").mockResolvedValue(roadmap());

    renderPage(<LearnPath />);

    // The path tab: the panel is closed until asked for, and opens onto the subject box.
    fireEvent.click(await screen.findByRole("button", { name: /change or edit this path/i }));
    expect(screen.getByPlaceholderText(/what do you want to learn next/i)).toBeTruthy();

    // The history tab: the same paths, with what the inline list cannot show.
    fireEvent.click(screen.getByRole("button", { name: /path history/i }));
    expect(await screen.findByRole("button", { name: /open this path/i })).toBeTruthy();
  });
});
