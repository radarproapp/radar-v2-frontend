import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { ApiError, completeOnboarding, register } from "../lib/api";
import type { PersonaType } from "../lib/types";

const TOTAL_STEPS = 6;

const PERSONAS: [PersonaType, string][] = [
  ["Student", "Student"],
  ["Graduate", "Graduate"],
  ["YoungProfessional", "Young Professional"],
  ["Entrepreneur", "Entrepreneur"],
  ["Researcher", "Researcher"],
];

const REGIONS = ["Africa", "Middle East", "Asia-Pacific", "Europe", "Americas", "Global"];

function personaDetailFields(persona: PersonaType | null): [string, string][] {
  switch (persona) {
    case "Student":
      return [["university", "University"], ["faculty", "Faculty"], ["level", "Level (e.g. Year 3)"]];
    case "Graduate":
      return [["university", "University attended"], ["discipline", "Discipline"], ["year", "Year graduated"]];
    case "YoungProfessional":
      return [["industry", "Industry"], ["role", "Current role"], ["experience", "Years of experience"]];
    case "Entrepreneur":
      return [["business", "Business name"], ["industry", "Industry"], ["stage", "Stage (e.g. Pre-seed)"]];
    case "Researcher":
      return [["institution", "Institution"], ["researchArea", "Research area"], ["position", "Current position"]];
    default:
      return [];
  }
}

function goalsFor(persona: PersonaType | null): string[] {
  switch (persona) {
    case "Student":
      return ["Get Internship", "Get Scholarship", "Graduate with First Class", "Learn AI", "Build Portfolio"];
    case "Graduate":
      return ["Get First Job", "Learn AI", "Build Professional Portfolio", "Switch Career", "Prepare for NYSC Opportunities"];
    case "YoungProfessional":
      return ["Get Promotion", "Career Transition", "Become Team Lead", "Learn New Skills", "Earn Professional Certification"];
    case "Entrepreneur":
      return ["Get Customers", "Raise Funding", "Build AI Startup", "Scale Business", "Expand Internationally"];
    case "Researcher":
      return ["Publish Papers", "Find Academic Literature", "Find Research Grants", "Apply for PhD", "Improve Academic Writing"];
    default:
      return [];
  }
}

const INTEREST_GROUPS: [string, string[]][] = [
  ["Technology", ["Artificial Intelligence", "Machine Learning", "Data Science", "Software Engineering", "Cloud Computing", "Cybersecurity", "UI/UX", "Product Management"]],
  ["Business", ["Entrepreneurship", "Marketing", "Finance", "Economics", "Leadership", "Strategy", "Investment"]],
  ["Research & Academia", ["Academic Writing", "Research Methods", "Statistics", "Systematic Reviews"]],
  ["Professional Fields", ["Medicine", "Law", "Public Policy", "Engineering", "Agriculture", "Education", "Psychology", "Climate Change"]],
  ["Creative Fields", ["Design", "Photography", "Content Creation", "Film"]],
];

function personaLabel(p: PersonaType | null): string {
  return PERSONAS.find(([value]) => value === p)?.[1] ?? "—";
}

const SIDE_IMAGE: Record<number, string> = {
  0: "https://images.unsplash.com/photo-1758874383904-c3c409aeb32d?fm=jpg&q=80&w=1200&auto=format&fit=crop",
  1: "https://images.unsplash.com/photo-1758874383904-c3c409aeb32d?fm=jpg&q=80&w=1200&auto=format&fit=crop",
  2: "https://images.unsplash.com/photo-1724627561948-3004cc467dc6?fm=jpg&q=80&w=1200&auto=format&fit=crop",
  3: "https://images.unsplash.com/photo-1642009071428-119813340e22?fm=jpg&q=80&w=1200&auto=format&fit=crop",
  4: "https://images.unsplash.com/photo-1693597046525-f0727538336b?fm=jpg&q=80&w=1200&auto=format&fit=crop",
  5: "https://images.unsplash.com/photo-1689421755116-afec95af4f69?fm=jpg&q=80&w=1200&auto=format&fit=crop",
  6: "https://images.unsplash.com/photo-1643845892686-30c241c3938c?fm=jpg&q=80&w=1200&auto=format&fit=crop",
};
const SIDE_IMAGE_DEFAULT = "https://images.unsplash.com/photo-1663026287805-6ef59d3feb19?fm=jpg&q=80&w=1200&auto=format&fit=crop";

const SIDE_EYEBROW: Record<number, string> = {
  0: "Getting started",
  1: "Your account",
  2: "Who you are",
  3: "Your region",
  4: "Your goal",
  5: "Your interests",
  6: "On your schedule",
};
const SIDE_CAPTION: Record<number, string> = {
  0: "Know what matters. Learn what matters. Become ready for what matters.",
  1: "One account, calibrated entirely to you.",
  2: "Radar asks different questions depending on who you are.",
  3: "Personalised to where you are, and what is happening there.",
  4: "Everything Radar recommends is prioritised against this.",
  5: "Curated from trusted sources, explained in minutes.",
  6: "Delivered when you need it, never more than that.",
};

export function Onboarding() {
  const navigate = useNavigate();
  const { signIn, refetchProfile } = useAuth();

  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedPersona, setSelectedPersona] = useState<PersonaType | null>(null);
  const [personaDetails, setPersonaDetails] = useState<Record<string, string>>({});
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [city, setCity] = useState("");
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null);
  const [customGoal, setCustomGoal] = useState("");
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [notifWeekly, setNotifWeekly] = useState(true);
  const [notifDeadlines, setNotifDeadlines] = useState(true);
  const [notifRoadmap, setNotifRoadmap] = useState(false);
  const [saving, setSaving] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const accountReady = name.trim().length > 0 && email.trim().length > 0 && password.length >= 8;
  const goalReady = Boolean(selectedGoal) || customGoal.trim().length > 0;
  const regionSummary = city.trim() ? `${selectedRegion} · ${city}` : selectedRegion ?? "—";

  const selectPersona = (persona: PersonaType) => {
    setSelectedPersona(persona);
    setSelectedGoal(null);
    setPersonaDetails({});
  };

  const selectGoal = (goal: string) => {
    setSelectedGoal(goal);
    setCustomGoal("");
  };

  const toggleInterest = (interest: string) => {
    setSelectedInterests((prev) => {
      if (prev.includes(interest)) return prev.filter((i) => i !== interest);
      if (prev.length >= 5) return prev;
      return [...prev, interest];
    });
  };

  const next = () => setStep((s) => Math.min(s + 1, 7));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  const finish = async () => {
    setSaving(true);
    setAuthError(null);
    try {
      const authResult = await register(name.trim(), email.trim(), password);
      signIn(authResult.token);

      await completeOnboarding({
        persona: selectedPersona ?? undefined,
        primaryGoal: selectedGoal ?? customGoal,
        interests: selectedInterests,
        region: selectedRegion ?? "Global",
        city,
        personaDetails,
        notifications: {
          weeklyBrief: notifWeekly,
          opportunityDeadlines: notifDeadlines,
          roadmapReminders: notifRoadmap,
        },
      });
      await refetchProfile();
      navigate("/");
    } catch (err) {
      setAuthError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
      setSaving(false);
    }
  };

  return (
    <div className="ob-shell">
      <div className="ob-left">
        <div className="ob-topbar">
          <div className="ob-logo-mark">R</div>
          <div className="ob-divider-v" />
          <span className="ob-logo-name">Radar</span>
        </div>

        {step > 0 ? (
          <div className="ob-progress">
            {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((i) => (
              <div key={i} className="ob-progress-dot" style={{ background: i <= step ? "#008c93" : "rgba(20,24,31,.1)" }} />
            ))}
          </div>
        ) : (
          <div style={{ height: 32 }} />
        )}

        <div className="ob-card">
          {step === 0 && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
              <div className="ob-step-label">Welcome</div>
              <h1 className="ob-title" style={{ fontSize: "clamp(1.5rem,4vw,1.9rem)", marginBottom: 12 }}>
                Let's build your Personal Intelligence Profile.
              </h1>
              <p className="ob-sub" style={{ marginBottom: 24 }}>
                A few quick questions so Radar knows who you are, what you're working toward, and what deserves your
                attention first.
              </p>
              <div style={{ background: "#f6f8f9", borderRadius: 14, padding: "17px 19px" }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".07em", textTransform: "uppercase", color: "#008c93", marginBottom: 10 }}>
                  Every morning, one question
                </div>
                <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 600, fontSize: 15, lineHeight: 1.5 }}>
                  "What should I do today to get closer to my goal?"
                </div>
              </div>
              <div className="ob-actions">
                <button className="btn btn--primary" style={{ width: "100%", padding: 15 }} onClick={next}>
                  Get started
                </button>
              </div>
              <div style={{ textAlign: "center", marginTop: 14, fontSize: 13, color: "#8a91a0" }}>
                Already have an account?{" "}
                <a href="/login" style={{ color: "#008c93", fontWeight: 600 }}>
                  Sign in
                </a>
              </div>
            </div>
          )}

          {step === 1 && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
              <div className="ob-step-label">Step 1 of {TOTAL_STEPS} · Account</div>
              <h1 className="ob-title">Create your account.</h1>
              <p className="ob-sub">This is how you'll get back into Radar.</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 18 }}>
                <button className="btn" style={{ width: "100%", padding: 13 }}>Continue with Google</button>
                <button className="btn" style={{ width: "100%", padding: 13 }}>Continue with Apple</button>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, color: "#aab2c0", fontSize: 12, marginBottom: 18 }}>
                <div style={{ flex: 1, height: 1, background: "rgba(20,24,31,.1)" }} />or
                <div style={{ flex: 1, height: 1, background: "rgba(20,24,31,.1)" }} />
              </div>
              <input type="text" placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} className="r-input" style={{ marginBottom: 10 }} />
              <input type="email" placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} className="r-input" style={{ marginBottom: 10 }} />
              <input type="password" placeholder="Create password" value={password} onChange={(e) => setPassword(e.target.value)} className="r-input" />
              {password.length > 0 && password.length < 8 && (
                <div style={{ marginTop: 8, fontSize: 12.5, color: "#d94f4f" }}>Password must be at least 8 characters.</div>
              )}
              <div className="ob-actions">
                <button className="btn" onClick={back}>Back</button>
                <button className="btn btn--primary" style={{ flex: 1 }} onClick={next} disabled={!accountReady}>Continue</button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
              <div className="ob-step-label">Step 2 of {TOTAL_STEPS} · Profile</div>
              <h1 className="ob-title">Tell Radar about yourself.</h1>
              <p className="ob-sub" style={{ marginBottom: 20 }}>Radar asks different questions depending on who you are.</p>
              <div className="ob-options">
                {PERSONAS.map(([persona, label]) => (
                  <button
                    key={persona}
                    className={`ob-option ${selectedPersona === persona ? "active" : ""}`}
                    onClick={() => selectPersona(persona)}
                  >
                    <span>{label}</span>
                    <span className="ob-option__check">✓</span>
                  </button>
                ))}
              </div>
              {selectedPersona && personaDetailFields(selectedPersona).length > 0 && (
                <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid rgba(20,24,31,.08)" }}>
                  {personaDetailFields(selectedPersona).map(([key, label]) => (
                    <div key={key} style={{ marginBottom: 12 }}>
                      <label style={{ fontSize: 12.5, fontWeight: 600, color: "#535c6b", display: "block", marginBottom: 6 }}>{label}</label>
                      <input
                        type="text"
                        placeholder={label}
                        value={personaDetails[key] ?? ""}
                        onChange={(e) => setPersonaDetails((prev) => ({ ...prev, [key]: e.target.value }))}
                        className="r-input"
                      />
                    </div>
                  ))}
                </div>
              )}
              <div className="ob-actions">
                <button className="btn" onClick={back}>Back</button>
                <button className="btn btn--primary" style={{ flex: 1 }} onClick={next} disabled={!selectedPersona}>Continue</button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
              <div className="ob-step-label">Step 3 of {TOTAL_STEPS} · Region</div>
              <h1 className="ob-title">Pick your region.</h1>
              <p className="ob-sub" style={{ marginBottom: 20 }}>Radar personalises sources, opportunities and examples to where you are.</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9, marginBottom: 14 }}>
                {REGIONS.map((region) => (
                  <button
                    key={region}
                    className={`ob-option ${selectedRegion === region ? "active" : ""}`}
                    style={{ textAlign: "left" }}
                    onClick={() => setSelectedRegion(region)}
                  >
                    {region}
                  </button>
                ))}
              </div>
              <label style={{ fontSize: 12.5, fontWeight: 600, color: "#535c6b", display: "block", marginBottom: 6 }}>Country or city (optional)</label>
              <input type="text" placeholder="e.g. Lagos, Nigeria" value={city} onChange={(e) => setCity(e.target.value)} className="r-input" />
              <div className="ob-actions">
                <button className="btn" onClick={back}>Back</button>
                <button className="btn btn--primary" style={{ flex: 1 }} onClick={next} disabled={!selectedRegion}>Continue</button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
              <div className="ob-step-label">Step 4 of {TOTAL_STEPS} · Goal</div>
              <h1 className="ob-title">What's your primary goal?</h1>
              <p className="ob-sub" style={{ marginBottom: 20 }}>
                Everything Radar shows you — reading, learning, opportunities — is prioritised against this one thing.
              </p>
              <div className="ob-options">
                {goalsFor(selectedPersona).map((goal) => (
                  <button key={goal} className={`ob-option ${selectedGoal === goal ? "active" : ""}`} onClick={() => selectGoal(goal)}>
                    <span>{goal}</span>
                    <span className="ob-option__check">✓</span>
                  </button>
                ))}
              </div>
              <label style={{ fontSize: 12.5, fontWeight: 600, color: "#535c6b", display: "block", marginBottom: 6, marginTop: 14 }}>
                Or describe your own goal
              </label>
              <input
                type="text"
                placeholder="e.g. Launch my own consultancy"
                value={customGoal}
                onChange={(e) => setCustomGoal(e.target.value)}
                onFocus={() => setSelectedGoal(null)}
                className="r-input"
              />
              <div className="ob-actions">
                <button className="btn" onClick={back}>Back</button>
                <button className="btn btn--primary" style={{ flex: 1 }} onClick={next} disabled={!goalReady}>Continue</button>
              </div>
            </div>
          )}

          {step === 5 && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
              <div className="ob-step-label">Step 5 of {TOTAL_STEPS} · Interests</div>
              <h1 className="ob-title">Choose your interests.</h1>
              <p className="ob-sub" style={{ marginBottom: 6 }}>Pick 3 to 5. This shapes your feed, your weekly brief and what Radar recommends you learn.</p>
              <div className="ob-interests-meta">{selectedInterests.length} of 5 selected</div>
              <div style={{ overflowY: "auto", flex: 1, paddingBottom: 4 }}>
                {INTEREST_GROUPS.map(([category, items]) => (
                  <div className="ob-interests-group" key={category}>
                    <div className="ob-interests-group-label">{category}</div>
                    <div className="ob-interests-pills">
                      {items.map((interest) => {
                        const isActive = selectedInterests.includes(interest);
                        const atMax = selectedInterests.length >= 5 && !isActive;
                        return (
                          <button
                            key={interest}
                            className={`r-interest-pill ${isActive ? "active" : ""}`}
                            disabled={atMax}
                            onClick={() => toggleInterest(interest)}
                          >
                            {interest}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
              <div className="ob-actions">
                <button className="btn" onClick={back}>Back</button>
                <button className="btn btn--primary" style={{ flex: 1 }} onClick={next} disabled={selectedInterests.length < 3}>Continue</button>
              </div>
              {selectedInterests.length < 3 && (
                <div style={{ textAlign: "center", fontSize: 12, color: "#aab2c0", marginTop: 10 }}>Choose at least 3 interests to continue</div>
              )}
            </div>
          )}

          {step === 6 && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
              <div className="ob-step-label">Step 6 of {TOTAL_STEPS} · Notifications</div>
              <h1 className="ob-title">Stay on your schedule.</h1>
              <p className="ob-sub" style={{ marginBottom: 22 }}>Choose when Radar should reach you. You can turn these off at any time.</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <NotificationToggle
                  title="Weekly Intelligence Brief"
                  description="Monday morning, your week in one place"
                  enabled={notifWeekly}
                  onToggle={() => setNotifWeekly((v) => !v)}
                />
                <NotificationToggle
                  title="Opportunity deadlines"
                  description="7 days and 48 hours before close"
                  enabled={notifDeadlines}
                  onToggle={() => setNotifDeadlines((v) => !v)}
                />
                <NotificationToggle
                  title="Roadmap reminders"
                  description="A nudge when a module stalls"
                  enabled={notifRoadmap}
                  onToggle={() => setNotifRoadmap((v) => !v)}
                />
              </div>
              <div className="ob-actions">
                <button className="btn" onClick={back}>Back</button>
                <button className="btn btn--primary" style={{ flex: 1 }} onClick={next}>Finish</button>
              </div>
            </div>
          )}

          {step === 7 && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
              <div className="ob-step-label">You're set</div>
              <h1 className="ob-title" style={{ marginBottom: 10 }}>Your Personal Intelligence Profile is ready.</h1>
              <p className="ob-sub" style={{ lineHeight: 1.65, marginBottom: 20 }}>
                Radar opens on Today's Focus — one thing to learn, read, watch, listen to, apply for and build.
              </p>
              <div className="ob-profile-summary">
                <div className="ob-profile-summary-label">Your profile</div>
                <div className="ob-profile-row">
                  <span className="ob-profile-row-key">You are</span>
                  <span className="ob-profile-row-val">{personaLabel(selectedPersona)}</span>
                </div>
                <div className="ob-profile-row">
                  <span className="ob-profile-row-key">Working toward</span>
                  <span className="ob-profile-row-val">{selectedGoal ?? customGoal}</span>
                </div>
                <div className="ob-profile-row">
                  <span className="ob-profile-row-key">Region</span>
                  <span className="ob-profile-row-val">{regionSummary}</span>
                </div>
                <div className="ob-profile-row">
                  <span className="ob-profile-row-key">Interests</span>
                  <span className="ob-profile-row-val" style={{ maxWidth: "60%" }}>{selectedInterests.join(" · ")}</span>
                </div>
              </div>
              {authError && (
                <div style={{ marginTop: 14, padding: "12px 14px", background: "#fff0f0", borderRadius: 10, border: "1px solid #f5c6c6", fontSize: 13, color: "#d94f4f" }}>
                  {authError}
                </div>
              )}
              <div className="ob-actions" style={{ paddingTop: 22 }}>
                <button className="btn btn--primary" style={{ width: "100%", padding: 15 }} onClick={finish} disabled={saving}>
                  {saving ? "Setting up…" : "Enter Radar →"}
                </button>
              </div>
            </div>
          )}
        </div>

        {step >= 1 && step <= 6 && <div className="ob-footnote">Step {step} of {TOTAL_STEPS}</div>}
      </div>

      <div className="ob-photo">
        <img src={SIDE_IMAGE[step] ?? SIDE_IMAGE_DEFAULT} alt="" />
        <div className="ob-photo-overlay" />
        <div className="ob-photo-caption">
          <div className="ob-photo-eyebrow">{SIDE_EYEBROW[step] ?? "You're in"}</div>
          <div className="ob-photo-text">{SIDE_CAPTION[step] ?? "Start your day with Radar, not with Google."}</div>
        </div>
      </div>
    </div>
  );
}

function NotificationToggle({
  title,
  description,
  enabled,
  onToggle,
}: {
  title: string;
  description: string;
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        padding: "15px 16px",
        borderRadius: 11,
        background: "#f6f8f9",
        border: "1.5px solid rgba(20,24,31,.08)",
      }}
    >
      <div>
        <div style={{ fontSize: 13.5, fontWeight: 700 }}>{title}</div>
        <div style={{ fontSize: 12, color: "#8a91a0" }}>{description}</div>
      </div>
      <button
        onClick={onToggle}
        style={{
          width: 42,
          height: 24,
          borderRadius: 99,
          border: "none",
          background: enabled ? "#008c93" : "rgba(20,24,31,.16)",
          position: "relative",
          flex: "none",
          cursor: "pointer",
        }}
      >
        <div
          style={{
            width: 18,
            height: 18,
            borderRadius: "50%",
            background: "#fff",
            position: "absolute",
            top: 3,
            left: enabled ? 21 : 3,
            transition: "left .15s",
          }}
        />
      </button>
    </div>
  );
}
