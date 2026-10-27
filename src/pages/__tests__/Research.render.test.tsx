import { describe, expect, it, vi } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import { Research } from "../Research";
import { renderPage } from "../../test/harness";
import * as api from "../../lib/api";
import * as auth from "../../auth/AuthContext";
import type { ContentItem } from "../../lib/types";

/// Research Discovery, which I shipped without ever watching it render.
///
/// The rule it exists to enforce: the box starts empty and nothing is searched until the reader
/// asks. A hand-written catalogue of invented papers used to be returned ahead of the live
/// results, so "every result has a DOI that resolves" is the claim the page makes and these
/// assert it is the page's actual behaviour.

function paper(overrides: Partial<ContentItem> = {}) {
  return {
    id: "W123",
    title: "On Layer Normalization in the Transformer Architecture",
    authors: ["Ruibin Xiong"],
    journal: "arXiv",
    doi: "10.48550/arXiv.2002.04745",
    url: "https://doi.org/10.48550/arXiv.2002.04745",
    publishedAt: "2020-02-12T00:00:00Z",
    type: "ResearchPaper",
    chapters: [],
    ...overrides,
  } as unknown as ContentItem;
}

function withProfile(interests: string[]) {
  vi.spyOn(auth, "useAuth").mockReturnValue({
    isAuthenticated: true,
    isLoading: false,
    profile: { interests } as never,
    signIn: () => {},
    signOut: () => {},
    refetchProfile: async () => {},
  });
}

describe("Research", () => {
  it("searches nothing until asked", () => {
    withProfile([]);
    const search = vi.spyOn(api, "searchResearch");

    renderPage(<Research />);

    expect(screen.getByText("Nothing searched yet")).toBeTruthy();
    expect(search).not.toHaveBeenCalled();
  });

  /// Declared interests are offered because the user typed them, but offering is not running:
  /// the page must not pick a subject on somebody's behalf.
  it("offers declared interests without searching them", () => {
    withProfile(["Computer Science", "Nursing"]);
    const search = vi.spyOn(api, "searchResearch");

    renderPage(<Research />);

    expect(screen.getByText("Your subjects")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Nursing" })).toBeTruthy();
    expect(search).not.toHaveBeenCalled();
  });

  it("searches an interest when the chip is pressed", async () => {
    withProfile(["Computer Science"]);
    const search = vi.spyOn(api, "searchResearch").mockResolvedValue([paper()]);

    renderPage(<Research />);
    fireEvent.click(screen.getByRole("button", { name: "Computer Science" }));

    expect(await screen.findByText(/On Layer Normalization/)).toBeTruthy();
    expect(search).toHaveBeenCalledWith(
      expect.objectContaining({ q: "Computer Science" }),
    );
  });

  /// The DOI is a link, not decoration — it is the one thing on the card a reader can check for
  /// themselves, which is the whole point after six of eight catalogue DOIs turned out to be 404.
  it("shows the DOI as a resolvable link", async () => {
    withProfile([]);
    vi.spyOn(api, "searchResearch").mockResolvedValue([paper()]);

    renderPage(<Research />, { route: "/research?q=transformers" });

    const link = await screen.findByRole("link", { name: /10\.48550/ });
    expect(link.getAttribute("href")).toBe("https://doi.org/10.48550/arXiv.2002.04745");
  });

  it("says an empty result is the honest answer", async () => {
    withProfile([]);
    vi.spyOn(api, "searchResearch").mockResolvedValue([]);

    renderPage(<Research />, { route: "/research?q=nothing+matches+this" });

    expect(await screen.findByText(/nothing matches/i)).toBeTruthy();
    expect(screen.getByText(/empty result is the honest answer/i)).toBeTruthy();
  });

  // ?q= arrives from the Hub, so the reader does not retype a subject they just chose.
  it("runs a search handed to it in the url", async () => {
    withProfile([]);
    const search = vi.spyOn(api, "searchResearch").mockResolvedValue([paper()]);

    renderPage(<Research />, { route: "/research?q=layer+normalization" });

    expect(await screen.findByText(/On Layer Normalization/)).toBeTruthy();
    expect(search).toHaveBeenCalledWith(expect.objectContaining({ q: "layer normalization" }));
  });

  it("says so when the search cannot be run", async () => {
    withProfile([]);
    vi.spyOn(api, "searchResearch").mockRejectedValue(new Error("down"));

    renderPage(<Research />, { route: "/research?q=anything" });

    expect(
      await screen.findByText("The search did not complete", {}, { timeout: 3000 }),
    ).toBeTruthy();
  });
});
