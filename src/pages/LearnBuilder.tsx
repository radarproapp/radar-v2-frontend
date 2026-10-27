import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Icon } from "../components/Icon";
import { useAuth } from "../auth/AuthContext";
import { addPathSection, ApiError } from "../lib/api";
import { INTEREST_GROUPS } from "../lib/interests";

/// Three questions, one per screen, then one section on the path.
///
/// What this exists to stop: the path used to be generated from the profile the moment you
/// arrived. A Computer Science student opened Radar Learn and was shown four stages and a set of
/// lessons called "What Computer Science actually involves day to day" and "Core concepts and
/// vocabulary in Computer Science" — a whole curriculum inferred from their degree, which nobody
/// had asked them whether they wanted.
///
/// The degree says what they study. It does not say what they want to learn next, how much of it
/// they already know, or what they are trying to be able to do. Those are three different
/// questions and the only way to know the answers is to ask them.

type Level = "Beginner" | "Intermediate" | "Advanced";

const LEVELS: { value: Level; label: string; description: string }[] = [
  { value: "Beginner", label: "New to this", description: "Start from the vocabulary and the first tools." },
  { value: "Intermediate", label: "Some experience", description: "I know the basics and want to go deeper." },
  { value: "Advanced", label: "Confident", description: "Skip the foundations; I want depth and edge cases." },
];

const STEPS = ["subject", "level", "outcome"] as const;
type Step = (typeof STEPS)[number];

export function LearnBuilder() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  // ?subject= arrives from "Learn this" on a feed card: the learner has already answered the
  // first question by pressing it, so asking again would be asking them to retype what they
  // just chose. The two follow-ups still get asked, because they are what makes the path
  // correctly levelled rather than generic.
  const [params] = useSearchParams();
  const handed = params.get("subject")?.trim() ?? "";

  const [step, setStep] = useState<Step>(handed ? "level" : "subject");
  const [subject, setSubject] = useState(handed);
  const [level, setLevel] = useState<Level | null>(null);
  const [outcome, setOutcome] = useState("");
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  /// Offered, not assumed. These are the subjects they chose during onboarding, which makes them
  /// a reasonable shortcut — but every one still has to be picked, and the search is right there.
  const quickPicks = useMemo(() => (profile?.interests ?? []).slice(0, 6), [profile]);

  const matches = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (query.length < 2) return [];

    const seen = new Set<string>();
    const found: string[] = [];
    for (const [, subjects] of INTEREST_GROUPS) {
      for (const candidate of subjects) {
        if (candidate.toLowerCase().includes(query) && !seen.has(candidate)) {
          seen.add(candidate);
          found.push(candidate);
        }
      }
    }
    return found.slice(0, 24);
  }, [search]);

  const build = useMutation({
    mutationFn: () => addPathSection(subject, level ?? "Beginner", outcome.trim() || null),
    onSuccess: (roadmap) => {
      queryClient.setQueryData(["roadmap", "active"], roadmap);
      queryClient.invalidateQueries({ queryKey: ["roadmap", "active"] });
      navigate("/learn");
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : "Could not build that section."),
  });

  const chooseSubject = (value: string) => {
    setSubject(value);
    setStep("level");
  };

  const chooseLevel = (value: Level) => {
    setLevel(value);
    setStep("outcome");
  };

  const back = () => {
    setError(null);
    if (step === "level") setStep("subject");
    else if (step === "outcome") setStep("level");
    else navigate("/learn");
  };

  return (
    <div className="r-page build">
      <div className="build__bar">
        <button className="build__back" onClick={back} disabled={build.isPending}>
          <Icon name="menu" size={14} /> Back
        </button>
        {/* One box, then two follow-ups — not question 1 of 3.
            
            The guide asks for a single prominent box and then "a short follow-up question only
            when necessary". Level and outcome are necessary: they are why a 1,287-page Java
            textbook came back as five correctly-levelled sections instead of one generic one.
            But counting them as thirds of a form makes the first ask look like the start of
            paperwork, which is the thing a deleted six-step flow already taught us. */}
        <span className="build__count">
          {step === "subject"
            ? "Starts with one answer"
            : step === "level"
              ? "One quick follow-up"
              : "Last one"}
        </span>
      </div>

      {/* One question on screen at a time. The answers already given stay visible as small
          chips, so the learner can see what they are building without the next question being
          buried under it. */}
      {(subject || level) && (
        <div className="build__answers">
          {subject && (
            <button className="build__answer" onClick={() => setStep("subject")}>
              {subject}
            </button>
          )}
          {level && (
            <button className="build__answer" onClick={() => setStep("level")}>
              {LEVELS.find((l) => l.value === level)?.label}
            </button>
          )}
        </div>
      )}

      {step === "subject" && (
        <>
          {/* The guide's wording, including "or achieve". A learner who knows they want to pass
              an exam or get through a certification but could not name the subject behind it was
              being asked the wrong question — and the search box, which only matched a catalogue
              of subjects, read as though a subject were the only valid answer. Free text was
              always accepted; nothing said so until the second line. */}
          <h1 className="build__question">What do you want to learn or achieve?</h1>
          <p className="build__hint">
            A subject, a skill, or the thing you are working towards — your own words are fine.
            You can add more sections later.
          </p>

          <div className="build__search">
            <Icon name="search" size={16} />
            <input
              className="build__input"
              placeholder="e.g. Cybersecurity, or pass the CCNA"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="What you want to learn or achieve"
              autoFocus
            />
          </div>

          {search.trim().length >= 2 ? (
            matches.length > 0 ? (
              <div className="build__options">
                {matches.map((candidate) => (
                  <button key={candidate} className="build__option" onClick={() => chooseSubject(candidate)}>
                    {candidate}
                  </button>
                ))}
              </div>
            ) : (
              <p className="build__empty">
                Nothing matches &ldquo;{search.trim()}&rdquo;. You can use your own words instead.
              </p>
            )
          ) : (
            quickPicks.length > 0 && (
              <>
                <div className="build__label">From your interests</div>
                <div className="build__options">
                  {quickPicks.map((candidate) => (
                    <button key={candidate} className="build__option" onClick={() => chooseSubject(candidate)}>
                      {candidate}
                    </button>
                  ))}
                </div>
              </>
            )
          )}

          {/* The catalogue is 235 entries and still will not contain everything. A learner whose
              subject is missing should not be stuck choosing the nearest wrong thing. */}
          {search.trim().length >= 2 && (
            <button className="build__own" onClick={() => chooseSubject(search.trim())}>
              Use &ldquo;{search.trim()}&rdquo;
            </button>
          )}
        </>
      )}

      {step === "level" && (
        <>
          <h1 className="build__question">Where are you starting from?</h1>
          <p className="build__hint">With {subject}, specifically.</p>

          <div className="build__options build__options--stacked">
            {LEVELS.map((option) => (
              <button key={option.value} className="build__level" onClick={() => chooseLevel(option.value)}>
                <span className="build__level-label">{option.label}</span>
                <span className="build__level-desc">{option.description}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {step === "outcome" && (
        <>
          <h1 className="build__question">What do you want to be able to do?</h1>
          <p className="build__hint">
            In your own words. This is what the section gets built around — skip it and Radar builds
            for the subject and level alone.
          </p>

          <textarea
            className="build__textarea"
            rows={3}
            placeholder="e.g. read a packet capture and say what went wrong"
            value={outcome}
            onChange={(e) => setOutcome(e.target.value)}
            autoFocus
          />

          {error && (
            <div role="alert" className="build__error">
              {error}
            </div>
          )}

          <div className="build__actions">
            <button
              className="btn btn--primary"
              onClick={() => build.mutate()}
              disabled={build.isPending || outcome.trim().length === 0}
            >
              {build.isPending ? "Building the section…" : "Build this section"}
            </button>
            {!build.isPending && (
              <button
                className="btn btn--text"
                onClick={() => {
                  setOutcome("");
                  build.mutate();
                }}
              >
                Skip
              </button>
            )}
          </div>

          {!build.isPending && outcome.trim().length === 0 && (
            <p className="build__hint" style={{ marginTop: 12 }}>
              Write what you want to be able to do, or skip — the section is built either way.
            </p>
          )}

          {build.isPending && (
            <p className="build__hint" style={{ marginTop: 12 }}>
              Radar is writing the lessons for this section. This can take up to a minute.
            </p>
          )}
        </>
      )}
    </div>
  );
}
