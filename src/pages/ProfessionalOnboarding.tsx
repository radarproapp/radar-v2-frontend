import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { OnboardingShell } from "../components/OnboardingShell";
import { ApiError, completeOnboarding, register } from "../lib/api";
import { Icon } from "../components/Icon";

const INDUSTRIES = [
  "Technology & Software",
  "Fintech, Banking & Financial Services",
  "Healthcare, Pharma & Biotech",
  "Telecoms & Digital Infrastructure",
  "Energy, Utilities & Climate Tech",
  "Management Consulting & Advisory",
  "E-Commerce & Retail",
  "Media, Entertainment & Creative",
  "Manufacturing & Supply Chain",
  "Government & Public Sector",
  "Other",
];

const EXPERIENCE_LEVELS = [
  "1 - 3 years (Early Professional)",
  "4 - 7 years (Mid-level / Senior)",
  "8 - 12 years (Lead / Staff / Principal)",
  "12+ years (Director / Executive)",
];

const LEADERSHIP_SCOPES = [
  "Individual Contributor (Senior / Specialist)",
  "Technical Lead / Project Lead",
  "People Manager (Team of 3 - 8)",
  "Department Head (Team of 10+)",
  "P&L / Budget Decision Maker",
];

const CAREER_GOALS = [
  "Earn more & increase total compensation",
  "Seek promotion in my current organisation",
  "Move into strategic leadership or executive role",
  "Change employers for faster growth",
  "Change career direction / industry pivot",
  "Increase professional influence & authority",
  "Develop independent consulting / advisory income",
  "Improve job security & career sustainability",
];

const RISK_TOLERANCES = [
  "Low risk: Prefer to improve and advance within my current organisation",
  "Moderate risk: Open to selective high-growth external opportunities",
  "High risk: Actively pursuing career pivot or independent consulting",
];

const TIME_AVAILABILITY = [
  "2 - 4 hours / week (high-efficiency focus)",
  "5 - 8 hours / week (dedicated development)",
  "10+ hours / week (accelerated transition)",
];

export function ProfessionalOnboarding() {
  const navigate = useNavigate();
  const { isAuthenticated, signIn, refetchProfile } = useAuth();

  const [step, setStep] = useState(isAuthenticated ? 1 : 0);
  const totalSteps = isAuthenticated ? 5 : 6;

  // Account (if unauth)
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Step 1: Current Position
  const [role, setRole] = useState("");
  const [industry, setIndustry] = useState("Technology & Software");
  const [experienceLevel, setExperienceLevel] = useState("4 - 7 years (Mid-level / Senior)");
  const [mainResponsibilities, setMainResponsibilities] = useState("");
  const [leadershipScope, setLeadershipScope] = useState("Individual Contributor (Senior / Specialist)");

  // Step 2: Existing Strengths & Capabilities (Claimed vs Demonstrated)
  const [claimedStrengths, setClaimedStrengths] = useState<string[]>([
    "System Architecture & Design",
    "Product Strategy & Roadmap",
    "Cross-Functional Team Leadership",
  ]);
  const [significantProjects, setSignificantProjects] = useState("");
  const [certifications, setCertifications] = useState("");

  // Step 3: Career Goals
  const [selectedGoals, setSelectedGoals] = useState<string[]>([
    "Seek promotion in my current organisation",
    "Earn more & increase total compensation",
  ]);

  // Step 4: Constraints & Risk Tolerance
  const [riskTolerance, setRiskTolerance] = useState(
    "Low risk: Prefer to improve and advance within my current organisation",
  );
  const [availableTime, setAvailableTime] = useState("2 - 4 hours / week (high-efficiency focus)");
  const [maintainIncomePriority, setMaintainIncomePriority] = useState(true);
  const [targetLocation, setTargetLocation] = useState("Lagos, Nigeria (or Remote)");

  // Step 5: Evidence of Professional Impact
  const [initialImpactExample] = useState(
    "Led cross-team redesign of payments checkout flow, reducing latency by 35% and recovering ~$180k in annual abandoned transactions.",
  );

  // Submission
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const toggleItem = (list: string[], item: string, maxItems = 4) => {
    if (list.includes(item)) return list.filter((i) => i !== item);
    if (list.length >= maxItems) return list;
    return [...list, item];
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

      const primaryGoal = selectedGoals[0] || "Seek promotion in my current organisation";
      const allInterests = Array.from(
        new Set([industry, ...claimedStrengths, "Leadership & Management"]),
      ).slice(0, 6);

      await completeOnboarding({
        persona: "YoungProfessional",
        primaryGoal,
        region: "Africa",
        city: targetLocation,
        interests: allInterests,
        dominantInterests: [industry, claimedStrengths[0] || "Strategy"],
        interestContexts: allInterests.map((interest) => ({
          interest,
          goal: primaryGoal,
          level: "Intermediate",
          lens: `Professional advance in ${industry} (${role})`,
        })),
        problems: ["Time constraint", "Need executive visibility & promotion case"],
        opportunityPreferences: ["Executive Jobs", "Consulting & Advisory", "Leadership Programmes"],
        personaDetails: {
          role,
          industry,
          experience: experienceLevel,
          responsibilities: mainResponsibilities,
          leadershipScope,
          claimedStrengths: claimedStrengths.join(", "),
          significantProjects,
          certifications,
          careerGoals: selectedGoals.join(", "),
          riskTolerance,
          availableTime,
          maintainIncomePriority: maintainIncomePriority ? "true" : "false",
          targetLocation,
          initialImpactExample,
          activeCareerDecision: "Internal Promotion to Senior/Director",
        },
        notifications: {
          weeklyBrief: true,
          opportunityDeadlines: true,
          roadmapReminders: true,
        },
      });

      await refetchProfile();
      navigate("/");
    } catch (err) {
      setErrorMsg(err instanceof ApiError ? err.message : "Failed to save your professional career profile.");
      setSaving(false);
    }
  };

  const displayStepNumber = isAuthenticated ? step : step + 1;

  return (
    <OnboardingShell
      badge="Radar Career: Professional"
      stepNumber={step === (isAuthenticated ? 5 : 5) ? undefined : displayStepNumber}
      totalSteps={totalSteps}
      sideImage={
        step === 0
          ? "/images/marketing/account.jpg"
          : step === 1
          ? "/images/marketing/leader.jpg"
          : step === 2
          ? "/images/marketing/intelligence.jpg"
          : step === 3
          ? "/images/marketing/goal.jpg"
          : "/images/marketing/complete.jpg"
      }
      sideEyebrow="Radar Career for Professionals"
      sideCaption="Turn your experience into your next advantage without taking unnecessary risks."
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
      {/* STEP 0: Account */}
      {!isAuthenticated && step === 0 && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <div className="ob-step-label">Step 1 of {totalSteps} · Account</div>
          <h1 className="ob-title">Create your professional account.</h1>
          <p className="ob-sub" style={{ marginBottom: 20 }}>
            Save your career position assessment, decision comparisons, and professional impact log.
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

      {/* STEP 1: Current Position */}
      {step === (isAuthenticated ? 1 : 1) && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <div className="ob-step-label">
            Step {displayStepNumber} of {totalSteps} · Current Position
          </div>
          <h1 className="ob-title">Your current career baseline.</h1>
          <p className="ob-sub" style={{ marginBottom: 16 }}>
            Radar must understand your current baseline before recommending your next move.
          </p>

          <label style={{ fontSize: 12.5, fontWeight: 700, color: "#475569", marginBottom: 6, display: "block" }}>
            Current Job Title / Role
          </label>
          <input
            type="text"
            placeholder="e.g. Senior Product Manager, Technical Lead, Financial Controller"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="r-input"
            style={{ marginBottom: 14 }}
          />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
            <div>
              <label style={{ fontSize: 12.5, fontWeight: 700, color: "#475569", marginBottom: 6, display: "block" }}>
                Industry
              </label>
              <select
                className="r-input"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
              >
                {INDUSTRIES.map((ind) => (
                  <option key={ind} value={ind}>
                    {ind}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12.5, fontWeight: 700, color: "#475569", marginBottom: 6, display: "block" }}>
                Experience Level
              </label>
              <select
                className="r-input"
                value={experienceLevel}
                onChange={(e) => setExperienceLevel(e.target.value)}
              >
                {EXPERIENCE_LEVELS.map((exp) => (
                  <option key={exp} value={exp}>
                    {exp}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <label style={{ fontSize: 12.5, fontWeight: 700, color: "#475569", marginBottom: 6, display: "block" }}>
            Leadership & Decision-Making Scope
          </label>
          <select
            className="r-input"
            value={leadershipScope}
            onChange={(e) => setLeadershipScope(e.target.value)}
            style={{ marginBottom: 14 }}
          >
            {LEADERSHIP_SCOPES.map((scope) => (
              <option key={scope} value={scope}>
                {scope}
              </option>
            ))}
          </select>

          <label style={{ fontSize: 12.5, fontWeight: 700, color: "#475569", marginBottom: 6, display: "block" }}>
            Core Responsibilities (Brief summary)
          </label>
          <input
            type="text"
            placeholder="e.g. Owning core API platform, managing 4 engineers, roadmap prioritisation"
            value={mainResponsibilities}
            onChange={(e) => setMainResponsibilities(e.target.value)}
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

      {/* STEP 2: Strengths & Capabilities */}
      {step === (isAuthenticated ? 2 : 2) && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <div className="ob-step-label">
            Step {displayStepNumber} of {totalSteps} · Strengths & Projects
          </div>
          <h1 className="ob-title">Existing strengths & expertise.</h1>
          <p className="ob-sub" style={{ marginBottom: 16 }}>
            Radar distinguishes claimed capabilities from demonstrated workplace results.
          </p>

          <label style={{ fontSize: 12.5, fontWeight: 700, color: "#475569", marginBottom: 6, display: "block" }}>
            Core Areas of Expertise (Select or add)
          </label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 16 }}>
            {[
              "System Architecture & Design",
              "Product Strategy & Roadmap",
              "Cross-Functional Team Leadership",
              "Financial Modelling & Budgeting",
              "Stakeholder Management",
              "Revenue Operations & Growth",
              "Data Engineering & Analytics",
              "Process Optimization & Lean",
            ].map((skill) => {
              const active = claimedStrengths.includes(skill);
              return (
                <button
                  key={skill}
                  className={`ob-tag-btn ${active ? "active" : ""}`}
                  onClick={() => setClaimedStrengths((prev) => toggleItem(prev, skill, 4))}
                >
                  {skill} {active ? "" : "+"}
                </button>
              );
            })}
          </div>

          <label style={{ fontSize: 12.5, fontWeight: 700, color: "#475569", marginBottom: 6, display: "block" }}>
            Major Projects Handled Successfully
          </label>
          <textarea
            placeholder="e.g. Migrated monolith to microservices; launched mobile app to 100k users; reduced AWS cloud spend by 22%"
            value={significantProjects}
            onChange={(e) => setSignificantProjects(e.target.value)}
            className="r-input"
            rows={2}
            style={{ marginBottom: 14, resize: "vertical" }}
          />

          <label style={{ fontSize: 12.5, fontWeight: 700, color: "#475569", marginBottom: 6, display: "block" }}>
            Key Certifications or Qualifications (Optional)
          </label>
          <input
            type="text"
            placeholder="e.g. AWS Solutions Architect, PMP, CFA Level II"
            value={certifications}
            onChange={(e) => setCertifications(e.target.value)}
            className="r-input"
          />

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

      {/* STEP 3: Career Goals */}
      {step === (isAuthenticated ? 3 : 3) && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <div className="ob-step-label">
            Step {displayStepNumber} of {totalSteps} · Objectives
          </div>
          <h1 className="ob-title">What outcome do you want to unlock?</h1>
          <p className="ob-sub" style={{ marginBottom: 16 }}>
            Select your top objectives. Radar will benchmark and evaluate your options against these goals.
          </p>

          <div className="ob-options" style={{ marginBottom: 16 }}>
            {CAREER_GOALS.map((goal) => {
              const active = selectedGoals.includes(goal);
              return (
                <button
                  key={goal}
                  className={`ob-option ${active ? "active" : ""}`}
                  style={{ padding: "11px 14px", fontSize: 13.5 }}
                  onClick={() => setSelectedGoals((prev) => toggleItem(prev, goal, 3))}
                >
                  <span>{goal}</span>
                  <span className="ob-option__check"><Icon name="check" /></span>
                </button>
              );
            })}
          </div>

          <div className="ob-actions">
            <button className="btn" onClick={handleBack}>
              Back
            </button>
            <button
              className="btn btn--primary"
              style={{ flex: 1 }}
              onClick={handleNext}
              disabled={selectedGoals.length === 0}
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: Constraints & Risk Tolerance */}
      {step === (isAuthenticated ? 4 : 4) && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <div className="ob-step-label">
            Step {displayStepNumber} of {totalSteps} · Constraints & Risk
          </div>
          <h1 className="ob-title">Risk tolerance & availability.</h1>
          <p className="ob-sub" style={{ marginBottom: 16 }}>
            Sometimes the best recommendation is to improve your current position rather than leave it.
          </p>

          <label style={{ fontSize: 12.5, fontWeight: 700, color: "#475569", marginBottom: 6, display: "block" }}>
            Appetite for Career Risk
          </label>
          <div className="ob-options" style={{ marginBottom: 16 }}>
            {RISK_TOLERANCES.map((risk) => (
              <button
                key={risk}
                className={`ob-option ${riskTolerance === risk ? "active" : ""}`}
                style={{ padding: "10px 14px", fontSize: 13 }}
                onClick={() => setRiskTolerance(risk)}
              >
                <span>{risk}</span>
                <span className="ob-option__check"><Icon name="check" /></span>
              </button>
            ))}
          </div>

          <label style={{ fontSize: 12.5, fontWeight: 700, color: "#475569", marginBottom: 6, display: "block" }}>
            Available Time for Upskilling & Decision Prep
          </label>
          <div className="ob-options" style={{ marginBottom: 14 }}>
            {TIME_AVAILABILITY.map((time) => (
              <button
                key={time}
                className={`ob-option ${availableTime === time ? "active" : ""}`}
                style={{ padding: "10px 14px", fontSize: 13 }}
                onClick={() => setAvailableTime(time)}
              >
                <span>{time}</span>
                <span className="ob-option__check"><Icon name="check" /></span>
              </button>
            ))}
          </div>

          <label style={{ display: "flex", alignItems: "center", gap: 10, background: "#f8fafc", padding: "11px 14px", borderRadius: 10, cursor: "pointer", marginBottom: 14 }}>
            <input
              type="checkbox"
              checked={maintainIncomePriority}
              onChange={(e) => setMaintainIncomePriority(e.target.checked)}
              style={{ width: 17, height: 17, accentColor: "#008c93" }}
            />
            <span style={{ fontSize: 13, color: "#334155" }}>
              Maintaining current income without disruption is a strict priority.
            </span>
          </label>

          <label style={{ fontSize: 12.5, fontWeight: 700, color: "#475569", marginBottom: 6, display: "block" }}>
            Preferred Location / Market
          </label>
          <input
            type="text"
            placeholder="e.g. Lagos, Nigeria or London, UK or Global Remote"
            value={targetLocation}
            onChange={(e) => setTargetLocation(e.target.value)}
            className="r-input"
          />

          <div className="ob-actions">
            <button className="btn" onClick={handleBack}>
              Back
            </button>
            <button className="btn btn--primary" style={{ flex: 1 }} onClick={handleNext}>
              Review Career Strategy →
            </button>
          </div>
        </div>
      )}

      {/* STEP 5: Personalised Professional Starter Plan */}
      {step === (isAuthenticated ? 5 : 5) && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <div className="ob-step-label">Ready to begin</div>
          <h1 className="ob-title" style={{ fontSize: "clamp(1.45rem, 3.8vw, 1.85rem)", marginBottom: 8 }}>
            Your Professional Decision Engine is ready.
          </h1>
          <p className="ob-sub" style={{ marginBottom: 16 }}>
            Radar opens on your highest-leverage career move: comparing realistic pathways, tracking demonstrated impact, and positioning your value for advancement.
          </p>

          <div className="ob-plan-card">
            <div className="ob-plan-badge"><Icon name="launch" /> Radar Career: Professional Track</div>
            <div className="ob-plan-hero">
              {role} · {industry}
            </div>

            <div className="ob-plan-item">
              <span className="ob-plan-item-icon"><Icon name="policy" /></span>
              <div>
                <strong style={{ color: "#f8fafc" }}>Decision Framework: </strong>
                Comparing Internal Promotion vs Lateral Move vs Advisory
              </div>
            </div>

            <div className="ob-plan-item">
              <span className="ob-plan-item-icon"><Icon name="job" /></span>
              <div>
                <strong style={{ color: "#f8fafc" }}>Core Objectives: </strong>
                {selectedGoals.join(" · ")}
              </div>
            </div>

            <div className="ob-plan-item">
              <span className="ob-plan-item-icon">⏱️</span>
              <div>
                <strong style={{ color: "#f8fafc" }}>Strategy: </strong>
                {availableTime} ({maintainIncomePriority ? "Income preserved" : "Open risk"})
              </div>
            </div>
          </div>

          <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 12, padding: "12px 14px", marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#166534", marginBottom: 2 }}>
              <Icon name="check" /> Career Decision Intelligence & Impact Tracker Primed
            </div>
            <div style={{ fontSize: 12.5, color: "#15803d", lineHeight: 1.45 }}>
              Your dashboard answers: <em>"What move would most improve my career position, and what should I do next?"</em> without generic courses or motivational fluff.
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
              {saving ? "Calibrating Professional Engine…" : "Enter Radar Career →"}
            </button>
          </div>
        </div>
      )}
    </OnboardingShell>
  );
}
