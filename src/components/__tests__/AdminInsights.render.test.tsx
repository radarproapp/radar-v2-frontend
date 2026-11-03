import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { AdminActivitySection, AdminEngagementSection } from "../AdminInsights";
import { renderPage } from "../../test/harness";
import * as api from "../../lib/api";
import type { AdminActivity, AdminEngagement } from "../../lib/api";

/// The one screen whose whole purpose is to tell the owner the truth about their product.
///
/// Four sections of this dashboard used to render invented figures with trend arrows beside
/// them. These two read real events, so what matters here is the opposite failure: a window
/// with nothing in it must say so, a question the events cannot answer must say so, and
/// nothing may white-screen the section instead of saying either.

function activity(overrides: Partial<AdminActivity> = {}): AdminActivity {
  return {
    days: 30,
    byDay: [
      { day: "2026-10-30", events: 12, people: 4 },
      { day: "2026-10-31", events: 30, people: 9 },
    ],
    mix: { Open: 30, Impression: 12 },
    funnel: { impressions: 12, opens: 30, saves: 3, dismissals: 1, reports: 0 },
    recorded: ["Impression", "Open", "Save", "ClipSaved"],
    ...overrides,
  };
}

function engagement(overrides: Partial<AdminEngagement> = {}): AdminEngagement {
  return {
    days: 30,
    items: [
      { contentItemId: "a", title: "Nurses win pay review", source: "Premium Times", type: "Article", opens: 9, saves: 2 },
    ],
    sources: [
      { source: "Noisy Wire", published: 1200, opens: 0, dismissals: 0 },
      { source: "Quiet Journal", published: 2, opens: 8, dismissals: 1 },
    ],
    ...overrides,
  };
}

describe("AdminActivitySection", () => {
  it("counts people separately from events", async () => {
    vi.spyOn(api, "getAdminActivity").mockResolvedValue(activity());

    renderPage(<AdminActivitySection />);

    expect(await screen.findByText(/events and people, by day/i)).toBeTruthy();
    expect(screen.getByText(/distinct people/i)).toBeTruthy();
  });

  /// An empty window is a sentence, not an empty chart.
  it("says plainly when the window holds nothing", async () => {
    vi.spyOn(api, "getAdminActivity").mockResolvedValue(activity({ byDay: [], mix: {} }));

    renderPage(<AdminActivitySection />);

    expect(await screen.findByText(/nothing recorded in the last 30 days/i)).toBeTruthy();
  });

  /// <summary>The window named is the window that was used.</summary>
  ///
  /// The service clamps to 180 days. Echoing the request back instead put "nothing recorded in
  /// the last 10000 days" above half a year of data - a sentence nothing produced.
  it("names the window the server actually used, not the one asked for", async () => {
    vi.spyOn(api, "getAdminActivity").mockResolvedValue(activity({ days: 180, byDay: [] }));

    renderPage(<AdminActivitySection />);

    expect(await screen.findByText(/nothing recorded in the last 180 days/i)).toBeTruthy();
  });

  /// <summary>What the screen cannot see is named.</summary>
  ///
  /// A kind of event nobody has fired and a kind that is never logged look identical from here,
  /// and a dashboard silent about the difference invites its figures to be read as everything.
  it("names the event kinds it has seen nothing of", async () => {
    vi.spyOn(api, "getAdminActivity").mockResolvedValue(activity());

    renderPage(<AdminActivitySection />);

    expect(await screen.findByText(/not seen in this window/i)).toBeTruthy();
    expect(screen.getByText(/ClipSaved/)).toBeTruthy();
  });

  /// <summary>The funnel says which population it counted.</summary>
  ///
  /// Opens are recorded for opportunities too. Counting those beside feed impressions made Opens
  /// exceed Impressions by design, under a caption telling the reader that impressions were not
  /// being logged - which sent somebody after a bug that was not there.
  it("says the funnel covers feed content only", async () => {
    vi.spyOn(api, "getAdminActivity").mockResolvedValue(activity());

    renderPage(<AdminActivitySection />);

    expect(await screen.findByText(/the funnel, for feed content/i)).toBeTruthy();
    expect(screen.getByText(/every stage counts events carrying a content id/i)).toBeTruthy();
  });

  /// A failure says so rather than rendering zeroes, which would read as a dead product.
  it("does not render a failure as an empty month", async () => {
    vi.spyOn(api, "getAdminActivity").mockRejectedValue(new Error("offline"));

    renderPage(<AdminActivitySection />);

    expect(await screen.findByText(/could not read activity/i)).toBeTruthy();
    expect(screen.queryByText(/nothing recorded/i)).toBeNull();
  });

  /// <summary>An absent body is not a render.</summary>
  ///
  /// `data!` was unsound on two reachable paths: an offline browser leaves the query pending but
  /// not loading, and a 2xx that is not JSON - a proxy serving index.html for /api/* - resolves
  /// to null. Either one threw on `data.byDay` and took the section down with it.
  it("survives a resolved-but-empty response instead of throwing", async () => {
    vi.spyOn(api, "getAdminActivity").mockResolvedValue(null as unknown as AdminActivity);

    renderPage(<AdminActivitySection />);

    expect(await screen.findByText(/counting/i)).toBeTruthy();
  });
});

describe("AdminEngagementSection", () => {
  /// <summary>Volume beside attention, including the case with no attention at all.</summary>
  ///
  /// A source filing twelve hundred items for no opens is the single thing the filed column
  /// exists to expose, and building the rows from engaged events alone hid it completely.
  it("lists a source that filed plenty and earned nothing", async () => {
    vi.spyOn(api, "getAdminEngagement").mockResolvedValue(engagement());

    renderPage(<AdminEngagementSection />);

    expect(await screen.findByText("Noisy Wire")).toBeTruthy();
    expect(screen.getByText(/1200 filed · 0 opened/)).toBeTruthy();
  });

  it("says plainly when nothing has been opened", async () => {
    vi.spyOn(api, "getAdminEngagement").mockResolvedValue(engagement({ items: [], sources: [] }));

    renderPage(<AdminEngagementSection />);

    expect(await screen.findByText(/nothing has been opened in the last 30 days/i)).toBeTruthy();
  });

  it("does not render a failure as nothing being read", async () => {
    vi.spyOn(api, "getAdminEngagement").mockRejectedValue(new Error("offline"));

    renderPage(<AdminEngagementSection />);

    expect(await screen.findByText(/could not read engagement/i)).toBeTruthy();
    expect(screen.queryByText(/nothing has been opened/i)).toBeNull();
  });

  it("survives a resolved-but-empty response instead of throwing", async () => {
    vi.spyOn(api, "getAdminEngagement").mockResolvedValue(null as unknown as AdminEngagement);

    renderPage(<AdminEngagementSection />);

    expect(await screen.findByText(/counting/i)).toBeTruthy();
  });
});
