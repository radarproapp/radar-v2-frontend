import { describe, expect, it } from "vitest";
import { answeredOnly, hasEnoughToSubmit } from "../onboarding";

/// The rules the page and the server have to agree on.
///
/// The reason this file exists: the old flow held its own 235-entry list of interests and sent
/// those, and not one of them matched a string the server offers — "Artificial Intelligence"
/// against "Technology & AI". The answer text is the term the feed is matched on, so the two ends
/// had stopped meaning the same thing by any word, and nothing failed. The server now rejects
/// anything it did not offer, which turns that silent drift into a 400; these cover the rules
/// that sit on this side of the line.
describe("what gets submitted", () => {
  /// An absent key leaves that answer alone on the server; an empty array clears it. Sending
  /// every key with an empty array would wipe everything, which is the same payload meaning the
  /// opposite thing.
  it("sends only the questions that were answered", () => {
    const answers = {
      interests: ["Technology & AI"],
      skills: [],
      goals: ["Internships"],
      qualification: [],
    };

    expect(answeredOnly(answers)).toEqual({
      interests: ["Technology & AI"],
      goals: ["Internships"],
    });
  });

  it("sends nothing when nothing was answered", () => {
    expect(answeredOnly({ interests: [], skills: [] })).toEqual({});
  });

  /// Deliberately lenient. The brief wants onboarding fast and expects Radar to learn the rest
  /// from behaviour, so a screen that refuses to proceed until all three are answered is the
  /// screen people abandon.
  it("one answer anywhere is enough to proceed", () => {
    expect(hasEnoughToSubmit({ interests: [], skills: [], goals: [] })).toBe(false);
    expect(hasEnoughToSubmit({ interests: [], skills: ["Research"], goals: [] })).toBe(true);
  });

  /// The option strings pass through untouched. The server matches them case-insensitively but
  /// stores its own canonical wording, so reformatting here would be a 400 for anything that
  /// changed length or punctuation — and a title-caser would quietly mangle "AI & Digital Tools".
  it("does not reformat the option text it was given", () => {
    const exact = "None yet — I'm exploring";

    expect(answeredOnly({ skills: [exact] })).toEqual({ skills: [exact] });
  });
});
