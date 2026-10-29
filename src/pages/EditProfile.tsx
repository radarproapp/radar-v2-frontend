import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../auth/AuthContext";
import { getFocus, getSignals, removeSignalTerm, updateMe } from "../lib/api";
import { ALL_INTERESTS } from "../lib/interests";
import { TagInput } from "../components/TagInput";
import type { PersonaType, SignalsSummary, UserInterestContext } from "../lib/types";

const PERSONAS: [PersonaType, string][] = [
  ["Student", "Student"],
  ["Graduate", "Graduate"],
  ["YoungProfessional", "Young Professional"],
];
const LEVELS = ["Beginner", "Intermediate", "Advanced"] as const;


/// Which onboarding flow each persona belongs to.
const ONBOARDING_ROUTES: Partial<Record<PersonaType, string>> = {
  Student: "/onboarding/student",
  Graduate: "/onboarding/graduate",
  YoungProfessional: "/onboarding/professional",
};

export function EditProfile() {
  const navigate = useNavigate();
  const { profile, refetchProfile } = useAuth();
  const [name, setName] = useState("");
  // Display only: switching is done from the profiles page, not by editing this one.
  const [persona, setPersona] = useState<PersonaType>("Student");
  const [primaryGoal, setPrimaryGoal] = useState("");
  const [region, setRegion] = useState("");
  const [city, setCity] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [interestContexts, setInterestContexts] = useState<UserInterestContext[]>([]);
  const [dominantInterests, setDominantInterests] = useState<string[]>([]);
  const [problems, setProblems] = useState("");
  const [currentIntent, setCurrentIntent] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [targetIndustry, setTargetIndustry] = useState("");
  const [capabilities, setCapabilities] = useState("");
  const [opportunityPreferences, setOpportunityPreferences] = useState("");
  const [geography, setGeography] = useState("");
  const [decisionNeeds, setDecisionNeeds] = useState("");
  const [suggestedInterests, setSuggestedInterests] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();
  const signalsQuery = useQuery({ queryKey: ["signals"], queryFn: getSignals });
  const signals = signalsQuery.data;
  const [pendingTerm, setPendingTerm] = useState<string | null>(null);

  // Independent of the profile form: suppressing a signal takes effect immediately server-side,
  // so it must not wait for (or be undone by) "Save changes".
  const handleRemoveSignal = async (term: string) => {
    setPendingTerm(term);
    try {
      await removeSignalTerm(term);
      queryClient.setQueryData<SignalsSummary>(["signals"], (old) =>
        old ? { ...old, signals: old.signals.filter((s) => s.term !== term) } : old,
      );
    } catch {
      // leave the list as-is; the next load reflects whatever the server actually holds
    } finally {
      setPendingTerm(null);
    }
  };

  useEffect(() => {
    if (!profile) return;
    setName(profile.name);
    setPersona(profile.persona);
    setPrimaryGoal(profile.primaryGoal);
    setRegion(profile.region);
    setCity(profile.city);
    setInterests(profile.interests);
    setInterestContexts(profile.interestContexts ?? []);
    setDominantInterests(profile.dominantInterests ?? []);
    setProblems((profile.problems ?? []).join(", "));
    setCurrentIntent(profile.currentIntent ?? "");
    setTargetRole(profile.targetRole ?? "");
    setTargetIndustry(profile.targetIndustry ?? "");
    setCapabilities((profile.capabilities ?? []).join(", "));
    setOpportunityPreferences((profile.opportunityPreferences ?? []).join(", "));
    setGeography((profile.geography ?? []).join(", "));
    setDecisionNeeds((profile.decisionNeeds ?? []).join(", "));
  }, [profile]);

  const splitList = (value: string) =>
    value.split(",").map((v) => v.trim()).filter(Boolean);

  useEffect(() => {
    getFocus().then((focus) => setSuggestedInterests(focus.suggestedDominantInterests)).catch(() => undefined);
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateMe({
        // persona is deliberately absent. The server treats a persona in this payload as a
        // switch, clears the persona answers and reopens onboarding — which is how editing an
        // unrelated field could wipe the profile it was editing.
        name, primaryGoal, region, city, interests, interestContexts, dominantInterests,
        problems: splitList(problems),
        currentIntent,
        targetRole,
        targetIndustry,
        capabilities: splitList(capabilities),
        opportunityPreferences: splitList(opportunityPreferences),
        geography: splitList(geography),
        decisionNeeds: splitList(decisionNeeds),
      });
      await refetchProfile();

      // Switching persona changes which questions Radar should have asked, so send the user
      // through that persona's onboarding rather than back to a home screen built from answers
      // that belonged to someone else. The server has already reopened onboarding.
      navigate("/");
    } finally {
      setSaving(false);
    }
  };

  if (!profile) {
    return (
      <div className="r-page" style={{ maxWidth: 600 }}>
        <div className="r-empty">
          <div className="r-spinner" />
        </div>
      </div>
    );
  }

  return (
    <div className="r-page" style={{ maxWidth: 600 }}>
      <div className="r-page-head">
        <h1 className="r-page-title">Edit Profile</h1>
        <p className="r-page-sub">Update your intelligence profile. Changes affect your feed, recommendations and opportunities.</p>
      </div>

      <div style={{ marginBottom: 18 }}>
        <label style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-dim)", display: "block", marginBottom: 6 }}>Name</label>
        <input type="text" className="r-input" value={name} onChange={(e) => setName(e.target.value)} />
      </div>

      <div style={{ marginBottom: 18 }}>
        <label style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-dim)", display: "block", marginBottom: 6 }}>Email</label>
        <input type="email" className="r-input" value={profile.email} disabled title="Email can't be changed here" style={{ opacity: 0.6, cursor: "not-allowed" }} />
      </div>

      {/* Persona is shown, not edited here.
          
          This used to be a row of chips that changed the persona on *this* profile. The server
          then cleared the persona answers and reopened onboarding — so a student who tried
          Graduate had overwritten their student profile, and there was nothing left to switch
          back to. Which is exactly what it felt like: once you were a graduate, you could not go
          back.
          
          Each persona is its own profile, with its own path, feed and history. Switching is a
          change of which one is active, not an edit to the one you are in. */}
      <div style={{ marginBottom: 18 }}>
        <label style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-dim)", display: "block", marginBottom: 6 }}>Persona</label>

        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span className="r-chip active">{PERSONAS.find(([p]) => p === persona)?.[1] ?? persona}</span>
          <button className="btn btn--text btn--sm" onClick={() => navigate("/profiles")}>
            Switch or add a profile
          </button>
        </div>

        <p style={{ fontSize: 11.5, color: "var(--text-muted)", margin: "8px 0 0", lineHeight: 1.5 }}>
          Each persona is a separate profile with its own path and history. Changing it here used
          to overwrite this one — switching keeps both.
        </p>
      </div>

      <div style={{ marginBottom: 18 }}>
        <label style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-dim)", display: "block", marginBottom: 6 }}>Primary Goal</label>
        <input type="text" className="r-input" value={primaryGoal} onChange={(e) => setPrimaryGoal(e.target.value)} />
      </div>

      {/* 10.2: this was seven free-text boxes asking the same questions the persona flows ask -
          "What's making this difficult?", "Target role", "What do you want to become better at?" -
          but without the guidance, the examples or the ordering that makes them answerable. Two
          places to edit the same answers also means two places for them to disagree.

          The answers are shown rather than hidden, for the same reason they are shown in
          Settings: someone has to be able to see what Radar is working from. Changing them goes
          through the flow built for their persona. */}
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".07em", textTransform: "uppercase", color: "var(--text-faint)", marginBottom: 10 }}>
          YOUR SITUATION
        </div>
        <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 14, padding: "16px 18px" }}>
          <StatedAnswer label="What is making this difficult" value={problems} />
          <StatedAnswer label="What you are doing right now" value={currentIntent} />
          <StatedAnswer label="Role you want" value={targetRole} />
          <StatedAnswer label="Industry you want" value={targetIndustry} />
          <StatedAnswer label="What you want to get better at" value={capabilities} />
          <StatedAnswer label="Opportunities to prioritise" value={opportunityPreferences} />
          <StatedAnswer label="Where you are open to work" value={geography} />
          <StatedAnswer label="Decisions you want help with" value={decisionNeeds} />

          <button
            className="btn btn--sm"
            style={{ marginTop: 12 }}
            onClick={() => navigate(ONBOARDING_ROUTES[persona] ?? "/onboarding")}
          >
            Update these answers
          </button>
          <p style={{ fontSize: 11.5, color: "var(--text-muted)", margin: "8px 0 0", lineHeight: 1.5 }}>
            These come from your {PERSONAS.find(([p]) => p === persona)?.[1] ?? "onboarding"} questions, which ask
            them in the order that makes them easiest to answer.
          </p>
        </div>
      </div>

      <div style={{ marginBottom: 18 }}>
        <label style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-dim)", display: "block", marginBottom: 6 }}>Region</label>
        <input type="text" className="r-input" value={region} onChange={(e) => setRegion(e.target.value)} />
      </div>

      <div style={{ marginBottom: 18 }}>
        <label style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-dim)", display: "block", marginBottom: 6 }}>City</label>
        <input type="text" className="r-input" value={city} onChange={(e) => setCity(e.target.value)} />
      </div>

      {/* The same box the three-box personalisation uses, not a second way of doing it.
          This screen listed all 249 interests as chips and asked the reader to find theirs in it.
          Section 3 asks for the opposite — suggestions as you type, your own wording allowed —
          and a wall of fixed options is the thing it names: "Do not force users to choose from
          fixed options when their own wording is more appropriate."
          Reusing TagInput also means the two screens cannot drift into disagreeing about what
          choosing an interest looks like. */}
      <div style={{ marginBottom: 22 }}>
        <TagInput
          label="What are you interested in?"
          hint="The subjects you want Radar to follow. Type to search, or add your own."
          placeholder="Search subjects, or type your own"
          pool={ALL_INTERESTS}
          value={interests}
          onChange={setInterests}
        />
      </div>

      <div style={{ marginBottom: 22 }}>
        <label style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-dim)", display: "block", marginBottom: 8 }}>
          What Radar has learned about you
        </label>

        {signalsQuery.isLoading ? (
          <div className="r-empty">
            <div className="r-spinner" />
          </div>
        ) : signals ? (
          <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 14, padding: "16px 18px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, color: "var(--text-muted)", marginBottom: 4 }}>
              <span>How well Radar knows you</span>
              <span>{Math.round(signals.profileConfidence * 100)}%</span>
            </div>
            <div style={{ height: 5, background: "var(--bg-hover)", borderRadius: 99, overflow: "hidden", marginBottom: 14 }}>
              <div
                style={{
                  height: "100%",
                  width: `${Math.round(signals.profileConfidence * 100)}%`,
                  background: "var(--cyan)",
                  borderRadius: 99,
                  transition: "width .4s var(--ease)",
                }}
              />
            </div>

            {signals.signals.length === 0 ? (
              <div style={{ fontSize: 12.5, color: "var(--text-dim)" }}>
                Nothing yet — reading, saving and dismissing items builds this up.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {signals.signals.map((signal) => (
                  <div key={`${signal.term}-${signal.source}`} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 13, fontWeight: 600 }}>{signal.term}</span>
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            letterSpacing: ".04em",
                            textTransform: "uppercase",
                            color: signal.source === "Declared" ? "var(--cyan-deep)" : "var(--text-faint)",
                            background: signal.source === "Declared" ? "var(--cyan-light)" : "#f0f2f4",
                            borderRadius: 99,
                            padding: "2px 7px",
                          }}
                        >
                          {signal.source === "Declared" ? "You said" : "From behaviour"}
                        </span>
                      </div>
                      <div style={{ height: 4, background: "var(--bg-hover)", borderRadius: 99, overflow: "hidden", marginTop: 5 }}>
                        <div
                          style={{
                            height: "100%",
                            width: `${Math.round(Math.max(0, Math.min(1, signal.decayedStrength)) * 100)}%`,
                            background: "var(--cyan)",
                            borderRadius: 99,
                          }}
                        />
                      </div>
                    </div>
                    <button
                      className="r-chip"
                      onClick={() => handleRemoveSignal(signal.term)}
                      disabled={pendingTerm === signal.term}
                      title="Stop showing this topic to me"
                    >
                      {pendingTerm === signal.term ? "…" : "Not for me"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div style={{ fontSize: 12.5, color: "var(--text-dim)" }}>Could not load your signals right now.</div>
        )}
      </div>
      {interests.length > 0 && <div style={{ marginBottom: 22 }}>
        <label style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-dim)", display: "block", marginBottom: 8 }}>Interest context</label>
        {interests.map((interest) => {
          const context = interestContexts.find((item) => item.interest === interest) ?? { interest, goal: primaryGoal, level: "Beginner" as const, lens: "" };
          return <div key={interest} style={{ padding: "10px 0", borderTop: "1px solid var(--line)" }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 7 }}>{interest}</div>
            <div style={{ display: "flex", gap: 6, marginBottom: 7 }}>{LEVELS.map((level) => <button key={level} className={`r-chip ${context.level === level ? "active" : ""}`} onClick={() => setInterestContexts((prev) => [...prev.filter((item) => item.interest !== interest), { ...context, level }])}>{level}</button>)}</div>
            <input className="r-input" placeholder="Your focus for this interest (optional)" value={context.lens} onChange={(e) => setInterestContexts((prev) => [...prev.filter((item) => item.interest !== interest), { ...context, lens: e.target.value }])} />
          </div>;
        })}
      </div>}

      {interests.length > 1 && <div style={{ marginBottom: 22 }}>
        <label style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-dim)", display: "block", marginBottom: 8 }}>Primary focus (up to 2)</label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>{interests.map((interest) => <button key={interest} className={`r-interest-pill ${dominantInterests.includes(interest) ? "active" : ""}`} onClick={() => setDominantInterests((prev) => prev.includes(interest) ? prev.filter((item) => item !== interest) : prev.length < 2 ? [...prev, interest] : prev)}>{interest}</button>)}</div>
        <div style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 7 }}>Radar keeps every interest, but prioritizes these paths across intelligence, learning and opportunities.</div>
        {suggestedInterests.length > 0 && <div style={{ marginTop: 12, padding: "11px 12px", borderRadius: 10, background: "var(--surface-raised)", fontSize: 12.5 }}>Your recent activity suggests <strong>{suggestedInterests.join(" + ")}</strong> may deserve more focus. <button style={{ border: 0, background: "none", color: "var(--accent)", fontWeight: 700, cursor: "pointer", padding: 0 }} onClick={() => setDominantInterests(suggestedInterests.slice(0, 2))}>Make primary</button></div>}
      </div>}

      <div style={{ display: "flex", gap: 10 }}>
        <button className="btn" onClick={() => navigate("/")}>
          Cancel
        </button>
        <button className="btn btn--primary" style={{ flex: 1 }} onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>
    </div>
  );
}


/// One answer the user gave during onboarding.
///
/// Renders an honest blank rather than hiding the row when there is nothing: an empty answer is
/// usually what explains thin personalisation, so hiding it hides the cause.
function StatedAnswer({ label, value }: { label: string; value: string }) {
  return (
    <p style={{ fontSize: 13, margin: "0 0 8px", lineHeight: 1.5 }}>
      <span style={{ color: "var(--text-muted)" }}>{label}:</span>{" "}
      {value.trim() ? (
        <strong>{value}</strong>
      ) : (
        <em style={{ color: "var(--text-muted)" }}>not answered yet</em>
      )}
    </p>
  );
}
