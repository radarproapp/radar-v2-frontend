import { describe, expect, it } from "vitest";
import { paperAuthorLine, paperYear } from "../paper";

describe("paperYear", () => {
  it("reads the year from an ISO timestamp", () => {
    expect(paperYear("2017-06-12T00:00:00Z")).toBe("2017");
  });

  // OpenAlex records frequently arrive with no publication date. A card that prints "1970"
  // because it formatted the epoch is worse than one that omits the year.
  it("returns null rather than a plausible year when there is no date", () => {
    expect(paperYear(null)).toBeNull();
    expect(paperYear(undefined)).toBeNull();
    expect(paperYear("")).toBeNull();
    expect(paperYear("not a date")).toBeNull();
  });

  // Read in UTC, so a paper published on 1 January does not lose a year west of Greenwich.
  it("does not shift the year with the local timezone", () => {
    expect(paperYear("2024-01-01T00:00:00Z")).toBe("2024");
    expect(paperYear("2023-12-31T23:59:59Z")).toBe("2023");
  });
});

describe("paperAuthorLine", () => {
  it("lists up to three authors in full", () => {
    expect(paperAuthorLine(["Vaswani", "Shazeer", "Parmar"])).toBe("Vaswani, Shazeer, Parmar");
  });

  it("counts the rest beyond three", () => {
    const authors = ["Vaswani", "Shazeer", "Parmar", "Uszkoreit", "Jones", "Gomez", "Kaiser", "Polosukhin"];

    expect(paperAuthorLine(authors)).toBe("Vaswani, Shazeer, Parmar + 5 more");
  });

  it("handles a single author", () => {
    expect(paperAuthorLine(["Turing"])).toBe("Turing");
  });

  // An anonymous or unparsed record leaves the slot out instead of printing "Unknown author".
  it("returns null when there are no usable names", () => {
    expect(paperAuthorLine([])).toBeNull();
    expect(paperAuthorLine(null)).toBeNull();
    expect(paperAuthorLine(["  ", ""])).toBeNull();
  });

  it("ignores blank entries when counting", () => {
    expect(paperAuthorLine(["Ada Lovelace", "  ", "Charles Babbage"])).toBe("Ada Lovelace, Charles Babbage");
  });
});
