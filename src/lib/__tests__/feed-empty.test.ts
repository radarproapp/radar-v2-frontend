import { describe, expect, it } from "vitest";
import { feedEmptyCopy } from "../feed-empty";
import type { FeedEmptyReason } from "../types";

describe("feedEmptyCopy", () => {
  it("never offers an action that cannot fix the stated problem", () => {
    // The old behaviour: one message for every case, with a Refresh button. Refreshing an empty
    // corpus returns the same nothing, and it does not undo a dismissal or clear a filter.
    expect(feedEmptyCopy("NoContentAtAll").action).toBe("none");
    expect(feedEmptyCopy("EverythingDismissed").action).toBe("restoreDismissed");
    expect(feedEmptyCopy("NoneOfThisType").action).toBe("clearFilter");
    expect(feedEmptyCopy("NothingNewRightNow").action).toBe("refresh");
  });

  it("does not tell a user Radar is still working when it is their own filter", () => {
    const copy = feedEmptyCopy("NoneOfThisType");

    expect(copy.description).not.toMatch(/curating|still working/i);
    expect(copy.title.toLowerCase()).toContain("kind");
  });

  it("does not blame Radar when the user dismissed everything", () => {
    const copy = feedEmptyCopy("EverythingDismissed");

    expect(copy.description).not.toMatch(/curating/i);
    expect(copy.title.toLowerCase()).toContain("dismissed");
  });

  it("falls back to the general case when the server sends no reason", () => {
    // A deployed client can be newer or older than the API. An unknown reason must still render
    // something sensible rather than an empty box.
    const copy = feedEmptyCopy(undefined);

    expect(copy.title).toBeTruthy();
    expect(copy.description).toBeTruthy();
    expect(copy.action).toBe("refresh");
  });

  it("gives every case a label when it gives it an action", () => {
    const reasons: FeedEmptyReason[] = [
      "NotEmpty",
      "NoContentAtAll",
      "NoneOfThisType",
      "EverythingDismissed",
      "NothingNewRightNow",
    ];

    for (const reason of reasons) {
      const copy = feedEmptyCopy(reason);
      if (copy.action !== "none") {
        expect(copy.actionLabel, `${reason} has an action but no label`).toBeTruthy();
      }
    }
  });

  /// The state the strand filter creates, which the enum had no word for.
  ///
  /// Before this it was reported as one of two untrue things: that the reader had dismissed
  /// everything — offering a button that restores dismissals and cannot help — or that they were
  /// up to date, while the library held plenty that simply did not mention their words.
  it("says their words are the reason, and offers the only thing that changes it", () => {
    const copy = feedEmptyCopy("NothingMatchesYourTerms");

    expect(copy.description).toMatch(/mentions the subjects/i);
    expect(copy.action).toBe("widenInterests");
  });

  it("never claims they are up to date when nothing matched their words", () => {
    const copy = feedEmptyCopy("NothingMatchesYourTerms");

    expect(copy.title).not.toMatch(/up to date|nothing new/i);
    expect(copy.action).not.toBe("restoreDismissed");
    expect(copy.action).not.toBe("refresh");
  });
});
