import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../auth/AuthContext";
import { getFocus, getSignals, removeSignalTerm, updateMe } from "../lib/api";
import { ALL_INTERESTS } from "../lib/interests";
import type { PersonaType, SignalsSummary, UserInterestContext } from "../lib/types";

const PERSONAS: [PersonaType, string][] = [
  ["Student", "Student"],
  ["Graduate", "Graduate"],
  ["YoungProfessional", "Young Professional"],
];
const LEVELS = ["Beginner", "Intermediate", "Advanced"] as const;

const labelStyle = { fontSize: 12.5, fontWeight: 600, color: "var(--text-dim)", display: "block", marginBottom: 6 } as const;

export function EditProfile() {
  const navigate = useNavigate();
  const { profile, refetchProfile } = useAuth();
  const [name, setName] = useState("");
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

  const toggleInterest = (interest: string) => {
    setInterests((prev) => {
      if (prev.includes(interest)) return prev.filter((i) => i !== interest);
      if (prev.length >= 8) return prev;
      return [...prev, interest];
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateMe({
        name, persona, primaryGoal, region, city, interests, interestContexts, dominantInterests,
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

      <div style={{ marginBottom: 18 }}>
        <label style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-dim)", display: "block", marginBottom: 6 }}>Persona</label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {PERSONAS.map(([value, label]) => (
            <button key={value} className={`r-chip ${persona === value ? "active" : ""}`} onClick={() => setPersona(value)}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 18 }}>
        <label style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-dim)", display: "block", marginBottom: 6 }}>Primary Goal</label>
        <input type="text" className="r-input" value={primaryGoal} onChange={(e) => setPrimaryGoal(e.target.value)} />
      </div>

      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".07em", textTransform: "uppercase", color: "var(--text-faint)", marginBottom: 10 }}>YOUR SITUATION</div>
        <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 14, padding: "16px 18px", display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={labelStyle}>What's making this difficult?</label>
            <input className="r-input" placeholder="e.g. no practical experience, information overload" value={problems} onChange={(e) => setProblems(e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>What are you trying to do right now?</label>
            <input className="r-input" placeholder="e.g. find a finance internship" value={currentIntent} onChange={(e) => setCurrentIntent(e.target.value)} />
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <div style={{ flex: "1 1 180px" }}>
              <label style={labelStyle}>Target role</label>
              <input className="r-input" placeholder="e.g. Financial Analyst" value={targetRole} onChange={(e) => setTargetRole(e.target.value)} />
            </div>
            <div style={{ flex: "1 1 180px" }}>
              <label style={labelStyle}>Target industry</label>
              <input className="r-input" placeholder="e.g. Financial Services" value={targetIndustry} onChange={(e) => setTargetIndustry(e.target.value)} />
            </div>
          </div>
          <div>
            <label style={labelStyle}>What do you want to become better at?</label>
            <input className="r-input" placeholder="e.g. financial analysis, data analysis (comma-separated)" value={capabilities} onChange={(e) => setCapabilities(e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Opportunities to prioritise</label>
            <input className="r-input" placeholder="e.g. Internship, Scholarship, Fellowship" value={opportunityPreferences} onChange={(e) => setOpportunityPreferences(e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Where are you open to opportunities?</label>
            <input className="r-input" placeholder="e.g. Nigeria, Ghana, remote" value={geography} onChange={(e) => setGeography(e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Decisions you want Radar's help with</label>
            <input className="r-input" placeholder="e.g. career, investment, market entry" value={decisionNeeds} onChange={(e) => setDecisionNeeds(e.target.value)} />
          </div>
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

      <div style={{ marginBottom: 22 }}>
        <label style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-dim)", display: "block", marginBottom: 8 }}>Interests ({interests.length} selected)</label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
          {ALL_INTERESTS.map((interest) => (
            <button key={interest} className={`r-interest-pill ${interests.includes(interest) ? "active" : ""}`} onClick={() => toggleInterest(interest)}>
              {interest}
            </button>
          ))}
        </div>
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
