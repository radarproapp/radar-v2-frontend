import { describe, expect, it } from "vitest";
import { FEED_TYPES, feedTypeFor } from "../feed-types";

describe("feedTypeFor", () => {
  it("reads the slug the sidebar links to", () => {
    expect(feedTypeFor("news").type).toBe("Article");
    expect(feedTypeFor("podcasts").type).toBe("Podcast");
  });

  /// A link to a filter that has moved shows the feed rather than an empty page.
  ///
  /// These slugs were in the sidebar for months, so they are in people's history and in links
  /// they sent each other. Papers, policy and ideas are in Research Discovery now; the old
  /// address should not answer with nothing.
  it("treats the moved filters as no filter rather than an empty feed", () => {
    for (const gone of ["papers", "policy", "ideas", "videos", "articles"]) {
      expect(feedTypeFor(gone).type).toBeNull();
      expect(feedTypeFor(gone).label).toBe("All");
    }
  });

  it("treats no slug as the whole feed", () => {
    expect(feedTypeFor(null).type).toBeNull();
    expect(feedTypeFor(null).label).toBe("All");
  });

  // A mistyped or stale link should show the feed, not an empty page.
  it("falls back to All rather than filtering to nothing", () => {
    expect(feedTypeFor("vidoes").type).toBeNull();
    expect(feedTypeFor("").type).toBeNull();
  });

  it("is case insensitive, since links get typed by hand", () => {
    expect(feedTypeFor("News").type).toBe("Article");
    expect(feedTypeFor("PODCASTS").type).toBe("Podcast");
  });
});

describe("the feed types", () => {
  it("has exactly one unfiltered entry, and it is first", () => {
    const unfiltered = FEED_TYPES.filter((entry) => entry.type === null);
    expect(unfiltered).toHaveLength(1);
    expect(FEED_TYPES[0].label).toBe("All");
  });

  // The slug is the URL, so a duplicate would make one type unreachable.
  it("gives every filtered type a unique slug", () => {
    const slugs = FEED_TYPES.filter((e) => e.slug).map((e) => e.slug!);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(slugs.every((slug) => slug === slug.toLowerCase())).toBe(true);
  });

  it("round-trips every slug back to its own type", () => {
    for (const entry of FEED_TYPES) {
      expect(feedTypeFor(entry.slug ?? null).label).toBe(entry.label);
    }
  });

  // Podcasts are the reason this nav exists: they are in the feed but rarely rank into it, so
  // losing their entry would make them unreachable again.
  it("keeps a route to podcasts", () => {
    expect(FEED_TYPES.map((e) => e.type)).toContain("Podcast");
  });

  /// The feed is news, podcasts and posts. Everything else has somewhere better to be.
  ///
  /// Asserted as a decision rather than left as an absence. Papers, policy and essays are in
  /// Research Discovery, which is the product built to read them. Video is the one with a real
  /// cost: it had a chip here and now has none, so anything ingested as video is reachable only
  /// through search until Radar Learn carries the corpus as well as YouTube.
  it("carries nothing but news and podcasts", () => {
    expect(FEED_TYPES.map((e) => e.type)).toEqual([null, "Article", "Podcast"]);
  });
});
