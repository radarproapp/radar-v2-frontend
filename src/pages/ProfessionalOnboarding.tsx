import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { OnboardingShell } from "../components/OnboardingShell";
import { ApiError, completeOnboarding, register } from "../lib/api";
import { INTEREST_GROUPS } from "../lib/interests";

const LEVELS = ["Beginner", "Intermediate", "Advanced"] as const;

const INDUSTRIES = [
  "Technology & Software",
  "Finance & Banking",
  "Healthcare & Medicine",
  "Education & EdTech",
  "Government & Public Policy",
  "Consulting & Advisory",
  "Retail & E-commerce",
  "Media & Entertainment",
  "Energy & Climate",
  "Manufacturing & Engineering",
  "Logistics & Supply Chain",
  "Legal & Compliance",
  "Other",
];

const PROFESSIONAL_GOALS = [
  "Get Promotion & Accelerate Career",
  "Transition to New Industry / Role",
  "Become Team Lead or Engineering Manager",
  "Master AI & Emerging Technologies",
  "Earn Executive or Professional Certification",
];

const PROFESSIONAL_PROBLEMS = [
  "I don't have enough time for deep learning",
  "There's too much information to filter signal from noise",
  "I lack senior leadership & strategic exposure",
  "My company moves slower than industry tech",
  "I want to transition into high-growth sectors",
];

const PROFESSIONAL_OPPORTUNITIES = [
  "Executive Jobs",
  "Fellowships & Residencies",
  "Conferences & Seminars",
  "Certifications",
  "Consulting & Advisory Roles",
  "Grants & Founder Programmes",
];

const REGIONS = ["Africa", "Middle East", "Asia-Pacific", "Europe", "Americas", "Global"];

export function ProfessionalOnboarding() {
  const navigate = useNavigate();
  const { isAuthenticated, signIn, refetchProfile } = useAuth();

  const [step, setStep] = useState(isAuthenticated ? 1 : 0);
  const totalSteps = isAuthenticated ? 6 : 7;

  // Account
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Professional details
  const [industry, setIndustry] = useState("Technology & Software");
  const [role, setRole] = useState("");
  const [experience, setExperience] = useState("3-5 years");

  // Location
  const [region, setRegion] = useState("Africa");
  const [city, setCity] = useState("");

  // Goal & Focus
  const [selectedGoal, setSelectedGoal] = useState("Get Promotion & Accelerate Career");
  const [customGoal, setCustomGoal] = useState("");
  const [problems, setProblems] = useState<string[]>([
    "I don't have enough time for deep learning",
    "There's too much information to filter signal from noise",
  ]);
  const [opportunityPrefs, setOpportunityPrefs] = useState<string[]>([
    "Executive Jobs",
    "Conferences & Seminars",
    "Certifications",
  ]);

  // Interests
  const [selectedInterests, setSelectedInterests] = useState<string[]>([
    "Artificial Intelligence",
    "Leadership & Management",
    "Strategy & Operations",
  ]);
  const [interestContexts] = useState<
    Record<string, { level: typeof LEVELS[number]; lens: string }>
  >({});
  const [dominantInterests] = useState<string[]>([
    "Artificial Intelligence",
    "Leadership & Management",
  ]);

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
        persona: "YoungProfessional",
        primaryGoal: effectiveGoal,
        region,
        city: city.trim() || "Headquarters",
        interests: selectedInterests,
        dominantInterests,
        interestContexts: selectedInterests.map((interest) => ({
          interest,
          goal: effectiveGoal,
          level: interestContexts[interest]?.level ?? "Intermediate",
          lens: interestContexts[interest]?.lens ?? `Professional focus in ${industry}`,
        })),
        problems,
        opportunityPreferences: opportunityPrefs,
        personaDetails: {
          industry,
          role,
          experience,
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
      setErrorMsg(err instanceof ApiError ? err.message : "Failed to save your professional profile.");
      setSaving(false);
    }
  };

  const displayStepNumber = isAuthenticated ? step : step + 1;

  return (
    <OnboardingShell
      badge="Radar Professional"
      stepNumber={step === (isAuthenticated ? 6 : 6) ? undefined : displayStepNumber}
      totalSteps={totalSteps}
      sideImage={
        step === 0
          ? "/images/marketing/account.jpg"
          : step === 1
          ? "/images/marketing/leader.jpg"
          : step === 2
          ? "/images/marketing/region.jpg"
          : step === 3
          ? "/images/marketing/goal.jpg"
          : step === 4
          ? "/images/marketing/interests.jpg"
          : "/images/marketing/complete.jpg"
      }
      sideEyebrow="Radar Professional"
      sideCaption="Strategic insights, high-value opportunities, and domain mastery for ambitious leaders."
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
          <h1 className="ob-title">Create your professional account.</h1>
          <p className="ob-sub" style={{ marginBottom: 20 }}>
            Unlock daily executive briefs, industry research summaries, and career milestones.
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
            placeholder="Work or personal email"
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

      {/* Step 1: Professional Details */}
      {step === (isAuthenticated ? 1 : 1) && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <div className="ob-step-label">
            Step {displayStepNumber} of {totalSteps} · Role & Industry
          </div>
          <h1 className="ob-title">Tell Radar about your current work.</h1>
          <p className="ob-sub" style={{ marginBottom: 20 }}>
            We calibrate technical depth and market intelligence to your current seniority.
          </p>

          <label style={{ fontSize: 12.5, fontWeight: 700, color: "#475569", marginBottom: 6, display: "block" }}>
            Current Industry
          </label>
          <select
            className="r-input"
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            style={{ marginBottom: 14 }}
          >
            {INDUSTRIES.map((ind) => (
              <option key={ind} value={ind}>
                {ind}
              </option>
            ))}
          </select>

          <label style={{ fontSize: 12.5, fontWeight: 700, color: "#475569", marginBottom: 6, display: "block" }}>
            Current Job Title / Role
          </label>
          <input
            type="text"
            placeholder="e.g. Senior Product Manager, Lead Analyst, Founder"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="r-input"
            style={{ marginBottom: 14 }}
          />

          <label style={{ fontSize: 12.5, fontWeight: 700, color: "#475569", marginBottom: 6, display: "block" }}>
            Years of Experience
          </label>
          <input
            type="text"
            placeholder="e.g. 2 years, 5-8 years, 10+ years"
            value={experience}
            onChange={(e) => setExperience(e.target.value)}
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
              disabled={!role.trim()}
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
          <h1 className="ob-title">Where are you operating?</h1>
          <p className="ob-sub" style={{ marginBottom: 20 }}>
            Radar connects local market regulatory context and regional opportunities.
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
            Primary City / Country
          </label>
          <input
            type="text"
            placeholder="e.g. Nairobi, Kenya or London, UK"
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

      {/* Step 3: Primary Career Goal */}
      {step === (isAuthenticated ? 3 : 3) && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <div className="ob-step-label">
            Step {displayStepNumber} of {totalSteps} · Strategic Goal
          </div>
          <h1 className="ob-title">What is your next career frontier?</h1>
          <p className="ob-sub" style={{ marginBottom: 16 }}>
            Every morning recommendation, article analysis, and mentor scenario focuses here.
          </p>

          <div className="ob-options" style={{ marginBottom: 12 }}>
            {PROFESSIONAL_GOALS.map((goal) => (
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
            placeholder="Or describe your strategic milestone"
            value={customGoal}
            onChange={(e) => setCustomGoal(e.target.value)}
            className="r-input"
            style={{ marginBottom: 16 }}
          />

          <label style={{ fontSize: 12.5, fontWeight: 700, color: "#475569", marginBottom: 6, display: "block" }}>
            What is your main constraint?
          </label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 14 }}>
            {PROFESSIONAL_PROBLEMS.map((prob) => (
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
            High-value opportunities to surface:
          </label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
            {PROFESSIONAL_OPPORTUNITIES.map((op) => (
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
            Step {displayStepNumber} of {totalSteps} · Knowledge Domains
          </div>
          <h1 className="ob-title">Curate your intelligence domains.</h1>
          <p className="ob-sub" style={{ marginBottom: 6 }}>
            Select 3 to 8 domains. Radar reads global journals, papers, and industry feeds for you.
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
            Step {displayStepNumber} of {totalSteps} · Cadence
          </div>
          <h1 className="ob-title">Executive delivery schedule.</h1>
          <p className="ob-sub" style={{ marginBottom: 20 }}>
            Curated intelligence distilled to respect your busy calendar.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#f8fafc", padding: "14px 16px", borderRadius: 12, cursor: "pointer" }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#1e293b" }}>Weekly Executive Brief</div>
                <div style={{ fontSize: 12.5, color: "#64748b" }}>Monday morning briefing covering macro trends and strategic opportunities</div>
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
                <div style={{ fontSize: 14, fontWeight: 700, color: "#1e293b" }}>Leadership Deadlines</div>
                <div style={{ fontSize: 12.5, color: "#64748b" }}>Closing dates for grants, board opportunities, and fellowships</div>
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
                <div style={{ fontSize: 14, fontWeight: 700, color: "#1e293b" }}>Skill Roadmap Alerts</div>
                <div style={{ fontSize: 12.5, color: "#64748b" }}>Smart micro-learning prompts during your focus blocks</div>
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

      {/* Step 6: Confirmation */}
      {step === (isAuthenticated ? 6 : 6) && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <div className="ob-step-label">Ready to begin</div>
          <h1 className="ob-title" style={{ fontSize: "clamp(1.45rem, 3.8vw, 1.85rem)", marginBottom: 8 }}>
            Your Radar Professional Engine is ready.
          </h1>
          <p className="ob-sub" style={{ marginBottom: 16 }}>
            Radar opens on Today's Focus — strategic reading, practical application, and senior opportunities.
          </p>

          <div className="ob-profile-summary">
            <div className="ob-profile-summary-label">Professional Profile</div>
            <div className="ob-profile-row">
              <span className="ob-profile-row-key">Track</span>
              <span className="ob-profile-row-val">Radar Professional</span>
            </div>
            <div className="ob-profile-row">
              <span className="ob-profile-row-key">Role & Industry</span>
              <span className="ob-profile-row-val">{role} · {industry}</span>
            </div>
            <div className="ob-profile-row">
              <span className="ob-profile-row-key">Strategic Goal</span>
              <span className="ob-profile-row-val">{effectiveGoal}</span>
            </div>
            <div className="ob-profile-row">
              <span className="ob-profile-row-key">Location</span>
              <span className="ob-profile-row-val">{region} · {city}</span>
            </div>
            <div className="ob-profile-row">
              <span className="ob-profile-row-key">Domains</span>
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
              {saving ? "Calibrating Radar Professional…" : "Enter Radar Professional →"}
            </button>
          </div>
        </div>
      )}
    </OnboardingShell>
  );
}
