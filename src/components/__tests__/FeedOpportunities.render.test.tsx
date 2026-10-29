import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { FeedOpportunities } from "../FeedOpportunities";
import { renderPage } from "../../test/harness";
import type { Opportunity } from "../../lib/types";

/// The third strand of Radar Intelligence: things you can actually apply for.
///
/// The rules worth holding. Never padded — a strip filled out to look populated sends somebody to
/// spend an afternoon on an application Radar did not match them to. Never silent about a
/// deadline it knows, because that is the only part of an opportunity that expires. And never a
/// reason Radar did not have.

function opportunity(overrides: Partial<Opportunity> = {}): Opportunity {
  return {
    id: crypto.randomUUID(),
    type: "Scholarship",
    title: "Mastercard Foundation Scholars Programme",
    organisation: "Mastercard Foundation",
    logoUrl: "",
    description: "Full scholarship for African students.",
    deadline: null,
    requirements: [],
    matchScorePercent: 80,
    url: "https://example.com/scholarship",
    location: null,
    isRemote: false,
    isSaved: false,
    whyItFits: null,
    matchConfidence: 0.8,
    preparationSteps: [],
    discoveredAt: "2026-10-01T00:00:00Z",
    daysUntilDeadline: 0,
    ...overrides,
  } as Opportunity;
}

describe("FeedOpportunities", () => {
  /// Nothing open means nothing rendered, rather than an empty frame that looks broken.
  it("renders nothing when there is nothing open", () => {
    const { container } = renderPage(<FeedOpportunities opportunities={[]} />);

    expect(container.querySelector(".feed-opps")).toBeNull();
  });

  it("names what it is and who it is from", () => {
    const { container } = renderPage(
      <FeedOpportunities opportunities={[opportunity({ organisation: "Chevening" })]} />,
    );

    expect(screen.getByText("Mastercard Foundation Scholars Programme")).toBeTruthy();
    expect(container.querySelector(".feed-opps__meta")?.textContent).toContain("Chevening");
  });

  /// A deadline is the only part of an opportunity that expires, so a known one is always said.
  it("says when a deadline is close", () => {
    renderPage(
      <FeedOpportunities
        opportunities={[opportunity({ deadline: "2026-11-05T00:00:00Z", daysUntilDeadline: 5 })]}
      />,
    );

    expect(screen.getByText(/5 days left/)).toBeTruthy();
  });

  /// And an unknown one is not invented.
  it("says nothing about a deadline it does not have", () => {
    const { container } = renderPage(
      <FeedOpportunities opportunities={[opportunity({ deadline: null })]} />,
    );

    expect(container.querySelector(".feed-opps__closes")).toBeNull();
  });

  /// The match is attributed so a reader can disagree with it.
  it("names what the match was made on", () => {
    renderPage(<FeedOpportunities opportunities={[opportunity()]} focus="Data analysis" />);

    expect(screen.getByText(/matched on Data analysis/)).toBeTruthy();
  });

  /// It used to default to "Cybersecurity", telling a new reader Radar had matched against a
  /// focus they never chose.
  it("claims no focus when it has none", () => {
    const { container } = renderPage(<FeedOpportunities opportunities={[opportunity()]} />);

    expect(container.querySelector(".feed-opps__focus")).toBeNull();
  });

  it("invents no reason when Radar has none", () => {
    const { container } = renderPage(
      <FeedOpportunities opportunities={[opportunity({ whyItFits: null })]} />,
    );

    expect(container.querySelector(".feed-opps__why")).toBeNull();
  });
});
