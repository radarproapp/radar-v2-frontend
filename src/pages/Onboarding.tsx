import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Icon } from "../components/Icon";
import { PasswordField } from "../components/PasswordField";
import { useAuth } from "../auth/AuthContext";
import { completeOnboarding, register } from "../lib/api";
import { INTEREST_GROUPS } from "../lib/interests";
import type { PersonaType } from "../lib/types";

/// Two screens, then the app.
///
/// This replaces three separate flows totalling 2,116 lines and four to five steps each. They
/// asked for a university, the hardest courses, target roles, study schedules and what was making
/// things difficult — all before the user had seen a single thing Radar does. The worst moment to
/// ask is before anyone knows why it helps: people answer carelessly, or leave.
///
/// What is asked now: who you are, and what you are studying or working in. Everything else is
/// either derivable from that, learnable from behaviour, or better asked in context later — "to
/// match opportunities, what role are you aiming for?" lands properly on the Opportunities page,
/// once matches are on screen and the reason is obvious.
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

/// Which card groups each persona picks from.
///
/// Students choose a course of study; everyone else chooses a field of work. Same catalogue,
/// different slice of it — 235 entries already defined in lib/interests.ts.
function groupsFor(persona: PersonaType): [string, string[]][] {
  const academic = INTEREST_GROUPS.filter(([name]) => name.startsWith("Academic Programs"));
  const professional = INTEREST_GROUPS.filter(([name]) => !name.startsWith("Academic Programs"));

  return persona === "Student" ? academic : professional;
}

const MAX_SUBJECTS = 3;

export function Onboarding() {
  const navigate = useNavigate();
  const { persona: personaParam } = useParams();
  const { profile, refetchProfile, signIn } = useAuth();

  const persona = PERSONA_FROM_ROUTE[(personaParam ?? "").toLowerCase()] ?? "Student";
  const isStudent = persona === "Student";

  // An existing user reaching this from "Update these answers" in Settings already has an
  // account; sending them back through account creation would be absurd and would fail on the
  // duplicate email.
  const [step, setStep] = useState<"account" | "subjects">(profile ? "subjects" : "account");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [search, setSearch] = useState("");
  const [picked, setPicked] = useState<string[]>(() => (profile?.interests ?? []).slice(0, MAX_SUBJECTS));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const groups = useMemo(() => groupsFor(persona), [persona]);

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return groups;

    return groups
      .map(([group, items]) => [group, items.filter((i) => i.toLowerCase().includes(query))] as [string, string[]])
      .filter(([, items]) => items.length > 0);
  }, [groups, search]);

  const toggle = (subject: string) =>
    setPicked((current) =>
      current.includes(subject)
        ? current.filter((s) => s !== subject)
        : current.length >= MAX_SUBJECTS
          ? current
          : [...current, subject],
    );

  const createAccount = async () => {
    setError(null);

    if (!name.trim() || !email.trim() || password.length < 8) {
      setError("A name, an email and a password of at least 8 characters.");
      return;
    }

    setBusy(true);
    try {
      const auth = await register(name.trim(), email.trim(), password);
      // signIn, not setToken: the latter only writes storage, so the auth context still reported
      // isAuthenticated false and HomeGate sent a freshly onboarded user to the marketing page.
      signIn(auth.token);
      setStep("subjects");
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
      await completeOnboarding({
        persona,
        // The goal comes from what they chose rather than from a separate question. It is
        // visible and correctable in Settings, which is a better place to refine it than a
        // text box shown before anyone has seen the product.
        primaryGoal: picked[0] ?? "",
        interests: picked,
        dominantInterests: picked.slice(0, 2),
      });

      await refetchProfile();
      navigate("/");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save your choices.");
      setBusy(false);
    }
  };

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
          {profile ? "YOUR SUBJECTS" : step === "account" ? "STEP 1 OF 2" : "STEP 2 OF 2"}
        </div>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 800, margin: 0 }}>
          {step === "account"
            ? "Create your account"
            : isStudent
              ? "What are you studying?"
              : "What do you work in?"}
        </h1>
        <p style={{ fontSize: 13.5, color: "var(--text-muted)", marginTop: 6, lineHeight: 1.5 }}>
          {step === "account"
            ? "Two short steps and you are in."
            : `Pick up to ${MAX_SUBJECTS}. Radar builds around these, and you can change them any time.`}
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
          <button className="btn btn--primary" onClick={createAccount} disabled={busy}>
            {busy ? "Creating…" : "Continue"}
          </button>
        </div>
      ) : (
        <>
          <div style={{ position: "relative", marginBottom: 14 }}>
            <input
              className="r-input"
              placeholder={isStudent ? "Search courses" : "Search fields"}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label={isStudent ? "Search courses" : "Search fields"}
            />
          </div>

          {visible.length === 0 ? (
            // Says what to do rather than apologising. Nothing is broken; the search just missed.
            <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5 }}>
              Nothing matches “{search.trim()}”. Try a shorter word, or clear the search to browse.
            </p>
          ) : (
            visible.map(([group, items]) => (
              <div key={group} style={{ marginBottom: 18 }}>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: ".06em",
                    textTransform: "uppercase",
                    color: "var(--text-faint)",
                    marginBottom: 8,
                  }}
                >
                  {group.replace("Academic Programs · ", "")}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                  {items.map((subject) => {
                    const on = picked.includes(subject);
                    const full = !on && picked.length >= MAX_SUBJECTS;

                    return (
                      <button
                        key={subject}
                        className={`r-interest-pill ${on ? "active" : ""}`}
                        onClick={() => toggle(subject)}
                        disabled={full}
                        aria-pressed={on}
                        title={full ? `Pick at most ${MAX_SUBJECTS}` : undefined}
                      >
                        {on && <Icon name="check" size={12} />} {subject}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}

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
              disabled={busy || picked.length === 0}
            >
              {busy
                ? "Setting up…"
                : picked.length === 0
                  ? "Pick at least one to continue"
                  : `Continue with ${picked.length}`}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
