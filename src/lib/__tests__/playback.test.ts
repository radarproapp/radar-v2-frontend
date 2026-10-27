import { describe, expect, it } from "vitest";
import { clockFor, hoursAndMinutes, secondsFromTimestamp } from "../duration";


describe("hoursAndMinutes", () => {
  it("reads the way somebody would say it", () => {
    expect(hoursAndMinutes(4 * 3600 + 12 * 60)).toBe("4h 12m");
    expect(hoursAndMinutes(38 * 60)).toBe("38m");
    expect(hoursAndMinutes(45)).toBe("45s");
  });

  // Not "0h 38m", and not "2h 0m": the headline is read at a glance.
  it("drops the empty unit", () => {
    expect(hoursAndMinutes(2 * 3600)).toBe("2h");
    expect(hoursAndMinutes(90 * 60)).toBe("1h 30m");
  });

  // Under a minute still beats nothing: it means they pressed play.
  it("distinguishes a few seconds from no time at all", () => {
    expect(hoursAndMinutes(3)).toBe("3s");
    expect(hoursAndMinutes(0)).toBe("0m");
    expect(hoursAndMinutes(-20)).toBe("0m");
    expect(hoursAndMinutes(Number.NaN)).toBe("0m");
  });
});

describe("secondsFromTimestamp", () => {
  it("reads a serialised TimeSpan", () => {
    expect(secondsFromTimestamp("00:14:32")).toBe(872);
    expect(secondsFromTimestamp("01:00:00")).toBe(3600);
  });

  it("reads the shorter minutes-and-seconds form", () => {
    expect(secondsFromTimestamp("14:32")).toBe(872);
  });

  /// Chapters come from RSS feeds other people wrote, so the value is not always a timestamp. A
  /// chapter that silently seeks to the start is worse than one that is visibly not clickable.
  it("returns null rather than zero for anything unparseable", () => {
    expect(secondsFromTimestamp(null)).toBeNull();
    expect(secondsFromTimestamp("")).toBeNull();
    expect(secondsFromTimestamp("chapter one")).toBeNull();
    expect(secondsFromTimestamp("2024")).toBeNull();
    expect(secondsFromTimestamp("1:2:3:4")).toBeNull();
    expect(secondsFromTimestamp("-1:00")).toBeNull();
  });

  // Past 59 means the string was something else — a duration in minutes, a byte offset.
  it("rejects values that cannot be minutes or seconds", () => {
    expect(secondsFromTimestamp("90:00")).toBeNull();
    expect(secondsFromTimestamp("00:00:75")).toBeNull();
  });

  it("accepts the boundary", () => {
    expect(secondsFromTimestamp("59:59")).toBe(3599);
  });
});

describe("clockFor", () => {
  it("shows hours only when there are hours", () => {
    expect(clockFor(0)).toBe("0:00");
    expect(clockFor(65)).toBe("1:05");
    expect(clockFor(3600)).toBe("1:00:00");
    expect(clockFor(3725)).toBe("1:02:05");
  });

  // A media element reports NaN for duration before metadata loads.
  it("survives what a media element reports before it has loaded", () => {
    expect(clockFor(Number.NaN)).toBe("0:00");
    expect(clockFor(-5)).toBe("0:00");
  });
});
