import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { PrivacyPolicy } from "../PrivacyPolicy";
import { TermsOfService } from "../TermsOfService";
import { renderPage } from "../../test/harness";

/// The two documents a user is told they have agreed to.
///
/// Both were href="#privacy" and href="#terms" — anchors pointing at nothing on a page with no
/// such sections. The links looked live and did nothing.

describe("PrivacyPolicy", () => {
  it("renders the document rather than a placeholder", () => {
    renderPage(<PrivacyPolicy />);

    expect(screen.getByText("Privacy Policy")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "1. Introduction" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "18. Final Statement" })).toBeTruthy();
  });

  /// The specific clause this product is built around, so it is worth asserting it survived the
  /// transcription rather than being summarised away.
  it("keeps the clause saying recommendations are estimates", () => {
    renderPage(<PrivacyPolicy />);

    expect(
      screen.getByText(/recommendations are estimates, not definitive conclusions/i),
    ).toBeTruthy();
  });

  /// Blank in the supplied document. Shown as outstanding rather than filled with an address
  /// nobody has set up — a user would write to an invented privacy contact and nobody would read
  /// it, which is worse than a visible gap.
  it("marks the unpublished contact details rather than inventing them", () => {
    renderPage(<PrivacyPolicy />);

    expect(screen.getAllByText("To be published").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Radar Systems Limited").length).toBeGreaterThan(0);
  });
});

describe("TermsOfService", () => {
  it("renders the document", () => {
    renderPage(<TermsOfService />);

    expect(screen.getByText("Terms and Conditions of Use")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "1. Introduction" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "20. Contact Us" })).toBeTruthy();
  });

  // The AI accuracy section is the one most likely to be quietly trimmed, and the one that
  // matters most for a product that generates summaries.
  it("keeps the clause about AI output accuracy", () => {
    renderPage(<TermsOfService />);

    expect(screen.getByText(/AI-generated outputs may contain errors/i)).toBeTruthy();
  });

  it("marks the unpublished contact details rather than inventing them", () => {
    renderPage(<TermsOfService />);

    expect(screen.getAllByText("To be published").length).toBeGreaterThan(0);
  });
});
