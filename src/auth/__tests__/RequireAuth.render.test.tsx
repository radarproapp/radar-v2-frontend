import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { Route, Routes } from "react-router-dom";
import { RequireAuth } from "../RequireAuth";
import { renderPage } from "../../test/harness";
import * as auth from "../AuthContext";

/// Where somebody who has answered nothing is sent.
///
/// Reported from the product: creating a second profile showed the old screen again — forty-odd
/// subjects as buttons, the thing the three typed questions replaced. The cause was here rather
/// than in the profile switcher. A new profile has answered nothing, this sent anything
/// unanswered to /onboarding, and /onboarding is the persona picker that leads to that grid.
///
/// So the screen a learner meets on their second profile was the one the product had moved away
/// from on their first.

function signedIn(onboardingComplete: boolean) {
  vi.spyOn(auth, "useAuth").mockReturnValue({
    isAuthenticated: true,
    isLoading: false,
    profile: { id: "u1", persona: "Student", onboardingComplete } as never,
    signIn: () => {},
    signOut: () => {},
    refetchProfile: async () => {},
  });
}

function app(route: string) {
  return renderPage(
    <Routes>
      <Route path="/personalise" element={<div>the three questions</div>} />
      <Route path="/onboarding" element={<div>the old persona picker</div>} />
      <Route path="/feed" element={<RequireAuth><div>the feed</div></RequireAuth>} />
      <Route
        path="/personalise-guarded"
        element={<RequireAuth><div>the three questions</div></RequireAuth>}
      />
    </Routes>,
    { route },
  );
}

describe("RequireAuth", () => {
  it("lets a profile that has answered through", () => {
    signedIn(true);

    app("/feed");

    expect(screen.getByText("the feed")).toBeTruthy();
  });

  /// The reported bug: anything unanswered went to the screen the product replaced.
  it("sends an unanswered profile to the three questions, not the old picker", () => {
    signedIn(false);

    app("/feed");

    expect(screen.getByText("the three questions")).toBeTruthy();
    expect(screen.queryByText("the old persona picker")).toBeNull();
  });

  /// And does not send the questions screen to itself.
  ///
  /// The redirect target is a guarded route too, so without the check it would navigate to
  /// itself on every render — a profile with nothing answered could never reach the one screen
  /// that would let them answer.
  it("does not redirect the questions screen to itself", () => {
    signedIn(false);

    renderPage(
      <Routes>
        <Route
          path="/personalise"
          element={<RequireAuth><div>the three questions</div></RequireAuth>}
        />
      </Routes>,
      { route: "/personalise" },
    );

    expect(screen.getByText("the three questions")).toBeTruthy();
  });
});
