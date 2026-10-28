import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Icon } from "../components/Icon";
import { TagInput } from "../components/TagInput";
import { useAuth } from "../auth/AuthContext";
import { ApiError, personalise } from "../lib/api";
import {
  GOAL_SUGGESTIONS,
  INTEREST_SUGGESTIONS,
  OPPORTUNITY_SUGGESTIONS,
} from "../lib/personalisation";
import type { PersonaType } from "../lib/types";

/// Three boxes, one button.
///
/// Asked here rather than at signup. Before anyone has seen Radar a questionnaire is answered
/// carelessly or abandoned — which is why a six-step flow was deleted — but someone looking at a
/// feed that is not yet theirs already knows what the questions are for.
///
/// Interests and goals are required because the feed is ranked on them and without either there
/// is nothing to rank by. Opportunities are asked for and never required: someone who wants
/// nothing applied for should still get a feed.

const CATEGORIES: { value: PersonaType; label: string; description: string }[] = [
  { value: "Student", label: "Student", description: "Studying now" },
  { value: "Graduate", label: "Graduate", description: "Finished, looking" },
  { value: "YoungProfessional", label: "Professional", description: "Working" },
];

export function Personalise() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { profile, refetchProfile } = useAuth();

  const [interests, setInterests] = useState<string[]>(() => profile?.interests ?? []);
  const [goals, setGoals] = useState<string[]>(() => profile?.goals ?? []);
  const [opportunities, setOpportunities] = useState<string[]>(
    () => profile?.opportunityPreferences ?? [],
  );
  const [persona, setPersona] = useState<PersonaType | null>(() => profile?.persona ?? null);
  const [error, setError] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: () =>
      personalise({
        interests,
        goals,
        opportunityPreferences: opportunities,
        persona: persona ?? undefined,
      }),
    onSuccess: async () => {
      // Everything computed from the old profile is now wrong — but ["me"] is dropped last, not
      // first. queryClient.clear() removed it along with the rest, so the refetch below had no
      // query left to refetch and resolved instantly; the navigation then landed on a home screen
      // still holding the unpersonalised profile, which asked the three questions again. Which is
      // exactly what it looked like: answering them returned you to them.
      queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== "me" });

      await refetchProfile();
      navigate("/");
    },
    onError: (e) =>
      setError(e instanceof ApiError ? e.message : "Could not save that. Try again."),
  });

  const ready = interests.length > 0 && goals.length > 0 && persona !== null;

  return (
    <div className="r-page personalise">
      <div className="personalise__head">
        <div className="personalise__icon">
          <Icon name="radar" size={24} />
        </div>
        <h1 className="personalise__title">Let&rsquo;s personalise your Radar</h1>
        <p className="personalise__text">
          Three questions. Your feed is built from the answers, and you can change them any time in
          settings.
        </p>
      </div>

      <TagInput
        label="What are you interested in?"
        hint="The subjects and topics you want Radar to follow."
        placeholder="Search subjects, or type your own"
        pool={INTEREST_SUGGESTIONS}
        value={interests}
        onChange={setInterests}
      />

      <TagInput
        label="What are your goals?"
        hint="What you are trying to achieve. Several is normal."
        placeholder="e.g. find a job, get a scholarship"
        pool={GOAL_SUGGESTIONS}
        value={goals}
        onChange={setGoals}
      />

      <TagInput
        label="What opportunities are you looking for?"
        hint="Optional — what Radar should watch for on your behalf."
        placeholder="e.g. internships, grants, competitions"
        pool={OPPORTUNITY_SUGGESTIONS}
        value={opportunities}
        onChange={setOpportunities}
      />

      <div className="tagbox">
        <span className="tagbox__label">Which describes you?</span>
        <p className="tagbox__hint">It changes what Radar prioritises, not what it will show you.</p>

        <div className="personalise__categories">
          {CATEGORIES.map((category) => (
            <button
              key={category.value}
              className={`personalise__category ${persona === category.value ? "active" : ""}`}
              onClick={() => setPersona(category.value)}
              aria-pressed={persona === category.value}
            >
              <span className="personalise__category-label">{category.label}</span>
              <span className="personalise__category-desc">{category.description}</span>
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div role="alert" className="personalise__error">
          {error}
        </div>
      )}

      <div className="personalise__actions">
        <button
          className="btn btn--primary"
          onClick={() => save.mutate()}
          disabled={!ready || save.isPending}
        >
          {save.isPending ? "Building your Radar…" : "Personalise my Radar"}
        </button>

        {/* Says which answer is missing rather than leaving a dead button unexplained. */}
        {!ready && !save.isPending && (
          <span className="personalise__needs">
            {interests.length === 0
              ? "Add at least one interest"
              : goals.length === 0
                ? "Add at least one goal"
                : "Choose which describes you"}
          </span>
        )}
      </div>
    </div>
  );
}
