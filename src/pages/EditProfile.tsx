import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../auth/AuthContext";
import { getSignals, removeSignalTerm, updateMe } from "../lib/api";
import { ALL_INTERESTS } from "../lib/interests";
import type { PersonaType, SignalsSummary } from "../lib/types";

const PERSONAS: [PersonaType, string][] = [
  ["Student", "Student"],
  ["Graduate", "Graduate"],
  ["YoungProfessional", "Young Professional"],
  ["Entrepreneur", "Entrepreneur"],
  ["Researcher", "Researcher"],
];

export function EditProfile() {
  const navigate = useNavigate();
  const { profile, refetchProfile } = useAuth();
  const [name, setName] = useState("");
  const [persona, setPersona] = useState<PersonaType>("Student");
  const [primaryGoal, setPrimaryGoal] = useState("");
  const [region, setRegion] = useState("");
  const [city, setCity] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
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
  }, [profile]);

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
      await updateMe({ name, persona, primaryGoal, region, city, interests });
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
