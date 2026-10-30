import { describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { PathControls } from "../PathControls";
import { renderPage } from "../../test/harness";
import * as api from "../../lib/api";
import type { GrowthRoadmap } from "../../lib/types";

/// Changing and editing a path, from the screen the path is on.
///
/// It used to mean going to Settings, editing the interests a path is derived from, and
/// generating a new one — so the paths somebody had already built were unreachable from the
/// screen that shows them, and moving between two subjects meant starting over each time.

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
    ...overrides,
  } as GrowthRoadmap;
}

function open() {
  fireEvent.click(screen.getByRole("button", { name: /change or edit this path/i }));
}

describe("PathControls", () => {
  /// Closed until asked for. The common visit to a path is to read it.
  it("asks for nothing until it is opened", () => {
    const spy = vi.spyOn(api, "getRoadmaps").mockResolvedValue([]);

    renderPage(<PathControls current={roadmap()} />);

    expect(spy).not.toHaveBeenCalled();
  });

  it("offers the learner's other paths", async () => {
    vi.spyOn(api, "getRoadmaps").mockResolvedValue([
      roadmap(),
      roadmap({ id: "r2", title: "Public health", interest: "Public health" }),
    ]);

    renderPage(<PathControls current={roadmap()} />);
    open();

    expect(await screen.findByText("Public health")).toBeTruthy();
    // Not the one they are already on.
    expect(screen.queryByText("Prompt engineering")).toBeNull();
  });

  it("switches to the path that was pressed", async () => {
    vi.spyOn(api, "getRoadmaps").mockResolvedValue([
      roadmap({ id: "r2", title: "Public health", interest: "Public health" }),
    ]);
    const spy = vi
      .spyOn(api, "activateRoadmap")
      .mockResolvedValue(roadmap({ id: "r2", title: "Public health" }));

    renderPage(<PathControls current={roadmap()} />);
    open();

    fireEvent.click(await screen.findByText("Public health"));

    await waitFor(() => expect(spy).toHaveBeenCalledWith("r2"));
  });

  it("says so when this is the only path", async () => {
    vi.spyOn(api, "getRoadmaps").mockResolvedValue([roadmap()]);

    renderPage(<PathControls current={roadmap()} />);
    open();

    expect(await screen.findByText(/this is your only path/i)).toBeTruthy();
  });

  /// Adding a subject builds a section on what was typed.
  it("adds the subject that was typed", async () => {
    vi.spyOn(api, "getRoadmaps").mockResolvedValue([]);
    const spy = vi.spyOn(api, "addPathSection").mockResolvedValue(roadmap());

    renderPage(<PathControls current={roadmap()} />);
    open();

    fireEvent.change(screen.getByPlaceholderText(/what do you want to learn next/i), {
      target: { value: "Statistics" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));

    await waitFor(() => expect(spy).toHaveBeenCalledWith("Statistics", "Beginner"));
  });

  /// Nothing is built from an empty box.
  ///
  /// Radar asks what somebody wants rather than deriving it, and a control that fires on an
  /// empty input is a control that picks a subject on their behalf.
  it("builds nothing from an empty box", async () => {
    vi.spyOn(api, "getRoadmaps").mockResolvedValue([]);
    const spy = vi.spyOn(api, "addPathSection").mockResolvedValue(roadmap());

    renderPage(<PathControls current={roadmap()} />);
    open();

    const add = await screen.findByRole("button", { name: "Add" });
    expect(add.hasAttribute("disabled")).toBe(true);

    fireEvent.click(add);
    expect(spy).not.toHaveBeenCalled();
  });

  it("surfaces the reason a switch was refused", async () => {
    vi.spyOn(api, "getRoadmaps").mockResolvedValue([
      roadmap({ id: "r2", title: "Public health", interest: "Public health" }),
    ]);
    vi.spyOn(api, "activateRoadmap").mockRejectedValue(
      new api.ApiError(404, "That path is not one of yours."),
    );

    renderPage(<PathControls current={roadmap()} />);
    open();
    fireEvent.click(await screen.findByText("Public health"));

    expect(await screen.findByText(/not one of yours/i)).toBeTruthy();
  });
});
