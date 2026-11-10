import { describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { AdminCampaignSection } from "../AdminCampaign";
import { renderPage } from "../../test/harness";
import * as api from "../../lib/api";
import type { ContentBoard, ContentSubmission, Introducer, ReviewQueue } from "../../lib/api";

/// The growth campaign, from the admin side.
///
/// Both halves existed as endpoints for a week with no screen at all, so nobody could mark a
/// submission and the content board could only ever be empty. What matters here is that the two
/// boards stay apart, and that an empty one says which kind of empty it is.

function introducer(overrides: Partial<Introducer> = {}): Introducer {
  return { profileId: "p1", name: "Ada", code: "ABC2345", signedUp: 12, personalised: 7, cameBack: 3, ...overrides };
}

function submission(overrides: Partial<ContentSubmission> = {}): ContentSubmission {
  return {
    id: "s1",
    profileId: "p1",
    profileName: "Ada",
    link: "https://tiktok.com/@ada/video/1",
    platform: "TikTok",
    note: "Explains the feed",
    submittedAt: "2026-11-01T10:00:00Z",
    score: null,
    verdict: null,
    judgedAt: null,
    isJudged: false,
    judgedBy: null,
    marks: [],
    ...overrides,
  };
}

function board(overrides: Partial<ContentBoard> = {}): ContentBoard {
  return {
    makers: [{ profileId: "p1", name: "Ada", best: 9, judged: 1, submitted: 3 }],
    awaitingReview: 0,
    rankedOn: "The best single piece. Equal best marks are left equal.",
    ...overrides,
  };
}

function setup({
  referrals = [introducer()],
  content = board(),
  queue = { waiting: [submission()], recentlyJudged: [] } as ReviewQueue,
} = {}) {
  vi.spyOn(api, "getReferralBoard").mockResolvedValue(referrals);
  vi.spyOn(api, "getContentBoard").mockResolvedValue(content);
  vi.spyOn(api, "getReviewQueue").mockResolvedValue(queue);
}

describe("AdminCampaignSection", () => {
  /// <summary>The two halves are reported side by side and never as one score.</summary>
  ///
  /// There is no honest exchange rate between a video and a user, and inventing one buries the
  /// campaign's central judgement in a weighting nobody can inspect.
  it("shows both boards, separately", async () => {
    setup();

    renderPage(<AdminCampaignSection />);

    expect(await screen.findByText(/bringing people in/i)).toBeTruthy();
    expect(screen.getByText(/making something about radar/i)).toBeTruthy();
    expect(screen.getByText(/never averaged with it/i)).toBeTruthy();
  });

  /// <summary>Three numbers, not one.</summary>
  ///
  /// Thirty accounts that never came back is not thirty users, and a single score cannot tell
  /// those apart.
  it("reports signed up, personalised and came back separately", async () => {
    setup();

    renderPage(<AdminCampaignSection />);

    const row = (await screen.findByText("Ada", { selector: "div" })).closest(".admin-table-row");
    expect(row).toBeTruthy();
    expect(within(row as HTMLElement).getByText("12")).toBeTruthy();
    expect(within(row as HTMLElement).getByText("7")).toBeTruthy();
    expect(within(row as HTMLElement).getByText("3")).toBeTruthy();
  });

  /// <summary>An empty content board says which kind of empty it is.</summary>
  ///
  /// Nothing judged with work in the queue is not the same as nobody having entered, and a board
  /// that renders both as blank tells the owner their campaign failed when it has not started.
  it("tells nothing-judged-yet apart from nobody-entered", async () => {
    setup({ content: board({ makers: [], awaitingReview: 4 }), queue: { waiting: [], recentlyJudged: [] } });

    const { unmount } = renderPage(<AdminCampaignSection />);
    expect(await screen.findByText(/nothing judged yet — 4 submissions waiting/i)).toBeTruthy();
    unmount();

    setup({ content: board({ makers: [], awaitingReview: 0 }), queue: { waiting: [], recentlyJudged: [] } });
    renderPage(<AdminCampaignSection />);
    expect(await screen.findByText(/nobody has submitted anything yet/i)).toBeTruthy();
  });

  /// A board with names on it is still provisional while work is unreviewed.
  it("says the board is not final while submissions are waiting", async () => {
    setup({ content: board({ awaitingReview: 2 }) });

    renderPage(<AdminCampaignSection />);

    expect(await screen.findByText(/still\s+waiting to be reviewed, so this board is not final/i)).toBeTruthy();
  });

  /// <summary>A mark needs a reason, and the refusal arrives before the request does.</summary>
  it("refuses a mark with no reason without calling the server", async () => {
    setup();
    const judge = vi.spyOn(api, "judgeSubmission").mockResolvedValue(undefined);

    renderPage(<AdminCampaignSection />);

    fireEvent.click(await screen.findByRole("button", { name: /mark it/i }));
    fireEvent.click(screen.getByRole("button", { name: /record this mark/i }));

    expect(await screen.findByText(/say why, in a sentence/i)).toBeTruthy();
    expect(judge).not.toHaveBeenCalled();
  });

  it("records a mark and the reason for it", async () => {
    setup();
    const judge = vi.spyOn(api, "judgeSubmission").mockResolvedValue(undefined);

    renderPage(<AdminCampaignSection />);

    fireEvent.click(await screen.findByRole("button", { name: /mark it/i }));
    fireEvent.change(screen.getByLabelText(/mark out of ten/i), { target: { value: "9" } });
    fireEvent.change(screen.getByLabelText(/why it got that mark/i), {
      target: { value: "Shows a real feed and says why it ranked that way" },
    });
    fireEvent.click(screen.getByRole("button", { name: /record this mark/i }));

    await waitFor(() =>
      expect(judge).toHaveBeenCalledWith("s1", 9, "Shows a real feed and says why it ranked that way"),
    );
  });

  /// <summary>Not looked at is not a low mark.</summary>
  it("shows an unjudged submission as unlooked-at rather than as a zero", async () => {
    setup();

    renderPage(<AdminCampaignSection />);

    expect(await screen.findByText(/not looked at/i)).toBeTruthy();
    expect(screen.queryByText("Marked 0")).toBeNull();
  });

  /// <summary>A replaced mark is still visible.</summary>
  ///
  /// A number that decides a prize has to stay arguable, so the earlier one is not erased.
  it("says when a submission has been marked more than once", async () => {
    setup({
      queue: {
        waiting: [],
        recentlyJudged: [submission({
          isJudged: true,
          score: 2,
          verdict: "On a second look it is somebody else's footage",
          marks: [
            { score: 9, verdict: "Strong", byProfileId: "admin-1", at: "2026-11-01T10:00:00Z" },
            { score: 2, verdict: "On a second look it is somebody else's footage", byProfileId: "admin-2", at: "2026-11-02T10:00:00Z" },
          ],
        })],
      },
    });

    renderPage(<AdminCampaignSection />);

    expect(await screen.findByText(/marked 2 times/i)).toBeTruthy();
    expect(screen.getByText(/earlier: 9/i)).toBeTruthy();
  });

  /// A failure is not an empty campaign.
  it("does not render a failure as nobody having entered", async () => {
    vi.spyOn(api, "getReferralBoard").mockRejectedValue(new Error("offline"));
    vi.spyOn(api, "getContentBoard").mockRejectedValue(new Error("offline"));
    vi.spyOn(api, "getReviewQueue").mockRejectedValue(new Error("offline"));

    renderPage(<AdminCampaignSection />);

    expect(await screen.findByText(/could not read the acquisition board/i)).toBeTruthy();
    expect(screen.getByText(/could not read the content board/i)).toBeTruthy();
    expect(screen.queryByText(/nobody has brought anybody in yet/i)).toBeNull();
  });
});
