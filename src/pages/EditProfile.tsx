import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { updateMe } from "../lib/api";
import { ALL_INTERESTS } from "../lib/interests";
import type { PersonaType } from "../lib/types";

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
