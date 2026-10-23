import { describe, expect, it } from "vitest";
import { formatDuration, parseMinutes, sumMinutes } from "../duration";

describe("parseMinutes", () => {
  it("reads the forms the roadmap actually produces", () => {
    expect(parseMinutes("20 min")).toBe(20);
    expect(parseMinutes("30 min")).toBe(30);
    expect(parseMinutes("45 minutes")).toBe(45);
    expect(parseMinutes("1 hr")).toBe(60);
    expect(parseMinutes("2 hours")).toBe(120);
    expect(parseMinutes("90m")).toBe(90);
  });

  it("sums compound durations rather than taking the first number", () => {
    expect(parseMinutes("1h 30m")).toBe(90);
    expect(parseMinutes("1 hr 30 min")).toBe(90);
    expect(parseMinutes("2 hours 15 minutes")).toBe(135);
  });

  it("is case insensitive", () => {
    expect(parseMinutes("1 HR")).toBe(60);
    expect(parseMinutes("20 Min")).toBe(20);
  });

  it("rounds fractional hours", () => {
    expect(parseMinutes("1.5 hours")).toBe(90);
    expect(parseMinutes("0.5 hr")).toBe(30);
  });

  // The distinction a section header depends on: no stated time must not read as "takes no time".
  it("returns null when there is nothing to read", () => {
    expect(parseMinutes(null)).toBeNull();
    expect(parseMinutes(undefined)).toBeNull();
    expect(parseMinutes("")).toBeNull();
    expect(parseMinutes("a while")).toBeNull();
  });

  // A bare number is ambiguous — minutes, hours, or the lesson number.
  it("rejects a number with no unit", () => {
    expect(parseMinutes("3")).toBeNull();
    expect(parseMinutes("Lesson 3")).toBeNull();
  });

  // "m" must not match the m in "moderate", which is why the pattern is anchored on a word break.
  it("does not treat an arbitrary word as a unit", () => {
    expect(parseMinutes("3 moderate sessions")).toBeNull();
  });
});

describe("sumMinutes", () => {
  it("adds a section up", () => {
    expect(sumMinutes(["20 min", "30 min", "25 min"])).toBe(75);
  });

  it("ignores the entries it cannot read but keeps the ones it can", () => {
    expect(sumMinutes(["20 min", null, "self-paced", "40 min"])).toBe(60);
  });

  it("returns null when no entry is readable", () => {
    expect(sumMinutes([null, undefined, "", "varies"])).toBeNull();
    expect(sumMinutes([])).toBeNull();
  });
});

describe("formatDuration", () => {
  it("uses the shape course players use", () => {
    expect(formatDuration(48)).toBe("48min");
    expect(formatDuration(192)).toBe("3hr 12min");
    expect(formatDuration(120)).toBe("2hr");
    expect(formatDuration(60)).toBe("1hr");
  });

  it("says nothing rather than zero", () => {
    expect(formatDuration(null)).toBeNull();
    expect(formatDuration(0)).toBeNull();
  });
});
