import { describe, expect, it } from "vitest";
import { hasEnoughToSubmit, touchedOnly, whatChanged } from "../onboarding";

/// The rules the page and the server have to agree on.
///
/// The reason this file exists: the old flow held its own 235-entry list of interests and sent
/// those, and not one of them matched a string the server offers — "Artificial Intelligence"
/// against "Technology & AI". The answer text is the term the feed is matched on, so the two ends
/// had stopped meaning the same thing by any word, and nothing failed. The server now rejects
/// anything it did not offer, which turns that silent drift into a 400; these cover the rules
/// that sit on this side of the line.
describe("what gets submitted", () => {
  /// Three states, not two, and the middle one is the whole point.
  ///
  /// An absent key leaves that answer alone on the server, which makes a half-finished
  /// onboarding resumable. An empty array clears it. A filled array sets it. The first version
  /// filtered on non-empty and so collapsed the first two, which meant a cleared answer could
  /// never reach the wire at all.
  it("sends a touched-but-emptied answer, so it can be cleared", () => {
    const answers = { interests: ["Technology & AI"], qualification: [], goals: [] };
    const touched = new Set(["interests", "qualification"]);

    expect(touchedOnly(answers, touched)).toEqual({
      interests: ["Technology & AI"],
      qualification: [],
    });
  });

  /// The other half of the same rule. A question nobody looked at is not an answer of "none".
  it("does not send a question that was never touched", () => {
    const answers = { interests: [], skills: [], goals: [] };

    expect(touchedOnly(answers, new Set())).toEqual({});
  });

  /// The server was deliberately changed so an emptied qualification unsets the stored rung —
  /// otherwise a mis-tap is permanent, because the ordinary profile edit has no field for it.
  /// A client that cannot send an empty array means that fix never reaches the wire.
  it("a cleared single choice survives the trip", () => {
    const sent = touchedOnly({ qualification: [] }, new Set(["qualification"]));

    expect(Object.keys(sent)).toEqual(["qualification"]);
    expect(sent.qualification).toEqual([]);
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
  ///
  /// Asserted on the value that comes out rather than on the function's shape, because the
  /// previous version of this test only ever filtered by length and so could not have caught a
  /// transformation anywhere.
  it("does not reformat the option text it was given", () => {
    const exact = "None yet — I'm exploring";
    const sent = touchedOnly({ skills: [exact] }, new Set(["skills"]));

    expect(sent.skills[0]).toBe(exact);
    expect(sent.skills[0]).toHaveLength(exact.length);
  });
});

describe("what counts as touched", () => {
  it("notices a field whose answer changed", () => {
    const touched = whatChanged(new Set(), { interests: [] }, { interests: ["Law"] });

    expect([...touched]).toEqual(["interests"]);
  });

  /// Emptying is a change, and the one that matters most - it is the only way to clear.
  it("notices a field that was emptied", () => {
    const touched = whatChanged(new Set(), { qualification: ["HND"] }, { qualification: [] });

    expect(touched.has("qualification")).toBe(true);
  });

  /// Touching is about what the person did, not how many events the component emitted. A change
  /// event that produces the same answer is not an answer.
  it("ignores a change event that changed nothing", () => {
    const same = { interests: ["Law"] };

    expect([...whatChanged(new Set(), same, { interests: ["Law"] })]).toEqual([]);
  });

  it("keeps what was already touched", () => {
    const touched = whatChanged(new Set(["skills"]), { interests: [] }, { interests: ["Law"] });

    expect(touched.has("skills")).toBe(true);
    expect(touched.has("interests")).toBe(true);
  });
});
