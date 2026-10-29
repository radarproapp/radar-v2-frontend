import { describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { PaperCard } from "../PaperCard";
import { renderPage } from "../../test/harness";
import * as api from "../../lib/api";
import type { AcademicPaperBreakdown, ContentItem } from "../../lib/types";

/// The summary a reader opens a paper for.
///
/// It existed in the model, in the endpoint and in this component, and never once reached a
/// reader. Twice, for two different reasons.
///
/// First nothing fetched one, and the section only rendered when the paper already carried it.
/// Then the fetch was added but conditioned on the paper not already carrying a breakdown - and
/// every search result carried one, built by sorting abstract sentences into headings by keyword.
/// So the condition was never true, and the dense keyword-sorted version is what every reader
/// saw. Measured on production: the search response had a breakdown on it, and the same paper
/// fetched by id came back in plain English that nobody could reach.
///
/// This test asserted the premise of that bug - a fixture carrying no breakdown - and passed.

function breakdown(overrides: Partial<AcademicPaperBreakdown> = {}): AcademicPaperBreakdown {
  return {
    introduction: "This paper is about how water is shared between farms in dry regions.",
    problem: "Farmers in the region lose crops when water is released on a fixed timetable.",
    aimAndObjectives: "The authors wanted to know whether releasing water on demand did better.",
    methodology: "They followed 40 farms over two growing seasons.",
    keyArguments: "They argue a fixed timetable suits the supplier and not the farm.",
    findings: "Yields rose by 18 per cent on the farms that could ask for water when needed.",
    conclusion: "The authors conclude that demand-led release is worth the extra administration.",
    contribution: "It puts a number on something that had been argued without one.",
    whyItMatters: "If you advise smallholders, this is an argument you can take to a water board.",
    era: "Recent",
    limitations: "Not stated in the abstract.",
    futureWork: "The authors call for a longer study across more than two seasons.",
    ...overrides,
  };
}

function paper(overrides: Partial<ContentItem> = {}): ContentItem {
  return {
    id: "W1",
    title: "Demand-led irrigation in semi-arid smallholder systems",
    doi: "10.1234/example",
    authors: ["A. Researcher"],
    journal: "Journal of Water",
    publishedAt: "2024-03-01T00:00:00Z",
    aiSummary: "An abstract, as OpenAlex returns it.",
    paperBreakdown: null,
    ...overrides,
  } as ContentItem;
}

describe("PaperCard", () => {
  /// Opening the card fetches the summary, because that is where it comes from.
  it("fetches the summary when the card is opened", async () => {
    const spy = vi
      .spyOn(api, "getPaper")
      .mockResolvedValue(paper({ paperBreakdown: breakdown() }));

    renderPage(<PaperCard paper={paper()} />);
    fireEvent.click(screen.getByRole("button", { name: /demand-led irrigation/i }));

    await waitFor(() => expect(spy).toHaveBeenCalledWith("W1"));
    expect(await screen.findByText(/yields rose by 18 per cent/i)).toBeTruthy();
  });

  /// Nothing is fetched until it is asked for. A page of twenty results would otherwise be twenty
  /// model calls for the nineteen nobody opens.
  it("fetches nothing for a card nobody opened", () => {
    const spy = vi.spyOn(api, "getPaper").mockResolvedValue(paper());

    renderPage(<PaperCard paper={paper()} />);

    expect(spy).not.toHaveBeenCalled();
  });

  /// Every section the spec names is on screen, under a heading somebody would say out loud.
  it("shows the sections the spec names", async () => {
    vi.spyOn(api, "getPaper").mockResolvedValue(paper({ paperBreakdown: breakdown() }));

    renderPage(<PaperCard paper={paper()} />);
    fireEvent.click(screen.getByRole("button", { name: /demand-led irrigation/i }));

    expect(await screen.findByText("Introduction")).toBeTruthy();
    expect(screen.getByText("The problem")).toBeTruthy();
    expect(screen.getByText("How they did it")).toBeTruthy();
    expect(screen.getByText("What they found")).toBeTruthy();
    expect(screen.getByText("What they conclude")).toBeTruthy();
  });

  /// What the authors say their own work cannot do, kept rather than dropped.
  it("keeps the limitations, including when the paper did not state them", async () => {
    vi.spyOn(api, "getPaper").mockResolvedValue(paper({ paperBreakdown: breakdown() }));

    renderPage(<PaperCard paper={paper()} />);
    fireEvent.click(screen.getByRole("button", { name: /demand-led irrigation/i }));

    expect(await screen.findByText("What it cannot tell you")).toBeTruthy();
    expect(screen.getByText("Not stated in the abstract.")).toBeTruthy();
  });

  /// A summary that could not be built is said, not left as a blank space.
  it("says so when there is no summary", async () => {
    vi.spyOn(api, "getPaper").mockResolvedValue(paper({ paperBreakdown: null }));

    renderPage(<PaperCard paper={paper()} />);
    fireEvent.click(screen.getByRole("button", { name: /demand-led irrigation/i }));

    expect(await screen.findByText(/could not summarise this one/i)).toBeTruthy();
  });

  /// A paper that arrives carrying a summary is still re-read, and the fetched one wins.
  ///
  /// This is the shape production actually serves. The carried breakdown is a fallback for the
  /// seconds before the fetch lands - not a reason to skip it, which is what made the whole
  /// feature unreachable.
  it("prefers the fetched summary over one the paper arrived with", async () => {
    const spy = vi.spyOn(api, "getPaper").mockResolvedValue(
      paper({ paperBreakdown: breakdown({ findings: "Yields rose by 18 per cent." }) }),
    );

    const carried = breakdown({ findings: "Sorted out of the abstract by keyword." });

    renderPage(<PaperCard paper={paper({ paperBreakdown: carried })} />);
    fireEvent.click(screen.getByRole("button", { name: /demand-led irrigation/i }));

    // The carried one shows first, because it is already there.
    expect(screen.getByText(/sorted out of the abstract/i)).toBeTruthy();

    await waitFor(() => expect(spy).toHaveBeenCalledWith("W1"));
    expect(await screen.findByText("Yields rose by 18 per cent.")).toBeTruthy();
  });
});
