import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Icon } from "./Icon";
import { TagInput } from "./TagInput";
import { useAuth } from "../auth/AuthContext";
import { ApiError, personalise } from "../lib/api";
import {
  CATEGORIES,
  CHALLENGE_SUGGESTIONS,
  GOAL_SUGGESTIONS,
  INTEREST_SUGGESTIONS,
} from "../lib/personalisation";
import type { PersonaType } from "../lib/types";

interface InterestControlsProps {
  /// Opened from outside, for the empty feed's own "edit what you follow" button. Left alone,
  /// the panel owns its own state.
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

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

export function InterestControls({ open: openedFromOutside, onOpenChange }: InterestControlsProps = {}) {
  const { profile, refetchProfile } = useAuth();
  const queryClient = useQueryClient();

  const [openedHere, setOpenedHere] = useState(false);
  const open = openedFromOutside ?? openedHere;
  const setOpen = (next: boolean) => {
    setOpenedHere(next);
    onOpenChange?.(next);
  };

  const [interests, setInterests] = useState<string[]>(() => profile?.interests ?? []);
  const [goals, setGoals] = useState<string[]>(() => profile?.goals ?? []);
  const [challenges, setChallenges] = useState<string[]>(() => profile?.problems ?? []);
  const [persona, setPersona] = useState<PersonaType | null>(
    () => (profile?.hasChosenCategory ? profile.persona : null),
  );
  const [error, setError] = useState<string | null>(null);

  // The category is asked for only while Radar has no record of one being chosen. Somebody who
  // has already answered is not asked again every time they widen their interests - they change
  // it from their profile, which is where changing who you are belongs.
  const askForCategory = profile?.hasChosenCategory !== true;

  const save = useMutation({
    mutationFn: () =>
      personalise({
        interests,
        goals,
        challenges,
        persona: askForCategory ? (persona ?? undefined) : undefined,
      }),
    onMutate: () => setError(null),
    onSuccess: async () => {
      await refetchProfile();

      // Everything built from what they follow. The feed is the obvious one; the brief names
      // today's focus from the same answers, the weekly brief is the same brief over seven days,
      // and opportunities - the list and any one of them open in the drawer - are matched
      // against them. A stale "why this fits you" is the one that is hardest to spot.
      for (const key of [["feed"], ["home"], ["opportunities"], ["opportunity"], ["weekly-brief"]]) {
        queryClient.invalidateQueries({ queryKey: key });
      }

      setOpen(false);
    },
    onError: (e) =>
      setError(e instanceof ApiError ? e.message : "Could not save that. Try again shortly."),
  });

  /// Opened with what is stored, not with what was last typed and abandoned.
  ///
  /// Driven by the panel opening rather than by the button being pressed. It lived in the toggle
  /// handler, which the empty feed's own "edit what you follow" does not go through - so that
  /// route reopened the panel still holding an abandoned edit, presented as what Radar has. Two
  /// interests deleted and cancelled would come back deleted, and saving from there replaces the
  /// whole list.
  useEffect(() => {
    if (!open) return;

    setInterests(profile?.interests ?? []);
    setGoals(profile?.goals ?? []);
    setChallenges(profile?.problems ?? []);
    setPersona(profile?.hasChosenCategory ? profile.persona : null);
    setError(null);
    // Only when the panel opens. Re-running on every profile change would overwrite what the
    // reader is in the middle of typing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const toggle = () => setOpen(!open);

  const ready = interests.length > 0 && goals.length > 0 && (!askForCategory || persona !== null);

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
            disabled={save.isPending}
          />

          <TagInput
            label="What are your goals?"
            hint="What you are trying to achieve. Several is normal."
            placeholder="e.g. find a job, get a scholarship"
            pool={GOAL_SUGGESTIONS}
            value={goals}
            onChange={setGoals}
            disabled={save.isPending}
          />

          <TagInput
            label="What is getting in your way?"
            hint="Optional — what is making your goals harder."
            placeholder="e.g. no experience yet, keep getting rejected"
            pool={CHALLENGE_SUGGESTIONS}
            value={challenges}
            onChange={setChallenges}
            disabled={save.isPending}
          />

          {/* Asked once, and only while Radar has no record of an answer. Persona is an enum
              whose default is a real value, so every account began as a Student without being
              asked - and the feed then named that stage back as the reason for its ranking. */}
          {askForCategory && (
            <div className="tagbox">
              <span className="tagbox__label">Which describes you?</span>
              <p className="tagbox__hint">
                It changes what Radar prioritises first, not what it will show you.
              </p>

              <div className="personalise__categories">
                {CATEGORIES.map((category) => (
                  <button
                    key={category.value}
                    className={`personalise__category ${persona === category.value ? "active" : ""}`}
                    onClick={() => setPersona(category.value)}
                    aria-pressed={persona === category.value}
                    disabled={save.isPending}
                  >
                    <span className="personalise__category-label">{category.label}</span>
                    <span className="personalise__category-desc">{category.description}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

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
                {askForCategory
                  ? "Radar needs an interest, a goal, and which of the three describes you."
                  : "Radar needs at least one interest and one goal to know what to show you."}
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
