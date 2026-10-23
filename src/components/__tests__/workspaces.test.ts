import { describe, expect, it } from "vitest";
import { isItemActive, WORKSPACES, workspaceForPath } from "../workspaces";

const learn = WORKSPACES.find((w) => w.id === "learn")!;
const intelligence = WORKSPACES.find((w) => w.id === "intelligence")!;

function activeLabels(items: typeof learn.items, pathname: string): string[] {
  return items.filter((item) => isItemActive(item, pathname, items)).map((item) => item.label);
}

describe("workspaceForPath", () => {
  it("resolves the three workspaces from their homes", () => {
    expect(workspaceForPath("/").id).toBe("intelligence");
    expect(workspaceForPath("/learn").id).toBe("learn");
    expect(workspaceForPath("/opportunities").id).toBe("opportunities");
  });

  it("keeps nested learn routes inside Learn rather than falling back to the root", () => {
    expect(workspaceForPath("/learn/path").id).toBe("learn");
    expect(workspaceForPath("/learn/hub").id).toBe("learn");
  });

  it("puts Feed inside Intelligence", () => {
    expect(workspaceForPath("/feed").id).toBe("intelligence");
    expect(workspaceForPath("/notebook").id).toBe("intelligence");
  });

  it("is case insensitive", () => {
    expect(workspaceForPath("/Learn/Path").id).toBe("learn");
  });

  // Intelligence is the home of the app; a sidebar with nothing selected is worse than one that
  // defaults somewhere sensible.
  it("falls back to Intelligence for anything unrecognised", () => {
    expect(workspaceForPath("/settings").id).toBe("intelligence");
  });
});

describe("isItemActive", () => {
  // The bug this guards: a plain startsWith lit up both "Learn" (/learn) and "My path"
  // (/learn/path) on the journey page. Two current rows, neither wrong on its own terms.
  it("marks exactly one item current on a nested route", () => {
    expect(activeLabels(learn.items, "/learn/path")).toEqual(["My path"]);
    expect(activeLabels(learn.items, "/learn/hub")).toEqual(["Hub"]);
  });

  it("marks the entry screen current on the workspace home", () => {
    expect(activeLabels(learn.items, "/learn")).toEqual(["Learn"]);
  });

  it("does not let the root claim every page", () => {
    expect(activeLabels(intelligence.items, "/")).toEqual(["Today"]);
    expect(activeLabels(intelligence.items, "/feed")).toEqual(["Feed"]);
  });

  // Matching on segments, not characters: "/learn" must not claim a route that merely starts
  // with those letters.
  it("does not match a partial path segment", () => {
    expect(isItemActive({ label: "Learn", path: "/learn", icon: "explore" }, "/learnhub")).toBe(false);
  });

  it("honours the extra paths an item declares", () => {
    expect(activeLabels(intelligence.items, "/source/abc")).toEqual(["Feed"]);
    expect(activeLabels(learn.items, "/showcase")).toEqual(["Projects"]);
  });
});
