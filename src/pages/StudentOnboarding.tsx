import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { OnboardingShell } from "../components/OnboardingShell";
import { ApiError, completeOnboarding, register } from "../lib/api";
import { Icon } from "../components/Icon";

const ACADEMIC_LEVELS = [
  "Year 1 (Freshman)",
  "Year 2 (Sophomore)",
  "Year 3 (Penultimate)",
  "Year 4+ (Final Year)",
  "Masters / Postgraduate",
];

const FIELDS_OF_STUDY = [
  "Business & Management",
  "Computer Science & IT",
  "Economics & Finance",
  "Engineering",
  "Medicine & Health Sciences",
  "Law & Legal Studies",
  "Social Sciences",
  "Natural & Applied Sciences",
  "Arts & Humanities",
];

const ACADEMIC_GOALS = [
  "Improve grades & master difficult courses",
  "Graduate with First Class / Distinction",
  "Build practical skills & portfolio projects",
  "Secure competitive internships & scholarships",
];

const COMMON_DIFFICULT_COURSES = [
  "Statistics",
  "Calculus & Linear Algebra",
  "Financial Accounting",
  "Data Structures & Algorithms",
  "Micro / Macroeconomics",
  "Econometrics",
  "Organic Chemistry",
  "Physics for Engineers",
];

const CAREER_INTERESTS = [
  "Technology & AI",
  "Finance & Investment",
  "Consulting & Strategy",
  "Data & Analytics",
  "Product & Design",
  "Marketing & Growth",
  "Engineering & Robotics",
  "Healthcare & Biotech",
];

const PRACTICAL_SKILLS = [
  "Data Analysis (Excel, SQL, Python)",
  "Web Development (React, Fullstack)",
  "AI & Prompt Engineering",
  "Financial Modelling & Valuation",
  "Product Management",
  "Cybersecurity Fundamentals",
  "Academic Research & Technical Writing",
];

const STUDY_TIMES = [
  "30 - 45 mins / day",
  "1 - 2 hours / day",
  "2 - 3 hours / day",
  "Weekends intensive",
];

export function StudentOnboarding() {
  const navigate = useNavigate();
  const { isAuthenticated, signIn, refetchProfile } = useAuth();

  // If already authenticated, skip account step
  const [step, setStep] = useState(isAuthenticated ? 1 : 0);
  const totalSteps = isAuthenticated ? 5 : 6;

  // Account state (if unauth)
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Step 1: Academic Profile
  const [academicLevel, setAcademicLevel] = useState("Year 2 (Sophomore)");
  const [fieldOfStudy, setFieldOfStudy] = useState("Business & Management");
  const [customMajor, setCustomMajor] = useState("");
  const [institution, setInstitution] = useState("");

  // Step 2: Academic Goals & Weak Areas
  const [academicGoal, setAcademicGoal] = useState("Improve grades & master difficult courses");
  const [customGoal, setCustomGoal] = useState("");
  const [selectedDifficultCourses, setSelectedDifficultCourses] = useState<string[]>(["Statistics"]);
  const [customCourseInput, setCustomCourseInput] = useState("");
  const [examDeadline, setExamDeadline] = useState("Midterms in 4 weeks");

  // Step 3: Career Direction & Practical Skills
  const [selectedCareerInterests, setSelectedCareerInterests] = useState<string[]>(["Technology & AI"]);
  const [selectedPracticalSkills, setSelectedPracticalSkills] = useState<string[]>([
    "Data Analysis (Excel, SQL, Python)",
  ]);

  // Step 4: Rhythm & Notifications
  const [studyTime, setStudyTime] = useState("1 - 2 hours / day");
  const [notifWeekly, setNotifWeekly] = useState(true);
  const [notifExams, setNotifExams] = useState(true);
  const [notifOpportunities, setNotifOpportunities] = useState(true);

  // Submission state
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const effectiveField = customMajor.trim() || fieldOfStudy;
  const effectiveGoal = customGoal.trim() || academicGoal;

  const toggleArrayItem = (list: string[], item: string, maxItems = 4) => {
    if (list.includes(item)) {
      return list.filter((i) => i !== item);
    }
    if (list.length >= maxItems) return list;
    return [...list, item];
  };

  const addCustomCourse = () => {
    const trimmed = customCourseInput.trim();
    if (trimmed && !selectedDifficultCourses.includes(trimmed)) {
      setSelectedDifficultCourses([...selectedDifficultCourses, trimmed]);
      setCustomCourseInput("");
    }
  };

  const handleBack = () => {
    if ((!isAuthenticated && step === 0) || (isAuthenticated && step === 1)) {
      navigate("/onboarding");
      return;
    }
    setStep((s) => s - 1);
  };

  const handleNext = () => {
    setStep((s) => s + 1);
  };

  const handleFinish = async () => {
    setSaving(true);
    setErrorMsg(null);
    try {
      if (!isAuthenticated) {
        const authRes = await register(name.trim(), email.trim(), password);
        signIn(authRes.token);
      }

      const allInterests = Array.from(
        new Set([
          ...selectedCareerInterests,
          ...selectedPracticalSkills.map((s) => s.split(" ")[0]),
          effectiveField,
        ]),
      ).slice(0, 6);

      await completeOnboarding({
        persona: "Student",
        primaryGoal: effectiveGoal,
        region: "Africa",
        city: institution.trim() || "Campus",
        interests: allInterests,
        dominantInterests: selectedCareerInterests.slice(0, 2),
        interestContexts: allInterests.map((interest) => ({
          interest,
          goal: effectiveGoal,
          level: "Beginner",
          lens: `Academic focus in ${effectiveField}`,
        })),
        problems: [
          "I lack practical experience",
          "There's too much information",
          "I don't know which skills to learn",
        ],
        opportunityPreferences: ["Internships", "Scholarships", "Competitions", "Fellowships"],
        personaDetails: {
          level: academicLevel,
          fieldOfStudy: effectiveField,
          faculty: effectiveField,
          university: institution.trim() || "University",
          difficultCourses: selectedDifficultCourses.join(", "),
          careerInterests: selectedCareerInterests.join(", "),
          practicalSkills: selectedPracticalSkills.join(", "),
          availableStudyTime: studyTime,
          examDeadlines: examDeadline,
        },
        notifications: {
          weeklyBrief: notifWeekly,
          opportunityDeadlines: notifOpportunities,
          roadmapReminders: notifExams,
        },
      });

      await refetchProfile();
      navigate("/");
    } catch (err) {
      setErrorMsg(err instanceof ApiError ? err.message : "Failed to set up your Radar Student profile.");
      setSaving(false);
    }
  };

  // Helper for step display index
  const displayStepNumber = isAuthenticated ? step : step + 1;

  return (
    <OnboardingShell
      badge="Radar Student"
      stepNumber={step === (isAuthenticated ? 5 : 5) ? undefined : displayStepNumber}
      totalSteps={totalSteps}
      sideImage={
        step === 0
          ? "/images/marketing/account.jpg"
          : step === 1
          ? "/images/marketing/university.jpg"
          : step === 2
          ? "/images/marketing/learn.jpg"
          : step === 3
          ? "/images/marketing/career.jpg"
          : "/images/marketing/student.jpg"
      }
      sideEyebrow="Radar Student"
      sideCaption={
        step <= 1
          ? "Master your semester while building real-world proof of competence."
          : step === 2
          ? "Prioritising your hardest courses so exam season feels like second nature."
          : "Practical skills and high-impact internships matched to your exact major."
      }
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
      {/* STEP 0: Account (Unauth only) */}
      {!isAuthenticated && step === 0 && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <div className="ob-step-label">Step 1 of {totalSteps} · Account</div>
          <h1 className="ob-title">Create your student account.</h1>
          <p className="ob-sub" style={{ marginBottom: 20 }}>
            Save your semester courses, AI tutor chats, and custom study roadmaps.
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
            placeholder="University or personal email"
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

      {/* STEP 1: Academic Profile */}
      {step === (isAuthenticated ? 1 : 1) && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <div className="ob-step-label">
            Step {displayStepNumber} of {totalSteps} · Academic Profile
          </div>
          <h1 className="ob-title">What are you studying?</h1>
          <p className="ob-sub" style={{ marginBottom: 16 }}>
            Radar customises study guides, academic papers, and mentor prompts to your discipline.
          </p>

          <label style={{ fontSize: 12.5, fontWeight: 700, color: "#475569", marginBottom: 6, display: "block" }}>
            Academic Level
          </label>
          <div className="ob-options" style={{ marginBottom: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {ACADEMIC_LEVELS.map((lvl) => (
              <button
                key={lvl}
                className={`ob-option ${academicLevel === lvl ? "active" : ""}`}
                style={{ padding: "10px 12px", fontSize: 13 }}
                onClick={() => setAcademicLevel(lvl)}
              >
                <span>{lvl}</span>
                <span className="ob-option__check"><Icon name="check" /></span>
              </button>
            ))}
          </div>

          <label style={{ fontSize: 12.5, fontWeight: 700, color: "#475569", marginBottom: 6, display: "block" }}>
            Field of Study / Discipline
          </label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 10 }}>
            {FIELDS_OF_STUDY.map((field) => (
              <button
                key={field}
                className={`ob-tag-btn ${fieldOfStudy === field && !customMajor ? "active" : ""}`}
                onClick={() => {
                  setFieldOfStudy(field);
                  setCustomMajor("");
                }}
              >
                {field}
              </button>
            ))}
          </div>
          <input
            type="text"
            placeholder="Or type specific major (e.g. Business Administration, Biochemistry)"
            value={customMajor}
            onChange={(e) => setCustomMajor(e.target.value)}
            className="r-input"
            style={{ marginBottom: 14 }}
          />

          <label style={{ fontSize: 12.5, fontWeight: 700, color: "#475569", marginBottom: 6, display: "block" }}>
            Institution / University (Optional)
          </label>
          <input
            type="text"
            placeholder="e.g. University of Lagos, University of Nairobi"
            value={institution}
            onChange={(e) => setInstitution(e.target.value)}
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

      {/* STEP 2: Academic Goals & Difficult Courses */}
      {step === (isAuthenticated ? 2 : 2) && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <div className="ob-step-label">
            Step {displayStepNumber} of {totalSteps} · Goals & Weak Areas
          </div>
          <h1 className="ob-title">What are your hardest courses?</h1>
          <p className="ob-sub" style={{ marginBottom: 16 }}>
            Radar puts your toughest courses at the front of your roadmap so you conquer weak areas early.
          </p>

          <label style={{ fontSize: 12.5, fontWeight: 700, color: "#475569", marginBottom: 6, display: "block" }}>
            Primary Academic Goal
          </label>
          <div className="ob-options" style={{ marginBottom: 12 }}>
            {ACADEMIC_GOALS.map((goal) => (
              <button
                key={goal}
                className={`ob-option ${academicGoal === goal && !customGoal ? "active" : ""}`}
                style={{ padding: "10px 14px", fontSize: 13.5 }}
                onClick={() => {
                  setAcademicGoal(goal);
                  setCustomGoal("");
                }}
              >
                <span>{goal}</span>
                <span className="ob-option__check"><Icon name="check" /></span>
              </button>
            ))}
          </div>
          <input
            type="text"
            placeholder="Or enter your custom academic goal"
            value={customGoal}
            onChange={(e) => setCustomGoal(e.target.value)}
            className="r-input"
            style={{ marginBottom: 16 }}
          />

          <label style={{ fontSize: 12.5, fontWeight: 700, color: "#475569", marginBottom: 6, display: "block" }}>
            Select or add difficult courses to master:
          </label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 10 }}>
            {COMMON_DIFFICULT_COURSES.map((course) => {
              const active = selectedDifficultCourses.includes(course);
              return (
                <button
                  key={course}
                  className={`ob-tag-btn ${active ? "active" : ""}`}
                  onClick={() => setSelectedDifficultCourses((prev) => toggleArrayItem(prev, course, 5))}
                >
                  {course} {active ? "" : "+"}
                </button>
              );
            })}
          </div>

          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            <input
              type="text"
              placeholder="Add another course (e.g. Econometrics)"
              value={customCourseInput}
              onChange={(e) => setCustomCourseInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addCustomCourse();
                }
              }}
              className="r-input"
            />
            <button
              type="button"
              className="btn"
              onClick={addCustomCourse}
              disabled={!customCourseInput.trim()}
              style={{ flex: "none" }}
            >
              Add
            </button>
          </div>

          <label style={{ fontSize: 12.5, fontWeight: 700, color: "#475569", marginBottom: 6, display: "block" }}>
            Next Exam or Assessment Horizon
          </label>
          <select
            className="r-input"
            value={examDeadline}
            onChange={(e) => setExamDeadline(e.target.value)}
          >
            <option value="Midterms in 4 weeks">Midterms in ~4 weeks</option>
            <option value="Final exams this semester">Final exams at end of semester</option>
            <option value="Continuous assessments ongoing">Continuous tests & coursework</option>
            <option value="Long term preparation">Long term preparation</option>
          </select>

          <div className="ob-actions">
            <button className="btn" onClick={handleBack}>
              Back
            </button>
            <button
              className="btn btn--primary"
              style={{ flex: 1 }}
              onClick={handleNext}
              disabled={selectedDifficultCourses.length === 0}
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Career Direction & Practical Skills */}
      {step === (isAuthenticated ? 3 : 3) && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <div className="ob-step-label">
            Step {displayStepNumber} of {totalSteps} · Career & Practical Skills
          </div>
          <h1 className="ob-title">Build skills employers actually hire for.</h1>
          <p className="ob-sub" style={{ marginBottom: 16 }}>
            Pair theoretical coursework with tangible technical capabilities and portfolio projects.
          </p>

          <label style={{ fontSize: 12.5, fontWeight: 700, color: "#475569", marginBottom: 6, display: "block" }}>
            Target Career Direction (choose 1-3)
          </label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 18 }}>
            {CAREER_INTERESTS.map((interest) => {
              const active = selectedCareerInterests.includes(interest);
              return (
                <button
                  key={interest}
                  className={`ob-tag-btn ${active ? "active" : ""}`}
                  onClick={() => setSelectedCareerInterests((prev) => toggleArrayItem(prev, interest, 3))}
                >
                  {interest} {active ? "" : "+"}
                </button>
              );
            })}
          </div>

          <label style={{ fontSize: 12.5, fontWeight: 700, color: "#475569", marginBottom: 6, display: "block" }}>
            Practical Skills to Learn (choose 1-2)
          </label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 18 }}>
            {PRACTICAL_SKILLS.map((skill) => {
              const active = selectedPracticalSkills.includes(skill);
              return (
                <button
                  key={skill}
                  className={`ob-tag-btn ${active ? "active" : ""}`}
                  onClick={() => setSelectedPracticalSkills((prev) => toggleArrayItem(prev, skill, 2))}
                >
                  {skill} {active ? "" : "+"}
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
              disabled={selectedCareerInterests.length === 0 || selectedPracticalSkills.length === 0}
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: Rhythm & Notifications */}
      {step === (isAuthenticated ? 4 : 4) && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <div className="ob-step-label">
            Step {displayStepNumber} of {totalSteps} · Study Rhythm
          </div>
          <h1 className="ob-title">Fit learning into your schedule.</h1>
          <p className="ob-sub" style={{ marginBottom: 20 }}>
            Radar spaces out modules and review quizzes based on how much time you have.
          </p>

          <label style={{ fontSize: 12.5, fontWeight: 700, color: "#475569", marginBottom: 6, display: "block" }}>
            Daily Study Time
          </label>
          <div className="ob-options" style={{ marginBottom: 20 }}>
            {STUDY_TIMES.map((time) => (
              <button
                key={time}
                className={`ob-option ${studyTime === time ? "active" : ""}`}
                style={{ padding: "12px 14px", fontSize: 13.5 }}
                onClick={() => setStudyTime(time)}
              >
                <span>{time}</span>
                <span className="ob-option__check"><Icon name="check" /></span>
              </button>
            ))}
          </div>

          <label style={{ fontSize: 12.5, fontWeight: 700, color: "#475569", marginBottom: 8, display: "block" }}>
            Student Intelligence Alerts
          </label>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#f8fafc", padding: "12px 14px", borderRadius: 10, cursor: "pointer" }}>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: "#1e293b" }}>Weekly Student Brief</div>
                <div style={{ fontSize: 12, color: "#64748b" }}>Monday morning study priorities & opportunity radar</div>
              </div>
              <input
                type="checkbox"
                checked={notifWeekly}
                onChange={(e) => setNotifWeekly(e.target.checked)}
                style={{ width: 18, height: 18, accentColor: "#008c93" }}
              />
            </label>

            <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#f8fafc", padding: "12px 14px", borderRadius: 10, cursor: "pointer" }}>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: "#1e293b" }}>Weak Area & Exam Reminders</div>
                <div style={{ fontSize: 12, color: "#64748b" }}>Spaced repetition alerts for your difficult courses</div>
              </div>
              <input
                type="checkbox"
                checked={notifExams}
                onChange={(e) => setNotifExams(e.target.checked)}
                style={{ width: 18, height: 18, accentColor: "#008c93" }}
              />
            </label>

            <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#f8fafc", padding: "12px 14px", borderRadius: 10, cursor: "pointer" }}>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: "#1e293b" }}>Internships & Scholarships</div>
                <div style={{ fontSize: 12, color: "#64748b" }}>Closing alerts for student opportunities in your field</div>
              </div>
              <input
                type="checkbox"
                checked={notifOpportunities}
                onChange={(e) => setNotifOpportunities(e.target.checked)}
                style={{ width: 18, height: 18, accentColor: "#008c93" }}
              />
            </label>
          </div>

          <div className="ob-actions">
            <button className="btn" onClick={handleBack}>
              Back
            </button>
            <button className="btn btn--primary" style={{ flex: 1 }} onClick={handleNext}>
              Review Your Plan →
            </button>
          </div>
        </div>
      )}

      {/* STEP 5: Starter Plan & Personalised Experience */}
      {step === (isAuthenticated ? 5 : 5) && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <div className="ob-step-label">Ready to begin</div>
          <h1 className="ob-title" style={{ fontSize: "clamp(1.45rem, 3.8vw, 1.85rem)", marginBottom: 8 }}>
            Your Radar Student plan is calibrated.
          </h1>
          <p className="ob-sub" style={{ marginBottom: 16 }}>
            Every morning, Radar highlights what to study, what to practice, and what opportunities to pursue.
          </p>

          <div className="ob-plan-card">
            <div className="ob-plan-badge"><Icon name="energy" /> Personalised Student Plan</div>
            <div className="ob-plan-hero">
              {academicLevel.split(" ")[0]} · {effectiveField}
            </div>

            <div className="ob-plan-item">
              <span className="ob-plan-item-icon"><Icon name="goal" /></span>
              <div>
                <strong style={{ color: "#f8fafc" }}>Academic Weak Area: </strong>
                Prioritising <span style={{ color: "#38bdf8" }}>{selectedDifficultCourses.join(", ")}</span> first on your roadmap.
              </div>
            </div>

            <div className="ob-plan-item">
              <span className="ob-plan-item-icon"><Icon name="build" /></span>
              <div>
                <strong style={{ color: "#f8fafc" }}>Practical Skill Track: </strong>
                {selectedPracticalSkills.join(", ")}
              </div>
            </div>

            <div className="ob-plan-item">
              <span className="ob-plan-item-icon"><Icon name="job" /></span>
              <div>
                <strong style={{ color: "#f8fafc" }}>Career Trajectory: </strong>
                {selectedCareerInterests.join(", ")}
              </div>
            </div>

            <div className="ob-plan-item">
              <span className="ob-plan-item-icon">
                <Icon name="time" size={15} />
              </span>
              <div>
                <strong style={{ color: "#f8fafc" }}>Pace: </strong>
                {studyTime} ({examDeadline})
              </div>
            </div>
          </div>

          <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 12, padding: "12px 14px", marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#166534", marginBottom: 2 }}>
              <Icon name="check" /> AI Academic Mentor & Opportunity Radar Ready
            </div>
            <div style={{ fontSize: 12.5, color: "#15803d", lineHeight: 1.45 }}>
              Your syllabus concepts are primed in the AI Mentor with practice quizzes, and your feed is filtering academic papers and internships.
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
              {saving ? "Generating your student roadmap…" : "Enter Radar Student →"}
            </button>
          </div>
        </div>
      )}
    </OnboardingShell>
  );
}
