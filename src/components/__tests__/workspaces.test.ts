import { describe, expect, it } from "vitest";
import { isItemActive, WORKSPACES, workspaceForPath } from "../workspaces";

const learn = WORKSPACES.find((w) => w.id === "learn")!;
const intelligence = WORKSPACES.find((w) => w.id === "intelligence")!;

function activeLabels(items: typeof learn.items, pathname: string): string[] {
  return items.filter((item) => isItemActive(item, pathname, items)).map((item) => item.label);
}

describe("workspaceForPath", () => {
  it("resolves the two workspaces from their homes", () => {
    expect(workspaceForPath("/").id).toBe("intelligence");
    expect(workspaceForPath("/learn").id).toBe("learn");
  });

  // Two products, not three. Opportunities is something Radar finds for you, which is the job
  // Intelligence does — it was never a third thing to switch to.
  it("puts Opportunities inside Intelligence", () => {
    expect(WORKSPACES).toHaveLength(2);
    expect(workspaceForPath("/opportunities").id).toBe("intelligence");
  });

  it("keeps nested learn routes inside Learn rather than falling back to the root", () => {
    expect(workspaceForPath("/learn/path").id).toBe("learn");
    expect(workspaceForPath("/learn/build").id).toBe("learn");
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
  // The bug this guards: a plain startsWith lit up two sibling rows at once when one item's path
  // was a prefix of another's. Only the most specific claim may win.
  it("marks exactly one item current on a nested route", () => {
    expect(activeLabels(learn.items, "/learn/hub")).toEqual(["Hub"]);
    expect(activeLabels(intelligence.items, "/feed")).toEqual(["Feed"]);
  });

  it("marks My path current on the workspace home", () => {
    expect(activeLabels(learn.items, "/learn")).toEqual(["My path"]);
  });

  // The builder and the legacy /learn/path link both belong to My path, so the sidebar does not
  // go blank while a learner is answering the three questions.
  it("keeps My path current through the builder and the legacy path route", () => {
    expect(activeLabels(learn.items, "/learn/build")).toEqual(["My path"]);
    expect(activeLabels(learn.items, "/learn/path")).toEqual(["My path"]);
  });

  it("does not let the root claim every page", () => {
    expect(activeLabels(intelligence.items, "/")).toEqual(["Today"]);
    expect(activeLabels(intelligence.items, "/feed")).toEqual(["Feed"]);
  });

  // Matching on segments, not characters: "/learn" must not claim a route that merely starts
  // with those letters.
  it("does not match a partial path segment", () => {
    expect(isItemActive({ label: "My path", path: "/learn", icon: "checklist" }, "/learnhub")).toBe(false);
  });

  // Research Discovery is reached from the Hub and has no sidebar row of its own, so the Hub
  // claims the route. Without that, workspaceForPath falls back to Intelligence and a learner
  // searching the literature watches the Learn sidebar disappear.
  it("keeps the Learn sidebar on the research page, with Hub current", () => {
    expect(workspaceForPath("/research").id).toBe("learn");
    expect(activeLabels(learn.items, "/research")).toEqual(["Hub"]);
  });

  it("marks Opportunities current on its own route", () => {
    expect(activeLabels(intelligence.items, "/opportunities")).toEqual(["Opportunities"]);
  });

  it("honours the extra paths an item declares", () => {
    expect(activeLabels(intelligence.items, "/source/abc")).toEqual(["Feed"]);
    expect(activeLabels(learn.items, "/showcase")).toEqual(["Projects"]);
  });
});
