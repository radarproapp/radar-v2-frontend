import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { OnboardingShell } from "../components/OnboardingShell";
import { ApiError, completeOnboarding, register } from "../lib/api";
import { Icon } from "../components/Icon";

const QUALIFICATIONS = [
  "BSc / Bachelor of Science",
  "BA / Bachelor of Arts",
  "BEng / Engineering Degree",
  "HND / Higher National Diploma",
  "MSc / Masters Degree",
  "Other / Diploma",
];

const FIELDS_OF_STUDY = [
  "Economics & Finance",
  "Computer Science & Software",
  "Business & Management",
  "Electrical / Mechanical Engineering",
  "Mass Communication & Media",
  "Biological & Chemical Sciences",
  "Social Sciences & Policy",
  "Arts & Humanities",
];

const TARGET_ROLES = [
  "Junior Data Analyst",
  "Junior Software Engineer",
  "Business Operations Associate",
  "Junior Product Specialist",
  "Digital Marketing Analyst",
  "Financial / Investment Analyst",
  "Research Assistant",
  "Customer Success & Support Specialist",
];

const WORK_TYPES_ENJOYED = [
  "Analyzing data & spotting trends",
  "Building apps & writing code",
  "Solving operational bottlenecks",
  "Writing, communication & storytelling",
  "Project management & coordination",
  "User research & design",
];

const COMMON_SKILLS = [
  "Microsoft Excel & Spreadsheets",
  "SQL & Database Queries",
  "Python Programming",
  "Technical Writing & Research",
  "Data Visualization (Power BI / Tableau)",
  "Problem Solving & Critical Thinking",
  "Public Speaking & Presentation",
  "HTML / CSS / JavaScript",
];

const WORK_ARRANGEMENTS = ["Remote", "Hybrid", "On-site", "Any arrangement"];

const OPPORTUNITY_TYPES = [
  "Entry-level Full-time Roles",
  "Graduate Trainee Programmes",
  "Paid Internships",
  "Fellowships & Residencies",
  "Competitions & Hackathons",
];

const IMMEDIATE_PRIORITIES = [
  "Finding my first job",
  "Choosing a clear career direction",
  "Building practical, demonstrable skills",
  "Creating a verified portfolio / improving CV",
  "Preparing for technical & behavioural interviews",
  "Securing a competitive graduate trainee programme",
];

const AVAILABILITY_OPTIONS = [
  "5 - 10 hours / week (part-time)",
  "10 - 20 hours / week (dedicated)",
  "25+ hours / week (full-time job seeking)",
];

export function GraduateOnboarding() {
  const navigate = useNavigate();
  const { isAuthenticated, signIn, refetchProfile } = useAuth();

  const [step, setStep] = useState(isAuthenticated ? 1 : 0);
  const totalSteps = isAuthenticated ? 6 : 7;

  // Account (if unauth)
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Step 1: Education
  const [qualification, setQualification] = useState("BSc / Bachelor of Science");
  const [fieldOfStudy, setFieldOfStudy] = useState("Economics & Finance");
  const [customField, setCustomField] = useState("");
  const [relevantSubjects, setRelevantSubjects] = useState("Statistics, Econometrics, Microeconomics");
  const [graduationStatus, setGraduationStatus] = useState("Graduated 2025");
  const [university, setUniversity] = useState("");

  // Step 2: Career Interests
  const [selectedRoles, setSelectedRoles] = useState<string[]>(["Junior Data Analyst"]);
  const [workEnjoyed, setWorkEnjoyed] = useState<string[]>(["Analyzing data & spotting trends"]);
  const [isDecidingDirection, setIsDecidingDirection] = useState(false);

  // Step 3: Existing Skills & Evidence (Separating self-reported from demonstrated)
  const [selfReportedSkills, setSelfReportedSkills] = useState<string[]>([
    "Microsoft Excel & Spreadsheets",
    "SQL & Database Queries",
  ]);
  const [pastWorkEvidence, setPastWorkEvidence] = useState(
    "Final year research project analyzing consumer inflation data using Excel and survey results.",
  );
  const [existingPortfolio, setExistingPortfolio] = useState("");
  const [confidenceGaps, setConfidenceGaps] = useState("Technical interview coding tests and lack of commercial experience");

  // Step 4: Employment Preferences
  const [preferredLocation, setPreferredLocation] = useState("Lagos, Nigeria (or Remote)");
  const [workArrangement, setWorkArrangement] = useState("Hybrid");
  const [opportunityPrefs, setOpportunityPrefs] = useState<string[]>([
    "Entry-level Full-time Roles",
    "Graduate Trainee Programmes",
  ]);

  // Step 5: Immediate Priorities
  const [primaryPriority, setPrimaryPriority] = useState("Finding my first job");

  // Step 6: Availability
  const [availability, setAvailability] = useState("10 - 20 hours / week (dedicated)");

  // Submission
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const effectiveField = customField.trim() || fieldOfStudy;

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

      const primaryTargetRole = selectedRoles[0] || "Junior Data Analyst";
      const allInterests = Array.from(
        new Set([...selectedRoles, effectiveField, ...selfReportedSkills.map((s) => s.split(" ")[0])]),
      ).slice(0, 6);

      await completeOnboarding({
        persona: "Graduate",
        primaryGoal: primaryPriority,
        region: "Africa",
        city: preferredLocation,
        interests: allInterests,
        dominantInterests: selectedRoles.slice(0, 2),
        interestContexts: allInterests.map((interest) => ({
          interest,
          goal: primaryPriority,
          level: "Beginner",
          lens: `Graduate career pathway towards ${primaryTargetRole}`,
        })),
        problems: [confidenceGaps],
        opportunityPreferences: opportunityPrefs,
        personaDetails: {
          qualification,
          fieldOfStudy: effectiveField,
          university: university.trim() || "University",
          relevantSubjects,
          graduationStatus,
          targetRoles: selectedRoles.join(", "),
          primaryTargetRole,
          workEnjoyed: workEnjoyed.join(", "),
          isDecidingDirection: isDecidingDirection ? "true" : "false",
          selfReportedSkills: selfReportedSkills.join(", "),
          demonstratedSkills: "", // Initially empty until practical project is completed!
          pastWorkEvidence,
          existingPortfolio,
          confidenceGaps,
          preferredLocation,
          workArrangement,
          opportunityTypes: opportunityPrefs.join(", "),
          primaryPriority,
          availability,
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
      setErrorMsg(err instanceof ApiError ? err.message : "Failed to save your graduate career profile.");
      setSaving(false);
    }
  };

  const displayStepNumber = isAuthenticated ? step : step + 1;

  return (
    <OnboardingShell
      badge="Radar Career: Graduate"
      stepNumber={step === (isAuthenticated ? 6 : 6) ? undefined : displayStepNumber}
      totalSteps={totalSteps}
      sideImage={
        step === 0
          ? "/images/marketing/account.jpg"
          : step === 1
          ? "/images/marketing/university.jpg"
          : step === 2
          ? "/images/marketing/career.jpg"
          : step === 3
          ? "/images/marketing/learn.jpg"
          : step === 4
          ? "/images/marketing/region.jpg"
          : "/images/marketing/complete.jpg"
      }
      sideEyebrow="Radar Career for Graduates"
      sideCaption="Move from uncertainty into an evidence-based path towards employment."
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
          <h1 className="ob-title">Create your graduate account.</h1>
          <p className="ob-sub" style={{ marginBottom: 20 }}>
            Save your career pathways, practical project evidence, and verified opportunity applications.
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

      {/* STEP 1: Education */}
      {step === (isAuthenticated ? 1 : 1) && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <div className="ob-step-label">
            Step {displayStepNumber} of {totalSteps} · Education
          </div>
          <h1 className="ob-title">Your educational background.</h1>
          <p className="ob-sub" style={{ marginBottom: 16 }}>
            Radar links your academic discipline to realistic entry requirements and transferable skills.
          </p>

          <label style={{ fontSize: 12.5, fontWeight: 700, color: "#475569", marginBottom: 6, display: "block" }}>
            Qualification Level
          </label>
          <select
            className="r-input"
            value={qualification}
            onChange={(e) => setQualification(e.target.value)}
            style={{ marginBottom: 14 }}
          >
            {QUALIFICATIONS.map((q) => (
              <option key={q} value={q}>
                {q}
              </option>
            ))}
          </select>

          <label style={{ fontSize: 12.5, fontWeight: 700, color: "#475569", marginBottom: 6, display: "block" }}>
            Field of Study
          </label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 10 }}>
            {FIELDS_OF_STUDY.map((f) => (
              <button
                key={f}
                className={`ob-tag-btn ${fieldOfStudy === f && !customField ? "active" : ""}`}
                onClick={() => {
                  setFieldOfStudy(f);
                  setCustomField("");
                }}
              >
                {f}
              </button>
            ))}
          </div>
          <input
            type="text"
            placeholder="Or type specific discipline (e.g. Agricultural Economics)"
            value={customField}
            onChange={(e) => setCustomField(e.target.value)}
            className="r-input"
            style={{ marginBottom: 14 }}
          />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
            <div>
              <label style={{ fontSize: 12.5, fontWeight: 700, color: "#475569", marginBottom: 6, display: "block" }}>
                Graduation Status
              </label>
              <input
                type="text"
                placeholder="e.g. Graduated 2024 / NYSC"
                value={graduationStatus}
                onChange={(e) => setGraduationStatus(e.target.value)}
                className="r-input"
              />
            </div>
            <div>
              <label style={{ fontSize: 12.5, fontWeight: 700, color: "#475569", marginBottom: 6, display: "block" }}>
                University / Institution
              </label>
              <input
                type="text"
                placeholder="e.g. University of Ibadan"
                value={university}
                onChange={(e) => setUniversity(e.target.value)}
                className="r-input"
              />
            </div>
          </div>

          <label style={{ fontSize: 12.5, fontWeight: 700, color: "#475569", marginBottom: 6, display: "block" }}>
            Key Subjects or Academic Interests
          </label>
          <input
            type="text"
            placeholder="e.g. Econometrics, Applied Statistics, Research Methods"
            value={relevantSubjects}
            onChange={(e) => setRelevantSubjects(e.target.value)}
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

      {/* STEP 2: Career Interests */}
      {step === (isAuthenticated ? 2 : 2) && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <div className="ob-step-label">
            Step {displayStepNumber} of {totalSteps} · Career Interests
          </div>
          <h1 className="ob-title">What career directions interest you?</h1>
          <p className="ob-sub" style={{ marginBottom: 16 }}>
            Choose roles you are considering. You don't have to be completely certain yet.
          </p>

          <label style={{ fontSize: 12.5, fontWeight: 700, color: "#475569", marginBottom: 6, display: "block" }}>
            Roles or Industries Considering (Pick 1-3)
          </label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 16 }}>
            {TARGET_ROLES.map((role) => {
              const active = selectedRoles.includes(role);
              return (
                <button
                  key={role}
                  className={`ob-tag-btn ${active ? "active" : ""}`}
                  onClick={() => setSelectedRoles((prev) => toggleItem(prev, role, 3))}
                >
                  {role} {active ? "" : "+"}
                </button>
              );
            })}
          </div>

          <label style={{ fontSize: 12.5, fontWeight: 700, color: "#475569", marginBottom: 6, display: "block" }}>
            What types of work do you actually enjoy?
          </label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 16 }}>
            {WORK_TYPES_ENJOYED.map((w) => {
              const active = workEnjoyed.includes(w);
              return (
                <button
                  key={w}
                  className={`ob-tag-btn ${active ? "active" : ""}`}
                  onClick={() => setWorkEnjoyed((prev) => toggleItem(prev, w, 3))}
                >
                  {w} {active ? "" : "+"}
                </button>
              );
            })}
          </div>

          <label style={{ display: "flex", alignItems: "center", gap: 10, background: "#f8fafc", padding: "12px 14px", borderRadius: 10, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={isDecidingDirection}
              onChange={(e) => setIsDecidingDirection(e.target.checked)}
              style={{ width: 17, height: 17, accentColor: "#008c93" }}
            />
            <span style={{ fontSize: 13, color: "#334155" }}>
              I am still exploring and want Radar to recommend 3-5 plausible paths based on my background.
            </span>
          </label>

          <div className="ob-actions">
            <button className="btn" onClick={handleBack}>
              Back
            </button>
            <button
              className="btn btn--primary"
              style={{ flex: 1 }}
              onClick={handleNext}
              disabled={selectedRoles.length === 0 && !isDecidingDirection}
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Existing Skills & Evidence */}
      {step === (isAuthenticated ? 3 : 3) && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <div className="ob-step-label">
            Step {displayStepNumber} of {totalSteps} · Skills & Evidence
          </div>
          <h1 className="ob-title">Existing skills & evidence.</h1>
          <p className="ob-sub" style={{ marginBottom: 16 }}>
            Radar distinguishes self-reported skills from skills demonstrated through actual projects.
          </p>

          <label style={{ fontSize: 12.5, fontWeight: 700, color: "#475569", marginBottom: 6, display: "block" }}>
            Self-Reported Skills (Skills you believe you have)
          </label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 16 }}>
            {COMMON_SKILLS.map((skill) => {
              const active = selfReportedSkills.includes(skill);
              return (
                <button
                  key={skill}
                  className={`ob-tag-btn ${active ? "active" : ""}`}
                  onClick={() => setSelfReportedSkills((prev) => toggleItem(prev, skill, 5))}
                >
                  {skill} {active ? "" : "+"}
                </button>
              );
            })}
          </div>

          <label style={{ fontSize: 12.5, fontWeight: 700, color: "#475569", marginBottom: 6, display: "block" }}>
            Prior Work, Projects, or Coursework Evidence
          </label>
          <textarea
            placeholder="e.g. Final year research project on sales elasticity, student association treasurer, freelance writing"
            value={pastWorkEvidence}
            onChange={(e) => setPastWorkEvidence(e.target.value)}
            className="r-input"
            rows={2}
            style={{ marginBottom: 14, resize: "vertical" }}
          />

          <label style={{ fontSize: 12.5, fontWeight: 700, color: "#475569", marginBottom: 6, display: "block" }}>
            Existing Portfolio or GitHub Link (Optional)
          </label>
          <input
            type="text"
            placeholder="e.g. github.com/username or behance.net/username"
            value={existingPortfolio}
            onChange={(e) => setExistingPortfolio(e.target.value)}
            className="r-input"
            style={{ marginBottom: 14 }}
          />

          <label style={{ fontSize: 12.5, fontWeight: 700, color: "#475569", marginBottom: 6, display: "block" }}>
            Where do you currently lack confidence?
          </label>
          <input
            type="text"
            placeholder="e.g. Technical interview tests, lack of commercial experience"
            value={confidenceGaps}
            onChange={(e) => setConfidenceGaps(e.target.value)}
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

      {/* STEP 4: Employment Preferences */}
      {step === (isAuthenticated ? 4 : 4) && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <div className="ob-step-label">
            Step {displayStepNumber} of {totalSteps} · Preferences
          </div>
          <h1 className="ob-title">Employment preferences.</h1>
          <p className="ob-sub" style={{ marginBottom: 16 }}>
            Set location and work arrangement constraints so Radar filters genuine opportunities.
          </p>

          <label style={{ fontSize: 12.5, fontWeight: 700, color: "#475569", marginBottom: 6, display: "block" }}>
            Preferred Location / City
          </label>
          <input
            type="text"
            placeholder="e.g. Lagos, Nigeria or London, UK"
            value={preferredLocation}
            onChange={(e) => setPreferredLocation(e.target.value)}
            className="r-input"
            style={{ marginBottom: 16 }}
          />

          <label style={{ fontSize: 12.5, fontWeight: 700, color: "#475569", marginBottom: 6, display: "block" }}>
            Work Arrangement
          </label>
          <div className="ob-options" style={{ marginBottom: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {WORK_ARRANGEMENTS.map((arr) => (
              <button
                key={arr}
                className={`ob-option ${workArrangement === arr ? "active" : ""}`}
                style={{ padding: "10px 12px", fontSize: 13 }}
                onClick={() => setWorkArrangement(arr)}
              >
                <span>{arr}</span>
                <span className="ob-option__check"><Icon name="check" /></span>
              </button>
            ))}
          </div>

          <label style={{ fontSize: 12.5, fontWeight: 700, color: "#475569", marginBottom: 6, display: "block" }}>
            Types of Opportunities Sought
          </label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
            {OPPORTUNITY_TYPES.map((op) => {
              const active = opportunityPrefs.includes(op);
              return (
                <button
                  key={op}
                  className={`ob-tag-btn ${active ? "active" : ""}`}
                  onClick={() => setOpportunityPrefs((prev) => toggleItem(prev, op, 3))}
                >
                  {op} {active ? "" : "+"}
                </button>
              );
            })}
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

      {/* STEP 5: Priorities & Availability */}
      {step === (isAuthenticated ? 5 : 5) && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <div className="ob-step-label">
            Step {displayStepNumber} of {totalSteps} · Priorities & Time
          </div>
          <h1 className="ob-title">Immediate priorities & availability.</h1>
          <p className="ob-sub" style={{ marginBottom: 16 }}>
            We calibrate the daily workload and urgency to your current timeline.
          </p>

          <label style={{ fontSize: 12.5, fontWeight: 700, color: "#475569", marginBottom: 6, display: "block" }}>
            What is your most urgent priority right now?
          </label>
          <div className="ob-options" style={{ marginBottom: 16 }}>
            {IMMEDIATE_PRIORITIES.map((p) => (
              <button
                key={p}
                className={`ob-option ${primaryPriority === p ? "active" : ""}`}
                style={{ padding: "10px 14px", fontSize: 13.5 }}
                onClick={() => setPrimaryPriority(p)}
              >
                <span>{p}</span>
                <span className="ob-option__check"><Icon name="check" /></span>
              </button>
            ))}
          </div>

          <label style={{ fontSize: 12.5, fontWeight: 700, color: "#475569", marginBottom: 6, display: "block" }}>
            How much time can you realistically spend each week?
          </label>
          <div className="ob-options">
            {AVAILABILITY_OPTIONS.map((a) => (
              <button
                key={a}
                className={`ob-option ${availability === a ? "active" : ""}`}
                style={{ padding: "11px 14px", fontSize: 13.5 }}
                onClick={() => setAvailability(a)}
              >
                <span>{a}</span>
                <span className="ob-option__check"><Icon name="check" /></span>
              </button>
            ))}
          </div>

          <div className="ob-actions">
            <button className="btn" onClick={handleBack}>
              Back
            </button>
            <button className="btn btn--primary" style={{ flex: 1 }} onClick={handleNext}>
              Review Career Plan →
            </button>
          </div>
        </div>
      )}

      {/* STEP 6: Personalised Graduate Starter Plan */}
      {step === (isAuthenticated ? 6 : 6) && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <div className="ob-step-label">Ready to begin</div>
          <h1 className="ob-title" style={{ fontSize: "clamp(1.45rem, 3.8vw, 1.85rem)", marginBottom: 8 }}>
            Your Graduate Career Engine is configured.
          </h1>
          <p className="ob-sub" style={{ marginBottom: 16 }}>
            Radar opens on your daily career priority: choosing a target pathway, closing skill gaps with practical projects, and tracking verified opportunities.
          </p>

          <div className="ob-plan-card">
            <div className="ob-plan-badge"><Icon name="job" /> Radar Career: Graduate Track</div>
            <div className="ob-plan-hero">
              {qualification.split(" ")[0]} in {effectiveField}
            </div>

            <div className="ob-plan-item">
              <span className="ob-plan-item-icon"><Icon name="goal" /></span>
              <div>
                <strong style={{ color: "#f8fafc" }}>Target Role: </strong>
                {selectedRoles.join(", ")}
              </div>
            </div>

            <div className="ob-plan-item">
              <span className="ob-plan-item-icon"><Icon name="build" /></span>
              <div>
                <strong style={{ color: "#f8fafc" }}>Self-Reported Skills: </strong>
                {selfReportedSkills.join(", ")} (ready for project verification)
              </div>
            </div>

            <div className="ob-plan-item">
              <span className="ob-plan-item-icon">⏱️</span>
              <div>
                <strong style={{ color: "#f8fafc" }}>Weekly Commitment: </strong>
                {availability}
              </div>
            </div>
          </div>

          <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 12, padding: "12px 14px", marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#166534", marginBottom: 2 }}>
              <Icon name="check" /> Six-Part Action Plan Primed
            </div>
            <div style={{ fontSize: 12.5, color: "#15803d", lineHeight: 1.45 }}>
              Your dashboard answers: <em>"What is the most useful thing I can do for my career today?"</em> with guided project rubrics and verified role listings.
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
              {saving ? "Calibrating Graduate Dashboard…" : "Enter Radar Career →"}
            </button>
          </div>
        </div>
      )}
    </OnboardingShell>
  );
}
