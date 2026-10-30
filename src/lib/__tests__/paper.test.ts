import { describe, expect, it } from "vitest";
import { paperAuthorLine, paperYear, paperDate } from "../paper";

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

/// The publication date, which the spec asks for by name on every result.
describe("paperDate", () => {
  it("gives the full date when the source recorded one", () => {
    expect(paperDate("2025-03-14T00:00:00Z")).toBe("14 March 2025");
  });

  /// OpenAlex reports a date it does not always have: a work it only knows the year for arrives
  /// as the first of January. "1 January 2019" would be a precision nothing supports.
  it("gives the year alone when that is all the source really knew", () => {
    expect(paperDate("2019-01-01T00:00:00Z")).toBe("2019");
  });

  it("says nothing rather than guessing", () => {
    expect(paperDate(null)).toBeNull();
    expect(paperDate("not a date")).toBeNull();
  });

  /// A work whose date the index never reported arrives as the .NET default rather than as
  /// today, which is what it used to be stamped with. Printing "1 January 0001" would be worse
  /// than printing nothing, and printing this morning would be an invented publication date.
  it("omits a date the index never recorded", () => {
    expect(paperDate("0001-01-01T00:00:00Z")).toBeNull();
  });
});
