import { describe, expect, it } from "vitest";
import { FEED_TYPES, feedTypeFor } from "../feed-types";

describe("feedTypeFor", () => {
  it("reads the slug the sidebar links to", () => {
    expect(feedTypeFor("videos").type).toBe("Video");
    expect(feedTypeFor("podcasts").type).toBe("Podcast");
    expect(feedTypeFor("papers").type).toBe("ResearchPaper");
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
    expect(feedTypeFor("Videos").type).toBe("Video");
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

  // Videos and podcasts are the reason this nav exists: they are in the feed but rarely rank
  // into it, so losing their entry would make them unreachable again.
  it("keeps a route to video and podcast", () => {
    expect(FEED_TYPES.map((e) => e.type)).toContain("Video");
    expect(FEED_TYPES.map((e) => e.type)).toContain("Podcast");
  });
});
