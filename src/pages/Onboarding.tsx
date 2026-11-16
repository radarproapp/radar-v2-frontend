import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { PasswordField } from "../components/PasswordField";
import { OnboardingQuestions } from "../components/OnboardingQuestions";
import { useAuth } from "../auth/AuthContext";
import { forgetCode, readCode, rememberedCode } from "../lib/referral";
import { getOnboardingQuestions, register, saveOnboardingAnswers } from "../lib/api";
import { hasEnoughToSubmit, touchedOnly, whatChanged } from "../lib/onboarding";
import type { PersonaType } from "../lib/types";

/// An account, then the three questions, then the app.
///
/// This replaces three separate flows totalling 2,116 lines and four to five steps each. They
/// asked for a university, the hardest courses, target roles, study schedules and what was making
/// things difficult — all before the user had seen a single thing Radar does. The worst moment to
/// ask is before anyone knows why it helps: people answer carelessly, or leave.
///
/// The questions now come from the server. They used to come from a 235-entry list in
/// lib/interests.ts, and not one of those strings matched what the server offers — "Artificial
/// Intelligence" against "Technology & AI". The answer text *is* the term the feed is matched on,
/// so the two ends had quietly stopped meaning the same thing by any word, and nothing failed.
/// Holding the list here was the bug; fetching it is the fix.
///
/// Three questions rather than one picker, because the feed needs three different things and two
/// of them had no way in at all. What somebody cares about decides what is relevant; what they
/// can do decides what they are eligible for. Interests alone is how a person interested in AI
/// gets shown every AI job including the ones wanting fifteen years.
///
/// One thing deliberately *not* carried over: the student flow used to submit a fixed list of
/// problems — "I lack practical experience", "There's too much information", "I don't know which
/// skills to learn" — for every student, without ever asking. Personalisation built on answers
/// nobody gave is the thing this codebase has spent a week removing.

const PERSONA_FROM_ROUTE: Record<string, PersonaType> = {
  student: "Student",
  graduate: "Graduate",
  professional: "YoungProfessional",
};

export function Onboarding() {
  const navigate = useNavigate();
  const { persona: personaParam } = useParams();
  const { profile, refetchProfile, signIn } = useAuth();

  // Null rather than Student for a segment nobody routes to. The fallback used to be Student,
  // and finishing posts the persona - so a hand-typed /onboarding/anything stamped a category
  // choice nobody made, which is the thing the category question exists to prevent.
  const chosen = PERSONA_FROM_ROUTE[(personaParam ?? "").toLowerCase()] ?? null;
  const persona = chosen ?? "Student";

  // Derived every render, not seeded once.
  //
  // useState runs its initialiser a single time, and the profile is still in flight on a cold
  // load - so a signed-in user who refreshed or deep-linked this URL was shown "Create your
  // account", while the eyebrow above it already said YOUR ANSWERS because that line read the
  // profile which had since arrived. Re-entering their own email 400s on the duplicate;
  // entering a different one registers a second account and signIn replaces their live session
  // with it.
  const [registered, setRegistered] = useState(false);
  const step: "account" | "questions" = profile || registered ? "questions" : "account";

  // Back to the picker rather than on through a flow for a category that was never named.
  useEffect(() => {
    if (chosen === null) navigate("/onboarding", { replace: true });
  }, [chosen, navigate]);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Prefilled from the link they followed, if they followed one, and editable either way.
  const [referral, setReferral] = useState(() => rememberedCode() ?? "");
  const [answers, setAnswers] = useState<Record<string, string[]>>({});

  // Which questions this person actually interacted with, so an emptied answer is
  // distinguishable from one never given. Without it the two look identical on the way out.
  const [touched, setTouched] = useState<ReadonlySet<string>>(() => new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /// Fetched only once there is an account to fetch them for. The endpoint resolves the caller's
  /// profile, so asking before registration is a 404 — and the questions depend on the category,
  /// which is why the route's persona is sent rather than waiting for one to be stored.
  const questionsQuery = useQuery({
    queryKey: ["onboarding-questions", persona],
    queryFn: () => getOnboardingQuestions(persona),
    enabled: step === "questions",
  });

  const createAccount = async () => {
    setError(null);

    if (!name.trim() || !email.trim() || password.length < 8) {
      setError("A name, an email and a password of at least 8 characters.");
      return;
    }

    setBusy(true);
    try {
      // What is in the field, which is the remembered code unless they changed it. Sent through
      // readCode so a half-typed one is sent as nothing rather than as a code the server will
      // fail to match.
      const auth = await register(name.trim(), email.trim(), password, readCode(referral) ?? undefined);
      forgetCode();
      // signIn, not setToken: the latter only writes storage, so the auth context still reported
      // isAuthenticated false and HomeGate sent a freshly onboarded user to the marketing page.
      signIn(auth.token);
      setRegistered(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create the account.");
    } finally {
      setBusy(false);
    }
  };

  const finish = async () => {
    setError(null);
    setBusy(true);

    try {
      // Only the questions this person touched. An absent key leaves that answer alone on the
      // server; an empty array is a deliberate "none of these" and clears it.
      //
      // Filtering on non-empty instead - which is what this did - meant a cleared answer could
      // never be sent at all. The server was deliberately fixed so that tapping a wrong
      // qualification off would unset it, and this component implements the tap, and the result
      // stopped at the wire: the old rung stayed on the profile and kept being used as an
      // eligibility floor.
      await saveOnboardingAnswers({ persona, answers: touchedOnly(answers, touched) });

      await refetchProfile();
      navigate("/");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save your answers.");
      setBusy(false);
    }
  };

  const questions = questionsQuery.data?.questions ?? [];
  const ready = hasEnoughToSubmit(answers);

  return (
    <div className="r-page" style={{ maxWidth: 620 }}>
      <div style={{ marginBottom: 20 }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: ".07em",
            textTransform: "uppercase",
            color: "var(--text-faint)",
            marginBottom: 8,
          }}
        >
          {profile ? "YOUR ANSWERS" : step === "account" ? "STEP 1 OF 2" : "STEP 2 OF 2"}
        </div>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 800, margin: 0 }}>
          {step === "account" ? "Create your account" : "Three questions"}
        </h1>
        <p style={{ fontSize: 13.5, color: "var(--text-muted)", marginTop: 6, lineHeight: 1.5 }}>
          {step === "account"
            ? "Two short steps and you are in."
            : "Radar builds around these, and you can change them any time."}
        </p>
      </div>

      {error && (
        <div
          role="alert"
          style={{
            background: "rgba(220,38,38,.08)",
            border: "1px solid rgba(220,38,38,.25)",
            borderRadius: 10,
            padding: "10px 12px",
            fontSize: 13,
            marginBottom: 16,
          }}
        >
          {error}
        </div>
      )}

      {step === "account" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <input
            className="r-input"
            placeholder="Full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
          />
          <input
            className="r-input"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
          <PasswordField
            value={password}
            onChange={setPassword}
            placeholder="Password (at least 8 characters)"
            autoComplete="new-password"
          />

          {/* The code had nowhere to be typed. Attribution only worked if somebody opened the
              /join link in this same browser session, so anyone who received the bare code -
              "my code is ABC2345", which is how it gets shared in a group chat - could not use
              it, while a panel in Settings offered a prominent "Copy the code" button. Prefilled
              when a link was followed, and readable when it was not. */}
          <div>
            <input
              className="r-input"
              placeholder="Referral code (optional)"
              value={referral}
              onChange={(e) => setReferral(e.target.value)}
              aria-label="Referral code"
              autoComplete="off"
              spellCheck={false}
            />
            {referral.trim().length > 0 && !readCode(referral) && (
              // Said while they are still looking at the field. A bad code used to be dropped
              // in silence, so the person who shared it was credited with nothing and nobody
              // found out.
              <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 6 }}>
                That is not a code Radar issued. You can leave it blank and still sign up.
              </p>
            )}
          </div>

          <button className="btn btn--primary" onClick={createAccount} disabled={busy}>
            {busy ? "Creating…" : "Continue"}
          </button>
        </div>
      ) : (
        <>
          {questionsQuery.isLoading && (
            <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Loading the questions…</p>
          )}

          {/* Says what to do rather than apologising, and offers the way out. The account exists
              by this point, so the worst case is answering later from Settings rather than
              losing a sign-up. */}
          {questionsQuery.isError && (
            <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5 }}>
              <p>Radar could not load the questions just now.</p>
              <button className="btn" onClick={() => questionsQuery.refetch()} style={{ marginRight: 8 }}>
                Try again
              </button>
              <button className="btn" onClick={() => navigate("/")}>
                Skip for now
              </button>
            </div>
          )}

          {/* Succeeded and returned nothing. Without this the page is a heading and a subtitle
              with no button, no message and no nav bar - this route sits outside the main
              layout - and somebody who has just created an account is stranded on it. */}
          {!questionsQuery.isLoading && !questionsQuery.isError && questions.length === 0 && (
            <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5 }}>
              <p>There are no questions to answer right now.</p>
              <button className="btn" onClick={() => navigate("/")}>
                Continue to Radar
              </button>
            </div>
          )}

          {questions.length > 0 && (
            <>
              <OnboardingQuestions
                questions={questions}
                answers={answers}
                onChange={(next) => {
                  setTouched((before) => whatChanged(before, answers, next));
                  setAnswers(next);
                }}
              />

              <div
                style={{
                  position: "sticky",
                  bottom: 0,
                  background: "var(--bg)",
                  paddingTop: 12,
                  marginTop: 8,
                }}
              >
                <button
                  className="btn btn--primary"
                  style={{ width: "100%" }}
                  onClick={finish}
                  disabled={busy || !ready}
                >
                  {busy
                    ? "Setting up…"
                    : ready
                      ? "Continue"
                      : "Answer at least one to continue"}
                </button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
