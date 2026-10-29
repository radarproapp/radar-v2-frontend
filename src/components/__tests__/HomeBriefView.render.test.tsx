import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { HomeBriefView } from "../HomeBriefView";
import { renderPage } from "../../test/harness";
import * as api from "../../lib/api";
import type { HomeBrief } from "../../lib/types";

/// The first screen after signing in, which is the worst one to render nothing.
///
/// Reported as a blank content area with the sidebar still in place. Every section here was read
/// as if the server always sends it — brief.topSignals.length, brief.stats.learningStreakDays —
/// so a response missing any one of them throws during render and the screen goes. A brief with
/// a section missing should show the sections it has.
///
/// The same shape of bug was found on the opportunities page the same day: one absent count map
/// took the whole page to a blank screen.

function full(): HomeBrief {
  return {
    context: "Three things today.",
    topSignals: [],
    noticed: [],
    todaysFocus: null,
    nextBuild: null,
    opportunities: [],
    closingSoon: [],
    stats: {
      learningStreakDays: 4,
      roadmapProgressPercent: 30,
      savedResourcesCount: 7,
      projectsCompleted: 1,
    } as never,
  };
}

describe("HomeBriefView", () => {
  it("renders a brief that has everything", async () => {
    vi.spyOn(api, "getHome").mockResolvedValue(full());

    renderPage(<HomeBriefView firstName="Mercy" />);

    expect(await screen.findByText(/good day, mercy/i)).toBeTruthy();
    expect(screen.getByText("4-day")).toBeTruthy();
  });

  /// Each section, absent on its own.
  it.each([
    "topSignals",
    "noticed",
    "opportunities",
    "closingSoon",
    "stats",
    "context",
  ] as const)("still renders when %s is missing", async (missing) => {
    const brief = full() as Record<string, unknown>;
    delete brief[missing];
    vi.spyOn(api, "getHome").mockResolvedValue(brief as HomeBrief);

    renderPage(<HomeBriefView firstName="Mercy" />);

    expect(await screen.findByText(/good day, mercy/i)).toBeTruthy();
  });

  /// And all of them at once, which is what an account Radar has nothing for looks like.
  it("renders when the server sends almost nothing", async () => {
    vi.spyOn(api, "getHome").mockResolvedValue({} as HomeBrief);

    renderPage(<HomeBriefView firstName="Mercy" />);

    expect(await screen.findByText(/good day, mercy/i)).toBeTruthy();
    expect(screen.getByText(/still building your brief/i)).toBeTruthy();
  });

  /// A failed call says so rather than leaving the space empty.
  it("says so when the brief cannot be loaded", async () => {
    vi.spyOn(api, "getHome").mockRejectedValue(new api.ApiError(500, "nope"));

    renderPage(<HomeBriefView firstName="Mercy" />);

    expect(await screen.findByText(/couldn't load your brief/i)).toBeTruthy();
  });
});
