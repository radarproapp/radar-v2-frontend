import { describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { Opportunities } from "../Opportunities";
import { renderPage } from "../../test/harness";
import * as api from "../../lib/api";
import * as auth from "../../auth/AuthContext";
import type { Opportunity } from "../../lib/types";

/// The opportunities page, which had no test at all.
///
/// Which is how four things reached production together: a reader seeing "JobFair" and
/// "GraduateProgramme" as badges, a zero-item banner above an empty state telling them to widen
/// filters that cannot help, and the ?open= link from the feed landing on the wrong screen.

function signedIn(profile: Partial<{ interests: string[]; goals: string[]; primaryGoal: string }>) {
  vi.spyOn(auth, "useAuth").mockReturnValue({
    isAuthenticated: true,
    isLoading: false,
    profile: { id: "u1", persona: "Student", interests: [], goals: [], primaryGoal: "", ...profile } as never,
    signIn: () => {},
    signOut: () => {},
    refetchProfile: async () => {},
  });
}

function opportunity(overrides: Partial<Opportunity> = {}): Opportunity {
  return {
    id: "o1",
    title: "Graduate trainee scheme, water engineering",
    organisation: "A utility",
    type: "GraduateProgramme",
    matchScorePercent: 84,
    matchTier: "StrongMatch",
    whyItFits: "It is water engineering work, which is what you are learning.",
    nextMoveSteps: [],
    requirements: [],
    isRemote: false,
    regionTag: "Nigeria",
    ...overrides,
  } as Opportunity;
}

function emptyFeed() {
  return {
    totalCount: 0,
    message: "0 opportunities for you today",
    primaryFocus: "Law",
    items: [],
    tierCounts: {},
  } as never;
}

describe("Opportunities", () => {
  /// A kind of opportunity is named in words, not in the enum it is stored as.
  it("names the kind of opportunity in words", async () => {
    signedIn({ interests: ["water engineering"] });
    vi.spyOn(api, "getDailyOpportunities").mockResolvedValue({
      totalCount: 1,
      message: "1 opportunity for you today",
      primaryFocus: "water engineering",
      items: [opportunity()],
      tierCounts: { StrongMatch: 1 },
    } as never);

    renderPage(<Opportunities />);

    expect(await screen.findByText("Graduate programme")).toBeTruthy();
    expect(screen.queryByText("GraduateProgramme")).toBeNull();
  });

  /// Nothing stated means the question, not an instruction to widen filters.
  ///
  /// Opportunities are matched on a stated path, interests or goals. A learner who has stated
  /// none of them has nothing to match against, and "try adjusting your filter criteria" is
  /// advice that cannot work.
  it("asks the question when the learner has stated nothing", async () => {
    signedIn({});
    vi.spyOn(api, "getDailyOpportunities").mockResolvedValue(emptyFeed());

    renderPage(<Opportunities />);

    expect(await screen.findByText(/for radar to serve you better/i)).toBeTruthy();
    expect(screen.queryByText(/adjusting your filter/i)).toBeNull();
  });

  /// And says what the rule is when they have stated something and nothing matched.
  it("explains an empty page to a learner who has stated something", async () => {
    signedIn({ interests: ["Law"] });
    vi.spyOn(api, "getDailyOpportunities").mockResolvedValue(emptyFeed());

    renderPage(<Opportunities />);

    expect(await screen.findByText(/nothing here matches what you are working on/i)).toBeTruthy();
  });

  /// A link naming one opportunity opens that opportunity.
  ///
  /// The feed sends ?open=<id> and this page ignored it, so a click landed on today's batch and
  /// the reader had to find the item again — and now that the batch only holds what matches them,
  /// it may not be on the page at all.
  it("opens the opportunity a link names", async () => {
    signedIn({ interests: ["water engineering"] });
    vi.spyOn(api, "getDailyOpportunities").mockResolvedValue(emptyFeed());
    const spy = vi
      .spyOn(api, "getOpportunityById")
      .mockResolvedValue(opportunity({ id: "o9", title: "A fellowship somebody shared" }));

    renderPage(<Opportunities />, { route: "/opportunities?open=o9" });

    await waitFor(() => expect(spy).toHaveBeenCalledWith("o9"));
    expect(await screen.findByText("A fellowship somebody shared")).toBeTruthy();
  });

  it("fetches nothing when no link named one", async () => {
    signedIn({ interests: ["Law"] });
    vi.spyOn(api, "getDailyOpportunities").mockResolvedValue(emptyFeed());
    const spy = vi.spyOn(api, "getOpportunityById").mockResolvedValue(opportunity());

    renderPage(<Opportunities />);

    await screen.findByText(/nothing here matches/i);
    expect(spy).not.toHaveBeenCalled();
  });
});
