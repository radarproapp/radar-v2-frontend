import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Icon } from "./Icon";
import { TagInput } from "./TagInput";
import { useAuth } from "../auth/AuthContext";
import { ApiError, personalise } from "../lib/api";
import {
  CHALLENGE_SUGGESTIONS,
  GOAL_SUGGESTIONS,
  INTEREST_SUGGESTIONS,
} from "../lib/personalisation";

/// Changing what Radar Intelligence follows, from the screen it follows it on.
///
/// It meant going to the profile page — a different section of the product, reached through the
/// account menu, to change the thing the feed in front of you is built from. Radar Learn puts
/// the same control on the path itself, and there is no reason the feed should be different: the
/// moment somebody wants to change what they follow is the moment they are looking at what they
/// are being shown.
///
/// The same three questions as everywhere else, so there is one answer to "where do I change my
/// interests" rather than two screens that both half do it.

export function InterestControls() {
  const { profile, refetchProfile } = useAuth();
  const queryClient = useQueryClient();

  const [open, setOpen] = useState(false);
  const [interests, setInterests] = useState<string[]>(() => profile?.interests ?? []);
  const [goals, setGoals] = useState<string[]>(() => profile?.goals ?? []);
  const [challenges, setChallenges] = useState<string[]>(() => profile?.problems ?? []);
  const [error, setError] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: () => personalise({ interests, goals, challenges }),
    onMutate: () => setError(null),
    onSuccess: async () => {
      await refetchProfile();

      // Everything built from what they follow. The feed is the obvious one; the brief names
      // today's focus from the same answers, and opportunities are matched against them.
      queryClient.invalidateQueries({ queryKey: ["feed"] });
      queryClient.invalidateQueries({ queryKey: ["home"] });
      queryClient.invalidateQueries({ queryKey: ["opportunities"] });

      setOpen(false);
    },
    onError: (e) =>
      setError(e instanceof ApiError ? e.message : "Could not save that. Try again shortly."),
  });

  /// Reopened with what is stored, not with what was last typed and abandoned.
  const toggle = () => {
    if (!open) {
      setInterests(profile?.interests ?? []);
      setGoals(profile?.goals ?? []);
      setChallenges(profile?.problems ?? []);
      setError(null);
    }

    setOpen((v) => !v);
  };

  const ready = interests.length > 0 && goals.length > 0;

  return (
    <div className="interest-controls">
      <button className="btn btn--text btn--sm" onClick={toggle} aria-expanded={open}>
        <Icon name={open ? "collapse" : "settings"} size={13} /> Change what Radar follows
      </button>

      {open && (
        <div className="interest-controls__panel">
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
            label="What is getting in your way?"
            hint="Optional — what is making your goals harder."
            placeholder="e.g. no experience yet, keep getting rejected"
            pool={CHALLENGE_SUGGESTIONS}
            value={challenges}
            onChange={setChallenges}
          />

          <div className="interest-controls__foot">
            <button
              className="btn btn--primary btn--sm"
              onClick={() => save.mutate()}
              disabled={save.isPending || !ready}
            >
              {save.isPending ? "Saving…" : "Save"}
            </button>

            <button className="btn btn--text btn--sm" onClick={() => setOpen(false)}>
              Cancel
            </button>

            {/* Said rather than left to be discovered by pressing a disabled button. */}
            {!ready && (
              <span className="interest-controls__note">
                Radar needs at least one interest and one goal to know what to show you.
              </span>
            )}
          </div>

          {error && (
            <div role="alert" className="interest-controls__error">
              {error}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
