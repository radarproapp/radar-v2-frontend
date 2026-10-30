// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";
import {
  clearStaleBuildReload,
  hasReloadedForStaleBuild,
  isStaleBuild,
} from "../lazy-page";

/// Loading a page's code across a deploy.
///
/// Vite puts a content hash in every chunk filename, so each deploy writes new ones and stops
/// serving the old. A browser holding the previous index.html still has the old filenames, so
/// navigating to a route whose code has not been fetched yet asks for a file that is gone.
/// Nothing is wrong with the account, the connection or the new build.

describe("recognising a stale build", () => {
  /// Each engine words it differently, and none of them words it for a reader.
  it.each([
    "Failed to fetch dynamically imported module: https://www.radarproapp.com/assets/LearnPath-DHvFAcaE.js",
    "error loading dynamically imported module",
    "Importing a module script failed.",
    "ChunkLoadError: Loading chunk 42 failed.",
    "Unable to preload CSS for /assets/index-abc.css",
  ])("knows %s is a deploy rather than a bug", (message) => {
    expect(isStaleBuild(new Error(message))).toBe(true);
  });

  /// An ordinary crash must not be reported as a deploy, or a real bug gets a reload and a
  /// reassuring sentence instead of attention.
  it.each([
    "Cannot read properties of undefined (reading 'length')",
    "Request failed with status 500",
    "profile is not defined",
  ])("does not mistake %s for a deploy", (message) => {
    expect(isStaleBuild(new Error(message))).toBe(false);
  });

  it("survives being handed something that is not an error", () => {
    expect(isStaleBuild(null)).toBe(false);
    expect(isStaleBuild(undefined)).toBe(false);
    expect(isStaleBuild("Failed to fetch dynamically imported module")).toBe(true);
  });
});

describe("spending the one reload", () => {
  beforeEach(() => window.sessionStorage.clear());

  /// <summary>Bounded, because a reload loop is worse than an error screen.</summary>
  ///
  /// Held in sessionStorage rather than in a module variable: the reload wipes the module, so a
  /// variable would read false again on the other side and the next failure would reload once
  /// more, forever, with no way for the reader to stop it.
  it("starts unspent and is remembered across a reload", () => {
    expect(hasReloadedForStaleBuild()).toBe(false);

    window.sessionStorage.setItem("radar:reloaded-for-stale-build", "1");

    expect(hasReloadedForStaleBuild()).toBe(true);
  });

  /// So that the deploy after this one gets its own reload.
  it("is cleared once a page loads", () => {
    window.sessionStorage.setItem("radar:reloaded-for-stale-build", "1");

    clearStaleBuildReload();

    expect(hasReloadedForStaleBuild()).toBe(false);
  });
});
