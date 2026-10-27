import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { GrowthTracker } from "../GrowthTracker";
import { renderPage } from "../../test/harness";
import * as api from "../../lib/api";
import type { UserGraph } from "../../lib/types";

/// The page that showed nine zeros to everybody.
///
/// It read ArticlesRead, PodcastsFinished, VideosWatched and OpportunitiesApplied off
/// profile.stats, and nothing in the codebase ever wrote to any of them. The suite was green the
/// whole time, because there was no test that rendered it.
///
/// So these assert the two things that were wrong: a number with nothing behind it must not
/// appear, and a brand-new account must be told what to do rather than shown a wall of noughts.

function graph(overrides: Partial<UserGraph> = {}): UserGraph {
  return {
    firstActivityAt: "2026-01-04T10:00:00Z",
    lastActivityAt: "2026-10-27T10:00:00Z",
    hasActivity: true,
    listening: {
      secondsPlayed: 0,
      episodesStarted: 0,
      episodesFinished: 0,
      videosStarted: 0,
      videosFinished: 0,
      mostPlayed: null,
    },
    learning: {
      pathSections: 0,
      lessonsCompleted: 0,
      lessonsTotal: 0,
      quizzesTaken: 0,
      averageQuizScore: null,
      projectsCompleted: 0,
      exercisesCompleted: 0,
      subjects: [],
      weakAreas: [],
    },
    opportunities: { saved: 0, applied: 0, byStatus: {} },
    reading: { itemsOpened: 0, itemsSaved: 0, papersOpened: 0, notesWritten: 0, capturesMade: 0 },
    topTopics: [],
    topSources: [],
    months: [],
    ...overrides,
  };
}

describe("GrowthTracker", () => {
  it("renders without throwing", async () => {
    vi.spyOn(api, "getUserGraph").mockResolvedValue(graph());
    renderPage(<GrowthTracker />);

    expect(await screen.findByText("Your graph")).toBeTruthy();
  });

  /// The whole bug, as an assertion. A tile with no rows behind it is omitted, so the page cannot
  /// claim somebody read nothing — it simply does not raise the subject.
  it("omits tiles with nothing behind them rather than drawing a zero", async () => {
    vi.spyOn(api, "getUserGraph").mockResolvedValue(
      graph({
        reading: { itemsOpened: 12, itemsSaved: 0, papersOpened: 0, notesWritten: 0, capturesMade: 0 },
      }),
    );

    renderPage(<GrowthTracker />);

    expect(await screen.findByText("Briefs opened")).toBeTruthy();
    expect(screen.queryByText("Papers opened")).toBeNull();
    expect(screen.queryByText("Notes written")).toBeNull();
    expect(screen.queryByText("Applications")).toBeNull();
  });

  // hasActivity comes from the server rather than being inferred from a sum being zero, so the
  // page does not have to guess whether an empty graph is new or broken.
  it("offers a new account something to do instead of an empty dashboard", async () => {
    vi.spyOn(api, "getUserGraph").mockResolvedValue(graph({ hasActivity: false }));
    renderPage(<GrowthTracker />);

    expect(await screen.findByText("Nothing to show yet")).toBeTruthy();
    expect(screen.getByRole("button", { name: /open your feed/i })).toBeTruthy();
    expect(screen.queryByText("Briefs opened")).toBeNull();
  });

  it("shows time listened as a duration a person would say", async () => {
    vi.spyOn(api, "getUserGraph").mockResolvedValue(
      graph({
        listening: {
          secondsPlayed: 4 * 3600 + 12 * 60,
          episodesStarted: 3,
          episodesFinished: 1,
          videosStarted: 0,
          videosFinished: 0,
          mostPlayed: null,
        },
      }),
    );

    renderPage(<GrowthTracker />);

    expect(await screen.findByText("4h 12m")).toBeTruthy();
    // Started and finished together, because finishing one of three is the interesting part.
    expect(screen.getByText("1/3")).toBeTruthy();
  });

  /// Null average is not a zero average. "You have not completed one yet" and "you scored
  /// nothing" are different claims and the page must not merge them.
  it("does not print a quiz average when no quiz is complete", async () => {
    vi.spyOn(api, "getUserGraph").mockResolvedValue(
      graph({
        learning: {
          pathSections: 1,
          lessonsCompleted: 0,
          lessonsTotal: 4,
          quizzesTaken: 2,
          averageQuizScore: null,
          projectsCompleted: 0,
      exercisesCompleted: 0,
          subjects: ["Cybersecurity"],
          weakAreas: [],
        },
      }),
    );

    renderPage(<GrowthTracker />);

    expect(await screen.findByText("Quizzes taken")).toBeTruthy();
    expect(screen.queryByText(/0% average/)).toBeNull();
  });

  it("says so when the graph cannot be read", async () => {
    vi.spyOn(api, "getUserGraph").mockRejectedValue(new Error("boom"));
    renderPage(<GrowthTracker />);

    // findBy rather than waitFor: it polls with the same timeout but reports the DOM it gave up
    // on, which is the difference between debugging this in one run and in three.
    expect(await screen.findByText("Could not load your graph", {}, { timeout: 3000 })).toBeTruthy();
  });
});
