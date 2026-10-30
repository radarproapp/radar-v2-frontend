import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { ErrorBoundary } from "../ErrorBoundary";
import { renderPage } from "../../test/harness";

/// What a user sees when a screen does not load.
///
/// Reported from production: a full-page crash reading "Failed to fetch dynamically imported
/// module: https://www.radarproapp.com/assets/LearnPath-DHvFAcaE.js". That is developer text in
/// front of a learner, on a failure that is neither their fault nor Radar's - a deploy had
/// landed while their browser was holding the previous build, so the page's code was at a
/// filename that no longer existed.

function Explodes({ message }: { message: string }): never {
  throw new Error(message);
}

describe("ErrorBoundary", () => {
  beforeEach(() => {
    // The boundary logs the real error, which is where it belongs - but it would otherwise
    // print a stack per test and bury the actual failures.
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => vi.restoreAllMocks());

  it("renders its children when nothing is wrong", () => {
    renderPage(
      <ErrorBoundary>
        <div>the screen</div>
      </ErrorBoundary>,
    );

    expect(screen.getByText("the screen")).toBeTruthy();
  });

  /// The reported bug. Whatever broke, the raw message is not for the reader.
  it("never puts the technical message on the screen", () => {
    renderPage(
      <ErrorBoundary>
        <Explodes message="Failed to fetch dynamically imported module: https://www.radarproapp.com/assets/LearnPath-DHvFAcaE.js" />
      </ErrorBoundary>,
    );

    expect(screen.queryByText(/failed to fetch/i)).toBeNull();
    expect(screen.queryByText(/LearnPath-DHvFAcaE/)).toBeNull();
    expect(screen.queryByText(/\.js/)).toBeNull();
  });

  /// Including for an ordinary crash, which used to print whatever the exception said.
  it("says nothing technical for an ordinary crash either", () => {
    renderPage(
      <ErrorBoundary>
        <Explodes message="Cannot read properties of undefined (reading 'length')" />
      </ErrorBoundary>,
    );

    expect(screen.queryByText(/cannot read properties/i)).toBeNull();
    expect(screen.getByText("This screen did not load")).toBeTruthy();
  });

  /// And it is still logged, because the detail is genuinely useful - just not here.
  it("still logs the real error", () => {
    renderPage(
      <ErrorBoundary>
        <Explodes message="something specific" />
      </ErrorBoundary>,
    );

    expect(console.error).toHaveBeenCalled();
  });

  /// A deploy is a different thing from a bug, and saying so stops it reading as Radar broken.
  it("names a deploy as a deploy", () => {
    renderPage(
      <ErrorBoundary>
        <Explodes message="Failed to fetch dynamically imported module: /assets/LearnPath-DHvFAcaE.js" />
      </ErrorBoundary>,
    );

    expect(screen.getByText("Radar has just been updated")).toBeTruthy();
    expect(screen.getByText(/older version of Radar open/i)).toBeTruthy();
  });

  /// Safari words it differently, and a user should not get a worse message for their browser.
  it("recognises the wording each browser uses", () => {
    renderPage(
      <ErrorBoundary>
        <Explodes message="Importing a module script failed." />
      </ErrorBoundary>,
    );

    expect(screen.getByText("Radar has just been updated")).toBeTruthy();
  });

  /// There is always a way out.
  it("offers a reload", () => {
    renderPage(
      <ErrorBoundary>
        <Explodes message="anything at all" />
      </ErrorBoundary>,
    );

    expect(screen.getByRole("button", { name: /reload/i })).toBeTruthy();
  });

  /// Nothing the reader has saved is at stake, and saying so is most of the reassurance.
  it("says their work is safe", () => {
    renderPage(
      <ErrorBoundary>
        <Explodes message="anything at all" />
      </ErrorBoundary>,
    );

    expect(screen.getByText(/nothing you have saved is affected/i)).toBeTruthy();
  });
});
