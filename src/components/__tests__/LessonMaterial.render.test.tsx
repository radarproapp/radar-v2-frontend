import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { LessonMaterial } from "../LessonMaterial";
import { renderPage } from "../../test/harness";
import type { LessonResource } from "../../lib/types";

/// Five videos and two reads for one lesson, each with what is in it.
///
/// The rules worth holding: never pad to reach five, never present a description-derived summary
/// as though somebody watched the video, and never dress a search page as a player.

function video(overrides: Partial<LessonResource> = {}): LessonResource {
  return {
    id: crypto.randomUUID(),
    kind: "Video",
    title: "ARP spoofing explained",
    url: "https://www.youtube.com/watch?v=abc123",
    embedUrl: "https://www.youtube.com/embed/abc123",
    thumbnailUrl: "https://i.ytimg.com/vi/abc123/hq.jpg",
    source: "NetworkChuck",
    duration: "14 min",
    publishedAt: "2026-01-01T00:00:00Z",
    summary: "Walks through how ARP replies are forged on a switched network.",
    summarySource: "Description",
    contentItemId: null,
    whyRelevant: "",
    ...overrides,
  };
}

function article(overrides: Partial<LessonResource> = {}): LessonResource {
  return {
    ...video(),
    kind: "Article",
    title: "Why ARP has no authentication",
    url: "https://example.com/arp",
    embedUrl: null,
    thumbnailUrl: null,
    source: "TechCentral",
    duration: "6 min read",
    summary: "Explains the design decision and what replaced it.",
    summarySource: "Publisher",
    contentItemId: "item-1",
    ...overrides,
  };
}

describe("LessonMaterial", () => {
  it("renders nothing when the lesson has no material yet", () => {
    const { container } = renderPage(<LessonMaterial resources={[]} />);

    expect(container.querySelector(".material")).toBeNull();
  });

  it("counts the videos and the reads separately", () => {
    renderPage(
      <LessonMaterial
        resources={[video(), video(), video(), video(), video(), article(), article()]}
      />,
    );

    expect(screen.getByText("Watch")).toBeTruthy();
    expect(screen.getByText("Read")).toBeTruthy();
    expect(screen.getByText("5")).toBeTruthy();
    expect(screen.getByText("2")).toBeTruthy();
  });

  /// Three videos and no article shows three videos. Padding to five with search links would be
  /// a resource in name only, which is the reason podcasts are absent from the path entirely.
  it("does not pad to reach five", () => {
    renderPage(<LessonMaterial resources={[video(), video(), video()]} />);

    expect(screen.getByText("3")).toBeTruthy();
    expect(screen.queryByText("Read")).toBeNull();
  });

  /// The provenance line is the point. A summary of a two-line YouTube blurb and a summary of
  /// forty minutes read identically without it, and only one is worth planning around.
  it("says a video summary came from the title rather than from watching", () => {
    renderPage(<LessonMaterial resources={[video()]} />);

    expect(screen.getByText(/not from watching it/i)).toBeTruthy();
  });

  // A publisher summary was written about the article itself, so it carries no caveat.
  it("does not caveat a publisher summary", () => {
    renderPage(<LessonMaterial resources={[article()]} />);

    expect(screen.getByText("Explains the design decision and what replaced it.")).toBeTruthy();
    expect(screen.queryByText(/not from watching it/i)).toBeNull();
  });

  // An absent summary says it is absent rather than leaving a gap that reads as "no content".
  it("says when a summary has not been written yet", () => {
    renderPage(<LessonMaterial resources={[video({ summary: "" })]} />);

    expect(screen.getByText(/no summary yet/i)).toBeTruthy();
  });

  /// A YouTube *search* url is not a video. parseVideoUrl refuses it, and the row becomes a link
  /// out rather than a dead player.
  it("does not dress a search page as a player", () => {
    renderPage(
      <LessonMaterial
        resources={[
          video(),
          video({
            title: "Nothing resolved for this one",
            url: "https://www.youtube.com/results?search_query=arp+spoofing",
            embedUrl: null,
          }),
        ]}
      />,
    );

    const link = screen.getByRole("link");
    expect(link.getAttribute("href")).toContain("/results?search_query=");
  });

  // An ingested article links into the brief, which carries the why and the next move.
  it("links an ingested article into its brief", () => {
    renderPage(<LessonMaterial resources={[article({ contentItemId: "item-9" })]} />);

    // A button rather than an anchor, because it navigates within the app.
    expect(screen.getByRole("button", { name: /why arp has no authentication/i })).toBeTruthy();
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("links straight out when Radar did not ingest the article", () => {
    renderPage(<LessonMaterial resources={[article({ contentItemId: null })]} />);

    expect(screen.getByRole("link").getAttribute("href")).toBe("https://example.com/arp");
  });

  /// An empty lesson is a result, and which result it is matters.
  ///
  /// Three different facts used to render as the same blank space: the library holds nothing that
  /// teaches this lesson, Radar could not check, and Radar is still gathering. The second is a
  /// fault — and with it invisible, a provider outage that emptied every lesson on the platform
  /// would have looked exactly like a thin corpus.
  it("says why there is nothing, rather than showing blank space", () => {
    renderPage(
      <LessonMaterial
        resources={[]}
        note="Radar could not check these against the lesson just now, so none are shown."
      />,
    );

    expect(screen.getByText(/could not check/i)).toBeTruthy();
  });

  it("still renders nothing for a lesson that predates the check", () => {
    const { container } = renderPage(<LessonMaterial resources={[]} note="" />);

    expect(container.querySelector(".material__note")).toBeNull();
  });

  /// Partly gathered is its own state: what arrived is shown, and the rest is promised honestly
  /// rather than the lesson looking finished with two items.
  it("shows what it has alongside a note when more is still coming", () => {
    renderPage(
      <LessonMaterial resources={[article()]} note="Radar is still looking for videos." />,
    );

    expect(screen.getByText(/still looking for videos/i)).toBeTruthy();
    expect(screen.getByText("Why ARP has no authentication")).toBeTruthy();
  });

  it("shows why a resource was kept, in the words of the check that kept it", () => {
    renderPage(
      <LessonMaterial resources={[article({ whyRelevant: "explains the forged reply step by step" })]} />,
    );

    expect(screen.getByText("explains the forged reply step by step")).toBeTruthy();
  });

  /// Kept without a reason shows none. A sentence Radar wrote about why something matters,
  /// attributed to a judgement that never produced one, is a fabrication however small.
  it("invents no reason when the check did not give one", () => {
    const { container } = renderPage(
      <LessonMaterial resources={[article({ whyRelevant: "" })]} />,
    );

    expect(container.querySelector(".material__why")).toBeNull();
  });
});
