import { describe, expect, it } from "vitest";
import { DOCUMENT_KINDS, kindsMatching } from "../document-kinds";

/// Typing what you have, and finding a standard that fits it.
///
/// The screen offered seven chips and nothing else, so somebody with a dissertation chapter, a
/// funding bid or a README had to decide which of seven it was least unlike. Typing is free now —
/// but the match is always to a written, authored standard, because a rubric invented per request
/// means nobody knows what the judgement was against.

describe("matching what somebody types", () => {
  /// The words people actually use for the work, rather than the label Radar filed it under.
  it.each([
    ["dissertation chapter", "Report"],
    ["scholarship", "GrantApplication"],
    ["funding bid", "GrantApplication"],
    ["readme", "TechnicalDocumentation"],
    ["resume", "Cv"],
    ["statement of purpose", "PersonalStatement"],
    ["investor deck", "PitchDeck"],
    ["scheme of work", "LessonPlan"],
    ["caption", "SocialMediaContent"],
  ])("'%s' finds %s", (typed, expected) => {
    expect(kindsMatching(typed)[0]?.kind).toBe(expected);
  });

  /// Typing the name of the thing beats something that merely mentions it.
  it("ranks the name of the thing above a passing mention", () => {
    expect(kindsMatching("pitch")[0]?.kind).toBe("PitchDeck");
  });

  it("offers everything before anything is typed", () => {
    expect(kindsMatching("")).toHaveLength(DOCUMENT_KINDS.length);
    expect(kindsMatching("   ")).toHaveLength(DOCUMENT_KINDS.length);
  });

  /// Nothing rather than the nearest thing.
  ///
  /// A kind Radar has no standard for has to come back empty so the screen can say so. Quietly
  /// assessing against whatever matched least badly is how somebody's recipe book gets judged as
  /// a research proposal.
  it("finds nothing for work it has no standard for", () => {
    expect(kindsMatching("wedding speech")).toHaveLength(0);
    expect(kindsMatching("qqqq")).toHaveLength(0);
  });

  /// A substring still matches, but below anything that matches at a word start.
  ///
  /// The opposite of the rule used against the content corpus, deliberately. There a substring
  /// match on "art" drags in everything "smart"; here the whole list is twelve curated options
  /// and a loose match costs one extra row in a dropdown somebody is choosing from.
  it("ranks a word-start match above a match inside a word", () => {
    const kinds = kindsMatching("p").map((o) => o.kind);

    expect(kinds).toContain("PitchDeck");
    expect(kinds.indexOf("PitchDeck")).toBeLessThan(kinds.indexOf("Report"));
  });

  /// Every kind says what it covers, so a reader can tell whether the match is right before
  /// spending an assessment on it.
  it("every kind explains what it is for", () => {
    for (const option of DOCUMENT_KINDS) {
      expect(option.label.length).toBeGreaterThan(0);
      expect(option.covers.length).toBeGreaterThan(15);
    }
  });
});
