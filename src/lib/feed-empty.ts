import type { IconName } from "../components/Icon";
import type { FeedEmptyReason } from "./types";

/// What an empty feed should say, and which action can actually resolve it.
///
/// There used to be one message for every case — "Radar is still curating content for your
/// interests. Check back soon." — which was true only when nothing had been ingested. A user who
/// filtered to a type with no items, or who dismissed everything, was told Radar was still
/// working, and handed a Refresh button that could not change the outcome.
///
/// Kept separate from the component so the wording and the action can be tested without a DOM.
/// The rule that matters: never offer a button that cannot fix the stated problem.
export type FeedEmptyAction =
  | "refresh"
  | "clearFilter"
  | "restoreDismissed"
  | "widenInterests"
  | "none";

export interface FeedEmptyCopy {
  icon: IconName;
  title: string;
  description: string;
  action: FeedEmptyAction;
  actionLabel?: string;
}

export function feedEmptyCopy(reason: FeedEmptyReason | undefined): FeedEmptyCopy {
  switch (reason) {
    case "NoneOfThisType":
      return {
        icon: "search",
        title: "Nothing of this kind yet",
        description: "Radar has other things for you — just none of this type so far.",
        action: "clearFilter",
        actionLabel: "Show everything",
      };

    case "EverythingDismissed":
      return {
        icon: "folder",
        title: "You have dismissed everything here",
        description: "Nothing is left to show. You can bring the dismissed items back if you went too fast.",
        action: "restoreDismissed",
        actionLabel: "Bring them back",
      };

    case "NoContentAtAll":
      return {
        icon: "article",
        title: "Radar has not pulled anything in yet",
        description: "New content arrives through the day. There is nothing to show until the first batch lands.",
        // Deliberately no action: the corpus is empty, so the next request returns the same
        // nothing. A button that cannot work is worse than no button.
        action: "none",
      };

    case "NothingMatchesYourTerms":
      return {
        icon: "article",
        title: "Nothing here matches what you follow",
        description:
          "Radar has plenty of material, and none of it mentions the subjects, goals or challenges you gave it. Adding a subject, or wording one differently, is what changes that.",
        // The only action that can resolve this. "Check again" would be a button that cannot
        // work: the next request runs the same query against the same library.
        action: "widenInterests",
        actionLabel: "Edit what you follow",
      };

    default:
      // Covers NothingNewRightNow and an older server that sends no reason at all, so a version
      // mismatch degrades to the sensible general case rather than rendering nothing.
      return {
        icon: "article",
        title: "Nothing new right now",
        description: "You are up to date. Radar will have more as it comes in.",
        action: "refresh",
        actionLabel: "Check again",
      };
  }
}
