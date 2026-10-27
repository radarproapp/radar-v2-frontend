/// What a render test needs that jsdom does not provide.
///
/// Nothing here fakes application behaviour. These are browser APIs jsdom has not implemented,
/// and a component that touches one would throw on render for reasons that say nothing about
/// whether the component is correct.

import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

// This file runs for every test, including the pure-function ones that deliberately have no DOM.
// Everything below touches window, so without this guard the whole suite fails with "window is
// not defined" — which it did.
const hasDom = typeof window !== "undefined";

// Every test gets a fresh document. Without this, a query in one test can match a node another
// test left behind, which is how a render suite starts passing for the wrong reasons.
afterEach(() => {
  if (hasDom) cleanup();
  vi.restoreAllMocks();
});

if (hasDom) {

  // The media player sets playbackRate and calls play(); jsdom implements neither, and an
  // unimplemented play() rejects rather than throwing, which surfaces as an unhandled rejection
  // well after the assertion that caused it.
  Object.defineProperty(window.HTMLMediaElement.prototype, "play", {
    configurable: true,
    value: () => Promise.resolve(),
  });

  Object.defineProperty(window.HTMLMediaElement.prototype, "pause", {
    configurable: true,
    value: () => {},
  });

  // Not implemented in jsdom at all. Several pages measure an element on mount.
  window.IntersectionObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
    readonly root = null;
    readonly rootMargin = "";
    readonly thresholds: readonly number[] = [];
  } as unknown as typeof IntersectionObserver;

  window.matchMedia ??= ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}
