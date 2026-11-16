import { describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { Route, Routes } from "react-router-dom";
import { Onboarding } from "../Onboarding";
import { renderPage } from "../../test/harness";
import * as auth from "../../auth/AuthContext";
import * as api from "../../lib/api";

/// The page that had stopped speaking the server's language.
///
/// It held a 235-entry list of interests and sent those, and not one of them matched a string the
/// server offers — "Artificial Intelligence" against "Technology & AI". The answer text is the
/// term the feed is matched on, so the two ends meant different things by every word and nothing
/// failed. The server now refuses anything it did not offer, so the drift is a 400 rather than a
/// silence, and these cover the half that lives here.

function signedIn() {
  vi.spyOn(auth, "useAuth").mockReturnValue({
    isAuthenticated: true,
    role: "User" as const,
    isLoading: false,
    profile: { id: "u1", interests: [], goals: [] } as never,
    signIn: () => {},
    signOut: () => {},
    refetchProfile: async () => {},
  });
}

const QUESTIONS = {
  persona: "Graduate" as const,
  hasChosenCategory: true,
  onboardingComplete: false,
  questions: [
    {
      id: "graduate-interests",
      dimension: "Interests" as const,
      prompt: "Which fields do you want to grow in?",
      help: "Select up to 5.",
      fields: [
        { id: "interests", label: null, mostSelections: 5, options: ["Technology & AI", "Law"] },
      ],
    },
    {
      id: "graduate-qualifications",
      dimension: "Capabilities" as const,
      prompt: "What qualifications and skills do you currently have?",
      help: "Select your qualification and up to 5 skills.",
      fields: [
        { id: "qualification", label: "Qualification", mostSelections: 1, options: ["HND", "PhD"] },
        { id: "skills", label: "Skills", mostSelections: 5, options: ["Research", "Finance"] },
      ],
    },
  ],
};

function serving() {
  return vi.spyOn(api, "getOnboardingQuestions").mockResolvedValue(QUESTIONS as never);
}

/// Rendered behind its real route, because the persona comes from the path.
///
/// Mounting the component bare leaves useParams empty, so it falls back to Student - and the
/// first version of these tests did exactly that, passing while never exercising the category
/// the whole page is parameterised by.
function renderAt(persona: string) {
  return renderPage(
    <Routes>
      <Route path="/onboarding/:persona" element={<Onboarding />} />
    </Routes>,
    { route: `/onboarding/${persona}` },
  );
}

describe("Onboarding", () => {
  it("renders the questions the server serves, not a list of its own", async () => {
    signedIn();
    serving();

    renderAt("graduate");

    expect(await screen.findByText("Which fields do you want to grow in?")).toBeTruthy();
    expect(screen.getByText("Technology & AI")).toBeTruthy();

    // The old hardcoded wording, which the server has never offered. Its absence is the point.
    expect(screen.queryByText("Artificial Intelligence")).toBeNull();
  });

  /// A question with two parts is two fields under one prompt — a qualification and skills in one
  /// breath. Splitting them would break the promise that there are three questions.
  it("renders both parts of a two-part question", async () => {
    signedIn();
    serving();

    renderAt("graduate");

    expect(await screen.findByText("Qualification")).toBeTruthy();
    expect(screen.getByText("Skills")).toBeTruthy();
  });

  /// Deliberately lenient. The brief wants onboarding fast and expects Radar to learn the rest,
  /// so a screen that refuses to proceed until all three are answered is the one people abandon.
  it("will not submit with nothing answered, and will with one", async () => {
    signedIn();
    serving();

    renderAt("graduate");

    expect(await screen.findByText("Answer at least one to continue")).toBeTruthy();

    fireEvent.click(screen.getByText("Law"));

    expect(await screen.findByText("Continue")).toBeTruthy();
  });

  /// Only the answered questions are sent. An absent key leaves that answer alone on the server,
  /// which is what lets somebody re-open this from Settings to change one thing without wiping
  /// the other two.
  it("sends only what was answered, with the option text untouched", async () => {
    signedIn();
    serving();
    const save = vi.spyOn(api, "saveOnboardingAnswers").mockResolvedValue({} as never);

    renderAt("graduate");

    fireEvent.click(await screen.findByText("Technology & AI"));
    fireEvent.click(screen.getByText("Continue"));

    await waitFor(() => expect(save).toHaveBeenCalled());

    expect(save.mock.calls[0][0]).toEqual({
      persona: "Graduate",
      answers: { interests: ["Technology & AI"] },
    });
  });

  /// A qualification is a position on a ladder, so picking a second replaces the first rather
  /// than adding to it — five simultaneous qualifications is not a thing anybody is.
  it("a single-choice field replaces rather than accumulates", async () => {
    signedIn();
    serving();
    const save = vi.spyOn(api, "saveOnboardingAnswers").mockResolvedValue({} as never);

    renderAt("graduate");

    fireEvent.click(await screen.findByText("HND"));
    fireEvent.click(screen.getByText("PhD"));
    fireEvent.click(screen.getByText("Continue"));

    await waitFor(() => expect(save).toHaveBeenCalled());

    expect(save.mock.calls[0][0].answers.qualification).toEqual(["PhD"]);
  });

  /// The account already exists by this point, so a failed fetch should not cost the sign-up.
  /// Offering the way out matters more than the apology.
  it("offers a way past a failed fetch rather than trapping the account", async () => {
    signedIn();
    vi.spyOn(api, "getOnboardingQuestions").mockRejectedValue(new Error("offline"));

    renderAt("graduate");

    expect(await screen.findByText("Skip for now")).toBeTruthy();
    expect(screen.getByText("Try again")).toBeTruthy();
  });
});
