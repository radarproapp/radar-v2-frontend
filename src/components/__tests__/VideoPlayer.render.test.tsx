import { describe, expect, it, vi } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import { VideoPlayer } from "../VideoPlayer";
import { renderPage } from "../../test/harness";
import * as api from "../../lib/api";

/// Pressing play has to start something.
///
/// Reported from production: videos in the feed did not play. The poster rendered, the play
/// symbol rendered, and clicking it did nothing at all — not intermittently, never. The click
/// handler guarded on the ref of the mount node, but that node is only rendered once the player
/// has started, so on the first click the ref was null, the guard returned before the state was
/// set, and the state that would have rendered the node was the state the guard prevented.
///
/// jsdom cannot load YouTube's IFrame API, so what is asserted here is the thing that was broken:
/// the click changes what is on screen. Whether the resulting player then reports position is
/// covered server-side.

const YOUTUBE = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";

function render(url: string = YOUTUBE) {
  vi.spyOn(api, "recordPlayback").mockResolvedValue({
    positionSeconds: 0,
    secondsPlayed: 0,
    durationSeconds: 0,
    completedAt: null,
  } as never);

  return renderPage(
    <VideoPlayer contentItemId="item-1" url={url} title="Apple reveals a touchscreen MacBook Pro" />,
  );
}

describe("VideoPlayer", () => {
  it("offers a poster before anything is loaded", () => {
    render();

    expect(screen.getByLabelText(/play apple reveals/i)).toBeTruthy();
  });

  /// The regression. Before the fix the poster stayed on screen and nothing else happened.
  it("leaves the poster behind when play is pressed", () => {
    const { container } = render();

    fireEvent.click(screen.getByLabelText(/play apple reveals/i));

    expect(container.querySelector(".video-embed--poster")).toBeNull();
  });

  it("puts something playable on screen when play is pressed", () => {
    const { container } = render();

    fireEvent.click(screen.getByLabelText(/play apple reveals/i));

    // Either the API-backed mount point, or the plain embed it falls back to when the API cannot
    // be loaded — which is what happens here, and is the honest outcome in a browser that blocks
    // it too.
    expect(container.querySelector(".video-embed--frame")).toBeTruthy();
  });

  /// A url nothing can play is said out loud rather than dressed as a player.
  it("offers the source site for a video it cannot embed", () => {
    render("https://example.com/some-video-page");

    expect(screen.getByText(/watch on the source site/i)).toBeTruthy();
  });
});
