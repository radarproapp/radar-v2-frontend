import { describe, expect, it } from "vitest";
import { parseVideoUrl } from "../video";

/// Which links Radar can actually play.
///
/// A link it does not recognise falls back to an outbound link, so getting this wrong is not a
/// crash — it is a lesson that says "Watch 5" over five videos nobody can open. That is what
/// happened when lessons started carrying federated video and nothing here knew the shape.

describe("parseVideoUrl", () => {
  it("reads a YouTube watch link", () => {
    const parsed = parseVideoUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ");

    expect(parsed?.kind).toBe("youtube");
    expect(parsed && "id" in parsed && parsed.id).toBe("dQw4w9WgXcQ");
  });

  /// An open federated video, on whatever instance hosts it.
  ///
  /// There is no central domain to match on — that is the point of the network — so the shape of
  /// the path is what identifies it, and the embed has to stay on the instance that serves it.
  it.each([
    "https://tv.example.org/videos/watch/303c1eed-9c1c-47d6-a68f-f151f28d7b1b",
    "https://peertube.example.net/w/6XsNMsbzdbh2K18QgTECLk",
    "https://video.example.com/videos/embed/303c1eed-9c1c-47d6-a68f-f151f28d7b1b",
  ])("reads a federated video: %s", (url) => {
    const parsed = parseVideoUrl(url);

    expect(parsed?.kind).toBe("peertube");
    expect(parsed && "embedUrl" in parsed && parsed.embedUrl).toContain("/videos/embed/");
    expect(parsed && "embedUrl" in parsed && parsed.embedUrl).toContain(new URL(url).host);
  });

  /// The embed stays on the host that served the link.
  ///
  /// It is a third-party instance either way, but pointing the frame somewhere other than where
  /// the video came from would be Radar choosing the host rather than following one.
  it("keeps a federated embed on its own instance", () => {
    const parsed = parseVideoUrl("https://tv.example.org/videos/watch/abcdefghijk");

    expect(parsed && "embedUrl" in parsed && parsed.embedUrl).toBe(
      "https://tv.example.org/videos/embed/abcdefghijk",
    );
  });

  /// Not everything on such a host is a video.
  it("does not treat an instance's other pages as video", () => {
    expect(parseVideoUrl("https://tv.example.org/about")).toBeNull();
    expect(parseVideoUrl("https://tv.example.org/accounts/someone")).toBeNull();
    expect(parseVideoUrl("https://tv.example.org/videos/watch/")).toBeNull();
  });

  it("reads a direct media file", () => {
    expect(parseVideoUrl("https://example.org/talk.mp4")?.kind).toBe("file");
  });

  it("returns nothing for a page that is not a video", () => {
    expect(parseVideoUrl("https://example.org/search?q=video")).toBeNull();
    expect(parseVideoUrl("not a url")).toBeNull();
    expect(parseVideoUrl(null)).toBeNull();
  });
});
