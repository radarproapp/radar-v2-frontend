import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getFollowUps, updateMe, type FollowUpSuggestion } from "../lib/api";
import { useAuth } from "../auth/AuthContext";
import { Icon } from "./Icon";

/// A single, human follow-up Radar offers when it has a reason — an inferred interest, a shift in
/// focus, or a profile gap. Applying it saves through the normal profile update; ignoring it is
/// remembered locally so it doesn't nag.
export function FollowUps() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { profile, refetchProfile } = useAuth();
  const query = useQuery({ queryKey: ["follow-ups"], queryFn: getFollowUps, staleTime: 60_000 });
  const [dismissed, setDismissed] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("radar_followup_dismissed") ?? "[]");
    } catch {
      return [];
    }
  });
  const [busy, setBusy] = useState<string | null>(null);

  const item = (query.data ?? []).find((s) => !dismissed.includes(s.id));
  if (!profile || !item) return null;

  const dismiss = (id: string) => {
    const next = [...dismissed, id];
    setDismissed(next);
    localStorage.setItem("radar_followup_dismissed", JSON.stringify(next));
  };

  const apply = async (suggestion: FollowUpSuggestion) => {
    if (suggestion.action === "editProfile") {
      navigate("/profile/edit");
      return;
    }
    if (suggestion.action === "explore") {
      navigate("/feed");
      return;
    }
    if (!suggestion.value) return;
    setBusy(suggestion.id);
    try {
      if (suggestion.action === "addInterest") {
        const interests = Array.from(new Set([...(profile.interests ?? []), suggestion.value]));
        await updateMe({ interests });
      } else if (suggestion.action === "setFocus") {
        await updateMe({ primaryGoal: suggestion.value, dominantInterests: [suggestion.value] });
      }
      await refetchProfile();
      queryClient.invalidateQueries({ queryKey: ["follow-ups"] });
      dismiss(suggestion.id);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="radar-noticed">
      <div className="radar-noticed__header">
        <div className="radar-noticed__label">RADAR NOTICED</div>
        <button
          className="radar-noticed__close"
          onClick={() => dismiss(item.id)}
          aria-label="Dismiss notice"
          title="Dismiss"
        ><Icon name="close" /></button>
      </div>

      <div className="radar-noticed__prompt">{item.prompt}</div>

      {item.items && item.items.length > 0 && (
        <div className="radar-noticed__chips">
          {item.items.map((term) => (
            <button
              key={term}
              type="button"
              className="radar-noticed__chip"
              onClick={() => navigate(`/feed?q=${encodeURIComponent(term)}`)}
              title={`View ${term} stories and updates`}
            >
              <span className="radar-noticed__chip-dot" />
              <span>{term}</span>
            </button>
          ))}
        </div>
      )}

      {item.detail && <div className="radar-noticed__detail">{item.detail}</div>}

      <div className="radar-noticed__actions">
        {item.action === "addInterest" && (
          <button className="btn btn--primary btn--sm" onClick={() => apply(item)} disabled={busy === item.id}>
            {busy === item.id ? "Saving…" : item.actionLabel}
          </button>
        )}
        <button className="btn btn--primary btn--sm" onClick={() => navigate("/feed")}>
          Explore in Feed
        </button>
        {/* Named for what it does. "Tune focus" is Radar's word for it, not a reader's — it
            was read as some kind of signal-strength control, and what it actually opens is the
            screen where you change the subjects you follow. Plain language, per the core rule. */}
        <button className="btn btn--text btn--sm" onClick={() => navigate("/profile/edit")}>
          Edit your interests
        </button>
        <button className="btn btn--text btn--sm" onClick={() => dismiss(item.id)}>
          Got it
        </button>
      </div>
    </div>
  );
}
