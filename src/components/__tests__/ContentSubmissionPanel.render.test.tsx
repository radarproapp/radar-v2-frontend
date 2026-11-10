import { describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { ContentSubmissionPanel } from "../ContentSubmissionPanel";
import { renderPage } from "../../test/harness";
import * as api from "../../lib/api";
import { ApiError, type ContentSubmission } from "../../lib/api";

/// The half of the campaign a person has to judge.
///
/// Radar cannot see a video on TikTok, so every number here came from somebody who watched it.
/// The distinction this screen exists to protect is between "scored badly" and "not looked at
/// yet" — two states a single number cannot hold, and which a screen that confuses them reports
/// to a participant as a rejection.

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

describe("ContentSubmissionPanel", () => {
  it("says this is counted separately from bringing people in", async () => {
    vi.spyOn(api, "getMySubmissions").mockResolvedValue([]);

    renderPage(<ContentSubmissionPanel />);

    expect(await screen.findByText(/counted separately from the people you bring in/i)).toBeTruthy();
  });

  it("sends a link, where it was posted, and what it shows", async () => {
    vi.spyOn(api, "getMySubmissions").mockResolvedValue([]);
    const send = vi.spyOn(api, "submitContent").mockResolvedValue(submission());

    renderPage(<ContentSubmissionPanel />);

    fireEvent.change(await screen.findByLabelText(/link to what you made/i), {
      target: { value: "https://tiktok.com/@ada/video/1" },
    });
    fireEvent.change(screen.getByLabelText(/where you posted it/i), { target: { value: "YouTube" } });
    fireEvent.change(screen.getByLabelText(/what it shows/i), { target: { value: "Shows the feed" } });
    fireEvent.click(screen.getByRole("button", { name: /send it in/i }));

    await waitFor(() =>
      expect(send).toHaveBeenCalledWith("https://tiktok.com/@ada/video/1", "YouTube", "Shows the feed"),
    );
  });

  /// <summary>Not looked at is not a low mark.</summary>
  ///
  /// A participant whose work is sitting in a queue must not read that as a rejection, which is
  /// exactly what a zero beside it would say.
  it("shows unreviewed work as unlooked-at rather than as a score", async () => {
    vi.spyOn(api, "getMySubmissions").mockResolvedValue([submission()]);

    renderPage(<ContentSubmissionPanel />);

    expect(await screen.findByText(/not looked at yet/i)).toBeTruthy();
    expect(screen.queryByText("0/10")).toBeNull();
  });

  /// <summary>A mark always arrives with its reason.</summary>
  ///
  /// A number a participant cannot argue with is the thing this product refuses to produce
  /// anywhere else, and a prize depends on this one.
  it("shows a mark together with why it got it", async () => {
    vi.spyOn(api, "getMySubmissions").mockResolvedValue([
      submission({ isJudged: true, score: 9, verdict: "Shows a real feed and says why it ranked that way" }),
    ]);

    renderPage(<ContentSubmissionPanel />);

    expect(await screen.findByText("9/10")).toBeTruthy();
    expect(screen.getByText(/shows a real feed and says why it ranked that way/i)).toBeTruthy();
  });

  it("offers to take back work nobody has marked", async () => {
    vi.spyOn(api, "getMySubmissions").mockResolvedValue([submission()]);
    const withdraw = vi.spyOn(api, "withdrawSubmission").mockResolvedValue(undefined);

    renderPage(<ContentSubmissionPanel />);

    fireEvent.click(await screen.findByRole("button", { name: /take it back/i }));

    await waitFor(() => expect(withdraw).toHaveBeenCalledWith("s1"));
  });

  /// Deleting a marked submission would delete a reviewer's record of having marked it.
  it("does not offer to take back work that has been marked", async () => {
    vi.spyOn(api, "getMySubmissions").mockResolvedValue([submission({ isJudged: true, score: 7, verdict: "Good" })]);

    renderPage(<ContentSubmissionPanel />);

    expect(await screen.findByText("7/10")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /take it back/i })).toBeNull();
  });

  /// <summary>A refusal says why, in the words the server used.</summary>
  ///
  /// A duplicate link or an unusable one is a rule, not a fault, and a form that silently does
  /// nothing reads as broken.
  it("shows why a submission was refused", async () => {
    vi.spyOn(api, "getMySubmissions").mockResolvedValue([]);
    vi.spyOn(api, "submitContent").mockRejectedValue(new ApiError(409, "You have already submitted this link."));

    renderPage(<ContentSubmissionPanel />);

    fireEvent.change(await screen.findByLabelText(/link to what you made/i), {
      target: { value: "https://tiktok.com/@ada/video/1" },
    });
    fireEvent.click(screen.getByRole("button", { name: /send it in/i }));

    expect(await screen.findByText(/already submitted this link/i)).toBeTruthy();
  });

  /// Radar never opens the link itself, and the screen says so.
  it("says a person reads the link, not Radar", async () => {
    vi.spyOn(api, "getMySubmissions").mockResolvedValue([]);

    renderPage(<ContentSubmissionPanel />);

    expect(await screen.findByText(/radar does not open the link — a person does/i)).toBeTruthy();
  });

  it("does not render a failure as having sent nothing", async () => {
    vi.spyOn(api, "getMySubmissions").mockRejectedValue(new Error("offline"));

    renderPage(<ContentSubmissionPanel />);

    expect(await screen.findByText(/could not load what you have sent/i)).toBeTruthy();
  });
});
