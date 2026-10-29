import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { Route, Routes } from "react-router-dom";
import { ProjectShowcase } from "../ProjectShowcase";
import { renderPage } from "../../test/harness";
import * as api from "../../lib/api";
import type { PublicProject } from "../../lib/types";

/// A project shared with somebody who is not signed in.
///
/// The endpoint used to return the stored project in full: every submission, the text extracted
/// from the uploaded work, and every assessment with its criteria quoting that work, including the
/// attempts that were refused. It returns an allow-list now, and this page reads that shape — the
/// badge was tied to `isCompleted`, which the allow-list does not have, so for one deploy a
/// project that had met the standard showed nothing at all.

function publicProject(overrides: Partial<PublicProject> = {}): PublicProject {
  return {
    id: "p1",
    title: "Map your own network",
    description: "A diagram of every device on the network and what it talks to.",
    isAccepted: true,
    completedAt: "2026-10-29T00:00:00Z",
    ...overrides,
  };
}

/// Rendered inside the route it lives on, because the page reads the id from the path — mounted
/// bare, useParams returns nothing and the page quietly draws an empty shell.
function showcase() {
  return renderPage(
    <Routes>
      <Route path="/showcase/:projectId" element={<ProjectShowcase />} />
    </Routes>,
    { route: "/showcase/p1" },
  );
}

describe("ProjectShowcase", () => {
  it("shows the project", async () => {
    vi.spyOn(api, "getPublicProject").mockResolvedValue(publicProject());

    showcase();

    expect(await screen.findByText("Map your own network")).toBeTruthy();
    expect(screen.getByText(/every device on the network/i)).toBeTruthy();
  });

  /// The one fact worth showing a stranger: it was judged against the standards for the path and
  /// met them. Tied to the field the endpoint actually sends, which is the part that broke.
  it("says the work was accepted", async () => {
    vi.spyOn(api, "getPublicProject").mockResolvedValue(publicProject());

    showcase();

    expect(await screen.findByText("Accepted")).toBeTruthy();
  });

  /// And claims nothing when it has not been.
  it("claims nothing for work that was not accepted", async () => {
    vi.spyOn(api, "getPublicProject").mockResolvedValue(
      publicProject({ isAccepted: false, completedAt: null }),
    );

    showcase();

    await screen.findByText("Map your own network");
    expect(screen.queryByText("Accepted")).toBeNull();
  });

  /// Never the mark, even if a future endpoint starts sending one.
  ///
  /// A score on a page a stranger reads turns a learning signal into a public grade. That it met
  /// the standard is the useful fact; six out of ten versus nine is between the learner and their
  /// assessment.
  it("shows no mark", async () => {
    vi.spyOn(api, "getPublicProject").mockResolvedValue({
      ...publicProject(),
      ...({ score: 7, submissions: [{ notes: "my third try" }] } as object),
    });

    const { container } = showcase();

    await screen.findByText("Map your own network");

    expect(container.textContent).not.toMatch(/\b\d{1,2}\s*\/\s*10\b/);
    expect(container.textContent).not.toMatch(/score/i);
    expect(container.textContent).not.toMatch(/my third try/);
  });

  it("says so when the link is not a public project", async () => {
    vi.spyOn(api, "getPublicProject").mockRejectedValue(new api.ApiError(404, "Project not found"));

    showcase();

    expect(await screen.findByText(/isn't public, or the link is no longer valid/i)).toBeTruthy();
  });
});
