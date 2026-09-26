import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { getFocus, updateMe } from "../lib/api";
import { ALL_INTERESTS } from "../lib/interests";
import type { PersonaType, UserInterestContext } from "../lib/types";

const PERSONAS: [PersonaType, string][] = [
  ["Student", "Student"],
  ["Graduate", "Graduate"],
  ["YoungProfessional", "Young Professional"],
  ["Entrepreneur", "Entrepreneur"],
  ["Researcher", "Researcher"],
];
const LEVELS = ["Beginner", "Intermediate", "Advanced"] as const;

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
  const [suggestedInterests, setSuggestedInterests] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

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
  }, [profile]);

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
      await updateMe({ name, persona, primaryGoal, region, city, interests, interestContexts, dominantInterests });
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
