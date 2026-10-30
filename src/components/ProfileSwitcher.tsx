import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Icon } from "./Icon";
import { useAuth } from "../auth/AuthContext";
import { activateProfile, createProfile, getProfiles } from "../lib/api";
import type { PersonaType } from "../lib/types";

/// Switching between who you are on this account.
///
/// A student who graduates should not have to overwrite themselves. Each profile has its own
/// path, feed, saved items and history — that was already true of the data model, since
/// everything is keyed by the profile id.
///
/// Which is exactly why switching has to clear the client's cache rather than refetch it. This is
/// a change of context, not a filter: every cached query belongs to the profile that was active
/// when it was fetched, and leaving them in place would show a graduate their student feed until
/// each one happened to go stale.

const PERSONAS: { value: PersonaType; label: string; description: string }[] = [
  { value: "Student", label: "Student", description: "Studying now" },
  { value: "Graduate", label: "Graduate", description: "Finished, looking" },
  { value: "YoungProfessional", label: "Professional", description: "Working" },
];

export function ProfileSwitcher({ onDone }: { onDone: () => void }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { refetchProfile } = useAuth();

  const profilesQuery = useQuery({ queryKey: ["me", "profiles"], queryFn: getProfiles });
  const profiles = profilesQuery.data?.profiles ?? [];

  /// Everything cached belongs to the profile that was active when it was fetched.
  const reset = async () => {
    queryClient.clear();
    await refetchProfile();
  };

  const switchTo = useMutation({
    mutationFn: (profileId: string) => activateProfile(profileId),
    onSuccess: async () => {
      await reset();
      onDone();
      navigate("/");
    },
  });

  const addProfile = useMutation({
    mutationFn: (persona: PersonaType) => createProfile(persona),
    onSuccess: async () => {
      await reset();
      onDone();
      // A new profile knows nothing about this person yet, so it asks rather than inheriting the
      // previous one's answers.
      //
      // The same three questions every other account answers. This used to go to
      // /onboarding/:persona, which is the old screen: forty-odd subjects as buttons, picked
      // from a grid. That screen was replaced everywhere a learner normally meets it and left
      // standing here, so adding a second profile walked back into the thing it replaced.
      navigate("/personalise");
    },
  });

  const busy = switchTo.isPending || addProfile.isPending;
  const used = new Set(profiles.map((p) => p.persona));

  return (
    <div className="r-nav-panel profiles">
      <div className="profiles__label">Profiles</div>

      {profilesQuery.isLoading ? (
        <div className="profiles__note">Loading…</div>
      ) : (
        profiles.map((profile) => (
          <button
            key={profile.id}
            className={`r-nav-panel__item profiles__row ${profile.isActive ? "active" : ""}`}
            onClick={() => !profile.isActive && switchTo.mutate(profile.id)}
            disabled={busy}
          >
            <span className="profiles__text">
              <span className="profiles__name">{profile.label}</span>
              <span className="profiles__sub">
                {profile.onboardingComplete
                  ? profile.primaryGoal || profile.interests[0] || "No subject yet"
                  : "Not set up yet"}
              </span>
            </span>
            {profile.isActive && <Icon name="check" size={14} />}
          </button>
        ))
      )}

      {/* Only personas this account does not already have. A second Student profile would be two
          of the same thing with no way to tell them apart in this list. */}
      {PERSONAS.some((p) => !used.has(p.value)) && (
        <>
          <div className="r-nav-panel__divider" />
          <div className="profiles__label">Add a profile</div>

          {PERSONAS.filter((p) => !used.has(p.value)).map((persona) => (
            <button
              key={persona.value}
              className="r-nav-panel__item profiles__row"
              onClick={() => addProfile.mutate(persona.value)}
              disabled={busy}
            >
              <span className="profiles__text">
                <span className="profiles__name">{persona.label}</span>
                <span className="profiles__sub">{persona.description}</span>
              </span>
              <Icon name="add" size={13} />
            </button>
          ))}
        </>
      )}

      {(switchTo.isError || addProfile.isError) && (
        <div className="profiles__note" role="alert">
          That did not work. Try again.
        </div>
      )}
    </div>
  );
}
