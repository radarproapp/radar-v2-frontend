import { describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { PathHistory } from "../PathHistory";
import { renderPage } from "../../test/harness";
import * as api from "../../lib/api";
import type { GrowthRoadmap, RoadmapLesson, RoadmapModule } from "../../lib/types";

/// The paths a learner has built, and how far they got in each one.
///
/// Switching path was already possible from a panel in the path header, which listed the other
/// paths by title and section count. These are the assertions that panel could not make: which
/// path they are on, how much of each one is done, when it was started, and whether everything in
/// it is finished.
///
/// The four that moved here — listing the paths, switching to the one that was pressed, surfacing
/// a refusal, and saying what is true when there is only one — came from the panel's own suite,
/// because the behaviour moved rather than disappeared.

function lesson(id: string, isCompleted: boolean): RoadmapLesson {
  return { id, title: id, body: "", order: 1, isCompleted, estimatedTime: null };
}

function section(lessons: RoadmapLesson[]): RoadmapModule {
  return {
    id: `s-${lessons.map((l) => l.id).join("")}`,
    title: "A section",
    description: "",
    order: 1,
    isCompleted: false,
    isLocked: false,
    lessons,
    contentItemIds: [],
  };
}

function roadmap(overrides: Partial<GrowthRoadmap> = {}): GrowthRoadmap {
  return {
    id: "r1",
    userId: "u1",
    title: "Prompt engineering",
    goal: "Win a scholarship",
    interest: "Prompt engineering",
    level: "Beginner",
    modules: [],
    progressPercent: 0,
    createdAt: "2024-03-04T09:00:00Z",
    isActive: true,
    ...overrides,
  } as GrowthRoadmap;
}

describe("PathHistory", () => {
  it("lists every path the learner has built, including the one they are on", async () => {
    vi.spyOn(api, "getRoadmaps").mockResolvedValue([
      roadmap(),
      roadmap({ id: "r2", title: "Public health", isActive: false }),
    ]);

    renderPage(<PathHistory currentId="r1" onResumed={() => {}} />);

    expect(await screen.findByText("Public health")).toBeTruthy();
    // The switcher it replaces only ever listed the others, so the one fact that would have
    // anchored the rest - where they are now - was the one it never showed.
    expect(screen.getByText("Prompt engineering")).toBeTruthy();
    expect(screen.getByText(/the path you are on/i)).toBeTruthy();
  });

  it("counts progress from the lesson ticks rather than the stored percentage", async () => {
    vi.spyOn(api, "getRoadmaps").mockResolvedValue([
      roadmap({
        // The server folds resources and quiz results into progressPercent, so it does not agree
        // with the checkboxes the open path shows. Two numbers for one path on two tabs of the
        // same screen is worse than whichever of them is less complete.
        progressPercent: 90,
        modules: [section([lesson("a", true), lesson("b", false), lesson("c", false), lesson("d", false)])],
      }),
    ]);

    renderPage(<PathHistory currentId="r1" onResumed={() => {}} />);

    expect(await screen.findByText("1 of 4 lessons")).toBeTruthy();
    expect(screen.getByText("25%")).toBeTruthy();
    expect(screen.queryByText("90%")).toBeNull();
  });

  it("says when a path was started", async () => {
    vi.spyOn(api, "getRoadmaps").mockResolvedValue([roadmap()]);

    renderPage(<PathHistory currentId="r1" onResumed={() => {}} />);

    expect(await screen.findByText(/^Started .*2024$/)).toBeTruthy();
  });

  /// A path stored before `createdAt` existed has no start date, and `new Date(undefined)` renders
  /// as the words "Invalid Date". Radar says nothing about a date it does not have rather than
  /// guessing one from the first lesson or from the id.
  it("says nothing about the start of a path that carries no date", async () => {
    vi.spyOn(api, "getRoadmaps").mockResolvedValue([roadmap({ createdAt: undefined as never })]);

    renderPage(<PathHistory currentId="r1" onResumed={() => {}} />);

    expect(await screen.findByText("Prompt engineering")).toBeTruthy();
    expect(screen.queryByText(/started/i)).toBeNull();
    expect(screen.queryByText(/invalid date/i)).toBeNull();
  });

  /// There is no "finished on" field anywhere in a roadmap document, so a finished path is
  /// described as what is actually recorded — every lesson ticked — and is not dated.
  it("marks a path with every lesson done without inventing a date for it", async () => {
    vi.spyOn(api, "getRoadmaps").mockResolvedValue([
      roadmap({ modules: [section([lesson("a", true), lesson("b", true)])] }),
    ]);

    renderPage(<PathHistory currentId="r1" onResumed={() => {}} />);

    expect(await screen.findByText(/every lesson done/i)).toBeTruthy();
    expect(screen.queryByText(/finished on|completed on/i)).toBeNull();
  });

  /// An empty bar reads as "none of it done" when what is true is that there is nothing to do.
  it("says a path has no lessons rather than drawing it as nothing done", async () => {
    vi.spyOn(api, "getRoadmaps").mockResolvedValue([roadmap({ modules: [section([])] })]);

    renderPage(<PathHistory currentId="r1" onResumed={() => {}} />);

    expect(await screen.findByText(/could not write lessons for this path/i)).toBeTruthy();
    expect(screen.queryByText("0%")).toBeNull();
  });

  it("opens the path that was pressed", async () => {
    vi.spyOn(api, "getRoadmaps").mockResolvedValue([
      roadmap(),
      roadmap({ id: "r2", title: "Public health", isActive: false }),
    ]);
    const spy = vi
      .spyOn(api, "activateRoadmap")
      .mockResolvedValue(roadmap({ id: "r2", title: "Public health" }));

    renderPage(<PathHistory currentId="r1" onResumed={() => {}} />);

    fireEvent.click(await screen.findByRole("button", { name: /open this path/i }));

    await waitFor(() => expect(spy).toHaveBeenCalledWith("r2"));
  });

  /// Resuming is what somebody came to this tab for, so it has to land them on the path rather
  /// than leave them looking at the list wondering whether the press worked.
  it("returns to the open path once another one has been resumed", async () => {
    vi.spyOn(api, "getRoadmaps").mockResolvedValue([
      roadmap({ id: "r2", title: "Public health", isActive: false, modules: [section([lesson("a", true), lesson("b", false)])] }),
    ]);
    vi.spyOn(api, "activateRoadmap").mockResolvedValue(roadmap({ id: "r2" }));
    const resumed = vi.fn();

    renderPage(<PathHistory currentId="r1" onResumed={resumed} />);

    fireEvent.click(await screen.findByRole("button", { name: /resume this path/i }));

    await waitFor(() => expect(resumed).toHaveBeenCalled());
  });

  /// Reading /api/roadmaps/active rebuilds stale sections and attaches resources, so the document
  /// activate hands back is not the one the path screen will render. Written and then refetched,
  /// or the learner reads a path the server would have rewritten the moment it was asked for.
  ///
  /// The home brief names the next lesson on the active path, so it is on the list too: without
  /// it, Today goes on naming a lesson from the path they just left.
  it("refreshes everything that was reading the path they left", async () => {
    vi.spyOn(api, "getRoadmaps").mockResolvedValue([
      roadmap({ id: "r2", title: "Public health", isActive: false }),
    ]);
    const updated = roadmap({ id: "r2", title: "Public health" });
    vi.spyOn(api, "activateRoadmap").mockResolvedValue(updated);

    const { client } = renderPage(<PathHistory currentId="r1" onResumed={() => {}} />);

    const written = vi.spyOn(client, "setQueryData");
    const invalidated: unknown[][] = [];
    vi.spyOn(client, "invalidateQueries").mockImplementation((filters) => {
      invalidated.push(filters?.queryKey as unknown[]);
      return Promise.resolve();
    });

    fireEvent.click(await screen.findByRole("button", { name: /open this path/i }));

    await waitFor(() => expect(written).toHaveBeenCalledWith(["roadmap", "active"], updated));
    expect(invalidated).toContainEqual(["roadmap", "active"]);
    expect(invalidated).toContainEqual(["roadmaps", "all"]);
    expect(invalidated).toContainEqual(["home"]);
  });

  /// The path they are on is already loaded. Going back to it is a tab change and not a write.
  it("needs no server call to go back to the path already open", async () => {
    vi.spyOn(api, "getRoadmaps").mockResolvedValue([roadmap()]);
    const spy = vi.spyOn(api, "activateRoadmap");
    const resumed = vi.fn();

    renderPage(<PathHistory currentId="r1" onResumed={resumed} />);

    fireEvent.click(await screen.findByRole("button", { name: /back to this path/i }));

    expect(resumed).toHaveBeenCalled();
    expect(spy).not.toHaveBeenCalled();
  });

  it("surfaces the reason a path could not be opened", async () => {
    vi.spyOn(api, "getRoadmaps").mockResolvedValue([
      roadmap({ id: "r2", title: "Public health", isActive: false }),
    ]);
    vi.spyOn(api, "activateRoadmap").mockRejectedValue(
      new api.ApiError(404, "That path is not one of yours."),
    );

    renderPage(<PathHistory currentId="r1" onResumed={() => {}} />);
    fireEvent.click(await screen.findByRole("button", { name: /open this path/i }));

    expect(await screen.findByText(/not one of yours/i)).toBeTruthy();
  });

  /// Nothing yet is a real state, and it is the one a new account is in. It says what is true
  /// rather than filling the tab.
  it("says there is nothing yet when no path has been built", async () => {
    vi.spyOn(api, "getRoadmaps").mockResolvedValue([]);

    renderPage(<PathHistory currentId={null} onResumed={() => {}} />);

    expect(await screen.findByText(/you have not built a path yet/i)).toBeTruthy();
  });

  /// The tab is most useful when the active path failed to load, which is the state that has no
  /// current id to compare against. The stored flag answers it instead.
  it("marks the active path when the screen could not load one to compare against", async () => {
    vi.spyOn(api, "getRoadmaps").mockResolvedValue([
      roadmap({ id: "r2", title: "Public health", isActive: false }),
      roadmap({ isActive: true }),
    ]);

    renderPage(<PathHistory onResumed={() => {}} />);

    expect(await screen.findByText(/the path you are on/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: /back to this path/i })).toBeTruthy();
  });

  it("surfaces the reason the list could not be loaded", async () => {
    vi.spyOn(api, "getRoadmaps").mockRejectedValue(new api.ApiError(503, "Radar is restarting."));

    renderPage(<PathHistory currentId="r1" onResumed={() => {}} />);

    expect(await screen.findByText(/radar is restarting/i)).toBeTruthy();
  });
});
