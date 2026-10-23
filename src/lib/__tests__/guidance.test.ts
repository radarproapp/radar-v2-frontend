import { describe, expect, it } from "vitest";
import { GUIDANCE, pickGuidance } from "../guidance";

describe("pickGuidance", () => {
  it("returns the number asked for", () => {
    expect(pickGuidance(3, [])).toHaveLength(3);
    expect(pickGuidance(1, [])).toHaveLength(1);
  });

  // A card shown twice in a row of three wastes a third of the space.
  it("never repeats a card in one draw", () => {
    for (let run = 0; run < 50; run++) {
      const ids = pickGuidance(4, []).map((card) => card.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  // The screen already offers that action; a card repeating it is a second copy of a button.
  it("leaves out what the caller excludes", () => {
    for (let run = 0; run < 50; run++) {
      const ids = pickGuidance(5, ["one-subject", "own-material"]).map((card) => card.id);
      expect(ids).not.toContain("one-subject");
      expect(ids).not.toContain("own-material");
    }
  });

  it("returns what it can rather than padding when asked for more than exists", () => {
    const all = pickGuidance(GUIDANCE.length + 5, []);
    expect(all).toHaveLength(GUIDANCE.length);
  });

  it("returns nothing when everything is excluded", () => {
    expect(pickGuidance(3, GUIDANCE.map((card) => card.id))).toHaveLength(0);
  });

  // The point of rotating: a fixed three would surface the same corner of the product forever.
  it("does not return the same set every time", () => {
    const draws = new Set<string>();
    for (let run = 0; run < 40; run++) {
      draws.add(pickGuidance(3, []).map((card) => card.id).join("|"));
    }
    expect(draws.size).toBeGreaterThan(1);
  });
});

describe("the guidance itself", () => {
  it("has unique ids, since they are what callers exclude by", () => {
    const ids = GUIDANCE.map((card) => card.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("gives every card somewhere to go and something to say", () => {
    for (const card of GUIDANCE) {
      expect(card.path.startsWith("/")).toBe(true);
      expect(card.title.trim().length).toBeGreaterThan(0);
      expect(card.body.trim().length).toBeGreaterThan(0);
      expect(card.action.trim().length).toBeGreaterThan(0);
    }
  });

  // A tip that turns out to be untrue costs more than the empty space it filled, so every card
  // must point at a route the app actually serves.
  it("points only at routes the app has", () => {
    const known = [
      "/", "/feed", "/weekly", "/saved", "/capture", "/notebook",
      "/learn", "/learn/build", "/learn/hub", "/projects", "/mentor", "/progress",
      "/opportunities", "/ask",
    ];

    for (const card of GUIDANCE) {
      const base = card.path.split("?")[0];
      expect(known, `${card.id} points at ${base}`).toContain(base);
    }
  });
});
