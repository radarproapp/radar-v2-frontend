import { describe, expect, it, vi } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import { MediaPlayer } from "../MediaPlayer";
import { renderPage } from "../../test/harness";
import * as api from "../../lib/api";

/// The player that was 21 lines around a bare browser audio element.
///
/// I measured that the URLs existed and reported playback as solved, which was wrong — there was
/// no resume, no speed, no skip and no chapters. These assert the controls are present and that
/// a chapter with an unparseable timestamp is visibly inert rather than silently seeking to zero.
///
/// Heartbeat accumulation is not tested here: jsdom's media element never advances currentTime,
/// so a test of it would assert against a clock that does not tick. The clamping it feeds is
/// covered server-side in PlaybackHonestyTests, and verified against staging.

const AUDIO = "https://example.com/episode.mp3";

function renderPlayer(props: Partial<Parameters<typeof MediaPlayer>[0]> = {}) {
  vi.spyOn(api, "recordPlayback").mockResolvedValue({
    positionSeconds: 0,
    secondsPlayed: 0,
    completedAt: null,
  });

  return renderPage(
    <MediaPlayer contentItemId="item-1" url={AUDIO} title="An episode" {...props} />,
  );
}

describe("MediaPlayer", () => {
  it("renders the transport controls the old one did not have", () => {
    renderPlayer();

    expect(screen.getByRole("button", { name: /play an episode/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /back 15 seconds/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /forward 30 seconds/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /playback speed/i })).toBeTruthy();
    expect(screen.getByRole("slider", { name: /seek/i })).toBeTruthy();
  });

  // An episode with no audio enclosure renders nothing, so callers can drop it in unconditionally.
  it("renders nothing without a url", () => {
    const { container } = renderPlayer({ url: null });

    expect(container.querySelector(".player")).toBeNull();
  });

  it("cycles the speed rather than hiding it behind a menu", () => {
    renderPlayer();
    const speed = screen.getByRole("button", { name: /playback speed/i });

    expect(speed.textContent).toContain("1×");
    fireEvent.click(speed);
    expect(speed.textContent).toContain("1.25×");
  });

  /// The resume point is announced. Picking up at 14:32 without saying so looks like a player
  /// that lost its place and started in the middle.
  it("says where it is picking up from", () => {
    renderPlayer({
      initial: { positionSeconds: 872, durationSeconds: 1800, secondsPlayed: 872, completedAt: null },
    });

    expect(screen.getByText(/picking up at 14:32/i)).toBeTruthy();
  });

  it("does not claim to resume an episode that was never started", () => {
    renderPlayer();

    expect(screen.queryByText(/picking up at/i)).toBeNull();
  });

  it("lists chapters the episode declared", () => {
    renderPlayer({
      chapters: [
        { title: "Cold open", timestamp: "00:00:00", summary: null },
        { title: "The interview", timestamp: "00:04:10", summary: null },
      ],
    });

    expect(screen.getByText("Chapters")).toBeTruthy();
    expect(screen.getByText("The interview")).toBeTruthy();
    expect(screen.getByText("4:10")).toBeTruthy();
  });

  /// Chapters come from feeds other people wrote, so the timestamp is not always one. A chapter
  /// that silently seeks to the start is worse than one that is visibly not clickable.
  it("shows an unparseable chapter as inert rather than seeking to zero", () => {
    renderPlayer({
      chapters: [{ title: "Part one", timestamp: "somewhere near the middle", summary: null }],
    });

    const chapter = screen.getByText("Part one").closest("button");

    expect(chapter).toBeTruthy();
    expect((chapter as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText("—")).toBeTruthy();
  });

  it("shows no chapter list when the episode declared none", () => {
    renderPlayer();

    expect(screen.queryByText("Chapters")).toBeNull();
  });
});
