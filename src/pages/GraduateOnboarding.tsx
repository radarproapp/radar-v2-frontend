import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { OnboardingShell } from "../components/OnboardingShell";
import { ApiError, completeOnboarding, register } from "../lib/api";
import { INTEREST_GROUPS } from "../lib/interests";

const LEVELS = ["Beginner", "Intermediate", "Advanced"] as const;

const GRADUATE_GOALS = [
  "Get First Job",
  "Build Professional Portfolio",
  "Prepare for NYSC Opportunities",
  "Switch Career to Tech / Data",
  "Learn AI & Emerging Tools",
];

const GRADUATE_PROBLEMS = [
  "I don't know what entry-level roles exist",
  "I lack practical work experience",
  "I don't have a verified portfolio",
  "I lack industry connections",
  "I don't know which tech skills to learn first",
];

const GRADUATE_OPPORTUNITY_TYPES = [
  "Jobs",
  "Internships",
  "Graduate Trainee Programmes",
  "Fellowships",
  "Certifications",
  "Hackathons",
];

const REGIONS = ["Africa", "Middle East", "Asia-Pacific", "Europe", "Americas", "Global"];

export function GraduateOnboarding() {
  const navigate = useNavigate();
  const { isAuthenticated, signIn, refetchProfile } = useAuth();

  const [step, setStep] = useState(isAuthenticated ? 1 : 0);
  const totalSteps = isAuthenticated ? 6 : 7;

  // Account
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Graduate profile details
  const [university, setUniversity] = useState("");
  const [discipline, setDiscipline] = useState("");
  const [yearGraduated, setYearGraduated] = useState(new Date().getFullYear().toString());

  // Location
  const [region, setRegion] = useState("Africa");
  const [city, setCity] = useState("");

  // Goal
  const [selectedGoal, setSelectedGoal] = useState("Get First Job");
  const [customGoal, setCustomGoal] = useState("");
  const [problems, setProblems] = useState<string[]>([
    "I lack practical work experience",
    "I don't have a verified portfolio",
  ]);
  const [opportunityPrefs, setOpportunityPrefs] = useState<string[]>([
    "Jobs",
    "Graduate Trainee Programmes",
    "Internships",
  ]);

  // Interests
  const [selectedInterests, setSelectedInterests] = useState<string[]>([
    "Artificial Intelligence",
    "Software Engineering",
    "Product Management",
  ]);
  const [interestContexts] = useState<
    Record<string, { level: typeof LEVELS[number]; lens: string }>
  >({});
  const [dominantInterests] = useState<string[]>(["Artificial Intelligence"]);

  // Notifications
  const [notifWeekly, setNotifWeekly] = useState(true);
  const [notifDeadlines, setNotifDeadlines] = useState(true);
  const [notifRoadmap, setNotifRoadmap] = useState(false);

  // Submission
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const effectiveGoal = customGoal.trim() || selectedGoal;

  const toggleItem = (list: string[], item: string) => {
    return list.includes(item) ? list.filter((i) => i !== item) : [...list, item];
  };

  const toggleInterest = (interest: string) => {
    setSelectedInterests((prev) => {
      if (prev.includes(interest)) return prev.filter((i) => i !== interest);
      if (prev.length >= 8) return prev;
      return [...prev, interest];
    });
  };

  const handleBack = () => {
    if ((!isAuthenticated && step === 0) || (isAuthenticated && step === 1)) {
      navigate("/onboarding");
      return;
    }
    setStep((s) => s - 1);
  };

  const handleNext = () => setStep((s) => s + 1);

  const handleFinish = async () => {
    setSaving(true);
    setErrorMsg(null);
    try {
      if (!isAuthenticated) {
        const authRes = await register(name.trim(), email.trim(), password);
        signIn(authRes.token);
      }

      await completeOnboarding({
        persona: "Graduate",
        primaryGoal: effectiveGoal,
        region,
        city: city.trim() || "National",
        interests: selectedInterests,
        dominantInterests,
        interestContexts: selectedInterests.map((interest) => ({
          interest,
          goal: effectiveGoal,
          level: interestContexts[interest]?.level ?? "Beginner",
          lens: interestContexts[interest]?.lens ?? "Career transition and employment",
        })),
        problems,
        opportunityPreferences: opportunityPrefs,
        personaDetails: {
          university,
          discipline,
          year: yearGraduated,
        },
        notifications: {
          weeklyBrief: notifWeekly,
          opportunityDeadlines: notifDeadlines,
          roadmapReminders: notifRoadmap,
        },
      });

      await refetchProfile();
      navigate("/");
    } catch (err) {
      setErrorMsg(err instanceof ApiError ? err.message : "Failed to save your graduate profile.");
      setSaving(false);
    }
  };

  const displayStepNumber = isAuthenticated ? step : step + 1;

  return (
    <OnboardingShell
      badge="Radar Graduate"
      stepNumber={step === (isAuthenticated ? 6 : 6) ? undefined : displayStepNumber}
      totalSteps={totalSteps}
      sideImage={
        step === 0
          ? "/images/marketing/account.jpg"
          : step === 1
          ? "/images/marketing/career.jpg"
          : step === 2
          ? "/images/marketing/region.jpg"
          : step === 3
          ? "/images/marketing/goal.jpg"
          : step === 4
          ? "/images/marketing/interests.jpg"
          : "/images/marketing/complete.jpg"
      }
      sideEyebrow="Radar Graduate"
      sideCaption="Translate your degree into hireable skills, portfolio projects, and early-career traction."
      footerNotice={
        step === 0 && !isAuthenticated ? (
          <div>
            Already have an account?{" "}
            <Link to="/login" style={{ color: "#008c93", fontWeight: 600 }}>
              Sign in
            </Link>
          </div>
        ) : null
      }
    >
      {/* Account step */}
      {!isAuthenticated && step === 0 && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <div className="ob-step-label">Step 1 of {totalSteps} · Account</div>
          <h1 className="ob-title">Create your graduate account.</h1>
          <p className="ob-sub" style={{ marginBottom: 20 }}>
            Start building your career trajectory and tracking early career opportunities.
          </p>

          <input
            type="text"
            placeholder="Full Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="r-input"
            style={{ marginBottom: 12 }}
          />
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="r-input"
            style={{ marginBottom: 12 }}
          />
          <input
            type="password"
            placeholder="Password (minimum 8 characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="r-input"
          />
          {password.length > 0 && password.length < 8 && (
            <div style={{ marginTop: 8, fontSize: 12.5, color: "#d94f4f" }}>
              Password must be at least 8 characters.
            </div>
          )}

          <div className="ob-actions">
            <button className="btn" onClick={handleBack}>
              ← Change user type
            </button>
            <button
              className="btn btn--primary"
              style={{ flex: 1 }}
              onClick={handleNext}
              disabled={!name.trim() || !email.trim() || password.length < 8}
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Step 1: Academic Background */}
      {step === (isAuthenticated ? 1 : 1) && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <div className="ob-step-label">
            Step {displayStepNumber} of {totalSteps} · Background
          </div>
          <h1 className="ob-title">Tell Radar about your degree.</h1>
          <p className="ob-sub" style={{ marginBottom: 20 }}>
            Radar maps career transition pathways based on your degree background.
          </p>

          <label style={{ fontSize: 12.5, fontWeight: 700, color: "#475569", marginBottom: 6, display: "block" }}>
            University Attended
          </label>
          <input
            type="text"
            placeholder="e.g. Obafemi Awolowo University"
            value={university}
            onChange={(e) => setUniversity(e.target.value)}
            className="r-input"
            style={{ marginBottom: 14 }}
          />

          <label style={{ fontSize: 12.5, fontWeight: 700, color: "#475569", marginBottom: 6, display: "block" }}>
            Discipline / Course of Study
          </label>
          <input
            type="text"
            placeholder="e.g. Economics, Electrical Engineering"
            value={discipline}
            onChange={(e) => setDiscipline(e.target.value)}
            className="r-input"
            style={{ marginBottom: 14 }}
          />

          <label style={{ fontSize: 12.5, fontWeight: 700, color: "#475569", marginBottom: 6, display: "block" }}>
            Graduation Year
          </label>
          <input
            type="text"
            placeholder="e.g. 2024, 2025"
            value={yearGraduated}
            onChange={(e) => setYearGraduated(e.target.value)}
            className="r-input"
          />

          <div className="ob-actions">
            <button className="btn" onClick={handleBack}>
              Back
            </button>
            <button
              className="btn btn--primary"
              style={{ flex: 1 }}
              onClick={handleNext}
              disabled={!discipline.trim()}
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Location */}
      {step === (isAuthenticated ? 2 : 2) && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <div className="ob-step-label">
            Step {displayStepNumber} of {totalSteps} · Location
          </div>
          <h1 className="ob-title">Where are you based?</h1>
          <p className="ob-sub" style={{ marginBottom: 20 }}>
            We prioritize entry-level jobs and graduate roles hiring in your region.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9, marginBottom: 14 }}>
            {REGIONS.map((r) => (
              <button
                key={r}
                className={`ob-option ${region === r ? "active" : ""}`}
                style={{ textAlign: "left" }}
                onClick={() => setRegion(r)}
              >
                {r}
              </button>
            ))}
          </div>

          <label style={{ fontSize: 12.5, fontWeight: 700, color: "#475569", marginBottom: 6, display: "block" }}>
            City / Country
          </label>
          <input
            type="text"
            placeholder="e.g. Lagos, Nigeria"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="r-input"
          />

          <div className="ob-actions">
            <button className="btn" onClick={handleBack}>
              Back
            </button>
            <button
              className="btn btn--primary"
              style={{ flex: 1 }}
              onClick={handleNext}
              disabled={!city.trim()}
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Primary Goal & Barriers */}
      {step === (isAuthenticated ? 3 : 3) && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <div className="ob-step-label">
            Step {displayStepNumber} of {totalSteps} · Career Goal
          </div>
          <h1 className="ob-title">What is your primary milestone?</h1>
          <p className="ob-sub" style={{ marginBottom: 16 }}>
            Radar designs your daily roadmap and projects toward this single milestone.
          </p>

          <div className="ob-options" style={{ marginBottom: 12 }}>
            {GRADUATE_GOALS.map((goal) => (
              <button
                key={goal}
                className={`ob-option ${selectedGoal === goal && !customGoal ? "active" : ""}`}
                onClick={() => {
                  setSelectedGoal(goal);
                  setCustomGoal("");
                }}
              >
                <span>{goal}</span>
                <span className="ob-option__check">✓</span>
              </button>
            ))}
          </div>

          <input
            type="text"
            placeholder="Or describe your target goal"
            value={customGoal}
            onChange={(e) => setCustomGoal(e.target.value)}
            className="r-input"
            style={{ marginBottom: 16 }}
          />

          <label style={{ fontSize: 12.5, fontWeight: 700, color: "#475569", marginBottom: 6, display: "block" }}>
            What is currently your biggest barrier?
          </label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 14 }}>
            {GRADUATE_PROBLEMS.map((prob) => (
              <button
                key={prob}
                className={`ob-tag-btn ${problems.includes(prob) ? "active" : ""}`}
                onClick={() => setProblems((prev) => toggleItem(prev, prob))}
              >
                {prob}
              </button>
            ))}
          </div>

          <label style={{ fontSize: 12.5, fontWeight: 700, color: "#475569", marginBottom: 6, display: "block" }}>
            What opportunities should Radar monitor for you?
          </label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
            {GRADUATE_OPPORTUNITY_TYPES.map((op) => (
              <button
                key={op}
                className={`ob-tag-btn ${opportunityPrefs.includes(op) ? "active" : ""}`}
                onClick={() => setOpportunityPrefs((prev) => toggleItem(prev, op))}
              >
                {op}
              </button>
            ))}
          </div>

          <div className="ob-actions">
            <button className="btn" onClick={handleBack}>
              Back
            </button>
            <button className="btn btn--primary" style={{ flex: 1 }} onClick={handleNext}>
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Interests */}
      {step === (isAuthenticated ? 4 : 4) && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <div className="ob-step-label">
            Step {displayStepNumber} of {totalSteps} · Interests
          </div>
          <h1 className="ob-title">Select your industry interests.</h1>
          <p className="ob-sub" style={{ marginBottom: 6 }}>
            Pick 3 to 8 subjects to calibrate your feed, skills roadmap, and mentor questions.
          </p>
          <div className="ob-interests-meta">{selectedInterests.length} of 8 selected</div>

          <div style={{ overflowY: "auto", flex: 1, maxHeight: 300, marginBottom: 12, paddingRight: 4 }}>
            {INTEREST_GROUPS.map(([group, items]) => (
              <div key={group} style={{ marginBottom: 14 }}>
                <div className="ob-interests-group-label">{group}</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {items.map((it) => {
                    const active = selectedInterests.includes(it);
                    return (
                      <button
                        key={it}
                        className={`r-interest-pill ${active ? "active" : ""}`}
                        onClick={() => toggleInterest(it)}
                      >
                        {it}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="ob-actions">
            <button className="btn" onClick={handleBack}>
              Back
            </button>
            <button
              className="btn btn--primary"
              style={{ flex: 1 }}
              onClick={handleNext}
              disabled={selectedInterests.length < 3}
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Step 5: Notifications */}
      {step === (isAuthenticated ? 5 : 5) && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <div className="ob-step-label">
            Step {displayStepNumber} of {totalSteps} · Notifications
          </div>
          <h1 className="ob-title">Stay on your schedule.</h1>
          <p className="ob-sub" style={{ marginBottom: 20 }}>
            Choose how Radar keeps you accountable. You can update these at any time.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#f8fafc", padding: "14px 16px", borderRadius: 12, cursor: "pointer" }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#1e293b" }}>Weekly Career Brief</div>
                <div style={{ fontSize: 12.5, color: "#64748b" }}>Monday morning summary of entry-level jobs and portfolio challenges</div>
              </div>
              <input
                type="checkbox"
                checked={notifWeekly}
                onChange={(e) => setNotifWeekly(e.target.checked)}
                style={{ width: 18, height: 18, accentColor: "#008c93" }}
              />
            </label>

            <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#f8fafc", padding: "14px 16px", borderRadius: 12, cursor: "pointer" }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#1e293b" }}>Application Deadlines</div>
                <div style={{ fontSize: 12.5, color: "#64748b" }}>Closing alerts for graduate trainee schemes and internships</div>
              </div>
              <input
                type="checkbox"
                checked={notifDeadlines}
                onChange={(e) => setNotifDeadlines(e.target.checked)}
                style={{ width: 18, height: 18, accentColor: "#008c93" }}
              />
            </label>

            <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#f8fafc", padding: "14px 16px", borderRadius: 12, cursor: "pointer" }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#1e293b" }}>Roadmap Nudges</div>
                <div style={{ fontSize: 12.5, color: "#64748b" }}>Helpful reminders when you pause your project studio</div>
              </div>
              <input
                type="checkbox"
                checked={notifRoadmap}
                onChange={(e) => setNotifRoadmap(e.target.checked)}
                style={{ width: 18, height: 18, accentColor: "#008c93" }}
              />
            </label>
          </div>

          <div className="ob-actions">
            <button className="btn" onClick={handleBack}>
              Back
            </button>
            <button className="btn btn--primary" style={{ flex: 1 }} onClick={handleNext}>
              Review Profile →
            </button>
          </div>
        </div>
      )}

      {/* Step 6: Confirmation & Personalised Starter Plan */}
      {step === (isAuthenticated ? 6 : 6) && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <div className="ob-step-label">Ready to begin</div>
          <h1 className="ob-title" style={{ fontSize: "clamp(1.45rem, 3.8vw, 1.85rem)", marginBottom: 8 }}>
            Your Radar Graduate Profile is ready.
          </h1>
          <p className="ob-sub" style={{ marginBottom: 16 }}>
            Radar opens on Today's Focus — connecting daily learning to portfolio proof and verified opportunities.
          </p>

          <div className="ob-profile-summary">
            <div className="ob-profile-summary-label">Graduate Profile</div>
            <div className="ob-profile-row">
              <span className="ob-profile-row-key">Track</span>
              <span className="ob-profile-row-val">Radar Graduate</span>
            </div>
            <div className="ob-profile-row">
              <span className="ob-profile-row-key">Discipline</span>
              <span className="ob-profile-row-val">{discipline} ({yearGraduated})</span>
            </div>
            <div className="ob-profile-row">
              <span className="ob-profile-row-key">Target Goal</span>
              <span className="ob-profile-row-val">{effectiveGoal}</span>
            </div>
            <div className="ob-profile-row">
              <span className="ob-profile-row-key">Location</span>
              <span className="ob-profile-row-val">{region} · {city}</span>
            </div>
            <div className="ob-profile-row">
              <span className="ob-profile-row-key">Core Focus</span>
              <span className="ob-profile-row-val">{selectedInterests.slice(0, 3).join(", ")}</span>
            </div>
          </div>

          {errorMsg && (
            <div style={{ marginBottom: 14, padding: "11px 14px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, color: "#b91c1c", fontSize: 13 }}>
              {errorMsg}
            </div>
          )}

          <div className="ob-actions" style={{ paddingTop: 10 }}>
            <button
              className="btn btn--primary"
              style={{ width: "100%", padding: 15, fontSize: 15 }}
              onClick={handleFinish}
              disabled={saving}
            >
              {saving ? "Setting up Radar Graduate…" : "Enter Radar Graduate →"}
            </button>
          </div>
        </div>
      )}
    </OnboardingShell>
  );
}
