import { describe, expect, it } from "vitest";
import { FEED_CARD_FIELDS } from "../api";

/// The feed requests an explicit field list, and anything missing from it silently arrives
/// undefined. That has bitten twice: `yourEdge` was rendered but never requested (fixed in
/// e289fbd), and `whyYoureSeeingThis` had to be added to both this list and the server's field
/// map before it would appear.
///
/// A rendered field absent from this list produces a blank space, not an error, so nothing fails
/// until a person notices. This test is the cheap version of noticing.
describe("FEED_CARD_FIELDS", () => {
  const required = [
    "id",          // navigation target
    "type",
    "title",
    "signal",      // headline shown on the card
    "source",
    "layer",       // badge colour and label
    "topic",
    "publishedAt", // relative time
    "isSaved",     // save button state
    "whyYoureSeeingThis", // the one-line reason under the title
  ];

  it.each(required)("requests '%s', which the card renders", (field) => {
    expect(FEED_CARD_FIELDS).toContain(field);
  });

  it("has no duplicates", () => {
    expect(new Set(FEED_CARD_FIELDS).size).toBe(FEED_CARD_FIELDS.length);
  });

  it("has no blank entries", () => {
    for (const f of FEED_CARD_FIELDS) expect(f.trim()).not.toBe("");
  });
});
