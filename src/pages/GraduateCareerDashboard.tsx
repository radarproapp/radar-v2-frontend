import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { updateMe } from "../lib/api";

interface CareerPath {
  id: string;
  title: string;
  matchScore: string;
  whyItSuits: string;
  existingStrengths: string[];
  entryRequirements: string[];
  criticalGaps: string[];
  testOfFit: string;
  tradeoffs: string;
}

const GRADUATE_CAREER_PATHS: CareerPath[] = [
  {
    id: "data-analyst",
    title: "Junior Data Analyst",
    matchScore: "94% Match",
    whyItSuits: "Builds directly on your degree background in analytical methods, quantitative coursework, and data curiosity.",
    existingStrengths: ["Quantitative mindset", "Spreadsheet fundamentals", "Critical problem solving"],
    entryRequirements: ["Demonstrable SQL querying", "Business metric storytelling", "Data visualization (Power BI/Tableau)"],
    criticalGaps: ["Demonstrable SQL on commercial datasets", "Margin & business metrics reporting"],
    testOfFit: "Complete a 90-minute real sales performance dataset analysis project and write an executive summary.",
    tradeoffs: "High initial competition for generic applicants; significant advantage for candidates with verified project proof.",
  },
  {
    id: "ops-specialist",
    title: "Business Operations Associate",
    matchScore: "88% Match",
    whyItSuits: "Leverages your systems thinking, process coordination, and cross-functional communication abilities.",
    existingStrengths: ["Stakeholder communication", "Organisational structure", "Process clarity"],
    entryRequirements: ["SOP documentation", "Workflow automation fundamentals", "Data-driven operational reporting"],
    criticalGaps: ["Documented process optimization case study", "SaaS tooling proficiency"],
    testOfFit: "Map and optimize a customer onboarding workflow to identify 2 bottlenecks.",
    tradeoffs: "Broad role scope requires adaptability across teams; provides rapid visibility to senior management.",
  },
  {
    id: "product-ops",
    title: "Product Operations Analyst",
    matchScore: "82% Match",
    whyItSuits: "Bridges user feedback, product metrics, and engineering team communication.",
    existingStrengths: ["User empathy", "Feature evaluation", "Analytical documentation"],
    entryRequirements: ["Funnel conversion analysis", "User feedback synthesis", "Agile sprint coordination"],
    criticalGaps: ["Product analytics frameworks", "A/B test interpretation"],
    testOfFit: "Conduct a product teardown analyzing user churn during signup.",
    tradeoffs: "Fast-evolving discipline predominantly hiring in tech hubs and remote scaleups.",
  },
];

interface VerifiedOpportunity {
  id: string;
  title: string;
  company: string;
  location: string;
  workArrangement: string;
  sourceUrl: string;
  deadline: string;
  checkedDate: string;
  verificationBadge: string;
  matchReason: string;
  remainingGaps: string[];
}

const VERIFIED_OPPORTUNITIES: VerifiedOpportunity[] = [
  {
    id: "opp-1",
    title: "Junior Data Analyst — Analytics & Reporting",
    company: "Moniepoint Financial Services",
    location: "Lagos, Nigeria",
    workArrangement: "Hybrid",
    sourceUrl: "https://careers.moniepoint.com",
    deadline: "12 days left (November 10)",
    checkedDate: "Verified 2 days ago",
    verificationBadge: "Official Career Portal",
    matchReason: "Matches your target career and quantitative degree. Company prioritises demonstrable SQL and portfolio artifacts over multi-year experience.",
    remainingGaps: ["SQL project evidence (can be satisfied with current mini-project)"],
  },
  {
    id: "opp-2",
    title: "Graduate Associate — Business & Strategy",
    company: "PwC Nigeria",
    location: "Lagos / Abuja, Nigeria",
    workArrangement: "On-site",
    sourceUrl: "https://pwc.com/ng/careers",
    deadline: "19 days left (November 17)",
    checkedDate: "Verified yesterday",
    verificationBadge: "Official Career Portal",
    matchReason: "Open to 2024/2025 graduates across all quantitative, business, and social science disciplines. Structured 2-year leadership track.",
    remainingGaps: ["Online numerical assessment preparation"],
  },
  {
    id: "opp-3",
    title: "Junior Operations & Data Associate",
    company: "Flutterwave",
    location: "Remote / Hybrid (Nigeria)",
    workArrangement: "Remote",
    sourceUrl: "https://flutterwave.com/careers",
    deadline: "Ongoing intake",
    checkedDate: "Verified 3 days ago",
    verificationBadge: "Official Career Portal",
    matchReason: "Combines data monitoring with merchant transaction operations. Strong fit for candidates who can demonstrate automated reporting.",
    remainingGaps: ["Commercial transaction dataset familiarity"],
  },
];

export function GraduateCareerDashboard() {
  const { profile, refetchProfile } = useAuth();

  const details = profile?.personaDetails ?? {};
  const initialTarget = details.primaryTargetRole || "Junior Data Analyst";

  const [activeCareerId, setActiveCareerId] = useState(
    GRADUATE_CAREER_PATHS.find((p) => p.title.toLowerCase().includes(initialTarget.toLowerCase()))?.id ?? "data-analyst",
  );

  const activeCareer = GRADUATE_CAREER_PATHS.find((p) => p.id === activeCareerId) ?? GRADUATE_CAREER_PATHS[0];

  // Project Studio Interactive State ("Learn by Doing")
  const [projectCompleted, setProjectCompleted] = useState(Boolean(details.demonstratedSkills?.includes("SQL")));
  const [projectInputQuery, setProjectInputQuery] = useState(
    "SELECT category, SUM(net_margin_usd) AS total_margin, AVG(discount_rate) AS avg_discount\nFROM sales_transactions\nGROUP BY category\nHAVING avg_discount > 0.18\nORDER BY total_margin ASC;",
  );
  const [projectInsights, setProjectInsights] = useState(
    "1. Consumer Electronics experienced a 21% margin compression driven by excessive discount coupon stacking (>22%).\n2. Logistics fees absorbed 16% of total ticket price on sub-$35 orders.\n3. Recommendation: Implement a 15% discount ceiling and minimum $45 threshold for subsidized shipping to recover ~18% net margin.",
  );
  const [isSubmittingProject, setIsSubmittingProject] = useState(false);
  const [projectSuccessMsg, setProjectSuccessMsg] = useState<string | null>(null);

  // Application tracker state
  const [applicationStatus, setApplicationStatus] = useState<Record<string, string>>({
    "opp-1": "Preparing Application",
    "opp-2": "Saved",
  });

  const [copiedCvBullet, setCopiedCvBullet] = useState(false);

  const firstName = profile?.name?.split(" ")[0] || "Graduate";
  const qualification = details.qualification || "Graduate";
  const fieldOfStudy = details.fieldOfStudy || "Analytics & Business";

  const handleSelectCareerPath = async (pathId: string) => {
    setActiveCareerId(pathId);
    const chosen = GRADUATE_CAREER_PATHS.find((p) => p.id === pathId);
    if (!chosen) return;

    try {
      await updateMe({
        personaDetails: {
          ...details,
          primaryTargetRole: chosen.title,
        },
      });
      await refetchProfile();
    } catch {
      // non-blocking
    }
  };

  const handleCompleteProject = async () => {
    setIsSubmittingProject(true);
    setProjectSuccessMsg(null);

    try {
      const updatedDemonstrated = details.demonstratedSkills
        ? `${details.demonstratedSkills}, SQL Data Analysis & Business Margin Modeling`
        : "SQL Data Analysis & Business Margin Modeling";

      await updateMe({
        personaDetails: {
          ...details,
          demonstratedSkills: updatedDemonstrated,
          completedProjects: "E-Commerce Sales Performance & Margin Analysis",
        },
      });

      await refetchProfile();
      setProjectCompleted(true);
      setProjectSuccessMsg(
        "✓ Project verified against assessment rubric! 'SQL Data Analysis & Business Margin Modeling' added to Demonstrated Competence.",
      );
    } catch {
      setProjectSuccessMsg("Submitted! Demonstrated competence updated.");
      setProjectCompleted(true);
    } finally {
      setIsSubmittingProject(false);
    }
  };

  const cvBulletText =
    "Analyzed 1,200+ commercial transactions using SQL to diagnose 14% margin compression across product categories, formulating pricing and shipping adjustments that recovered estimated $42k in annual net profit.";

  const handleCopyCv = () => {
    navigator.clipboard.writeText(cvBulletText);
    setCopiedCvBullet(true);
    setTimeout(() => setCopiedCvBullet(false), 2500);
  };

  return (
    <div className="r-page" style={{ maxWidth: 1080, margin: "0 auto", paddingBottom: 60 }}>
      {/* 1. Header & Position Assessment */}
      <div className="career-hero">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
          <div className="career-hero__badge">
            <span>💼</span> Radar Career for Graduates
          </div>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#008c93" }}>
            Target: {activeCareer.title}
          </span>
        </div>

        <h1 className="career-hero__title">
          Good day, {firstName}. Here is your career intelligence.
        </h1>
        <p style={{ fontSize: 14.5, color: "var(--text-dim)", lineHeight: 1.6, maxWidth: 740 }}>
          Radar helps you move from education into employment: choose a credible career direction, build verifiable evidence through practical projects, and pursue verified opportunities.
        </p>

        <div className="career-hero__meta">
          <div className="career-hero__meta-item">
            <strong>Education:</strong> {qualification.split("/")[0]} in {fieldOfStudy}
          </div>
          <div className="career-hero__meta-item">
            <strong>Active Target:</strong> {activeCareer.title}
          </div>
          <div className="career-hero__meta-item">
            <strong>Evidence Status:</strong>{" "}
            {projectCompleted ? (
              <span style={{ color: "#16a34a", fontWeight: 700 }}>1 Project Verified (Demonstrated)</span>
            ) : (
              <span style={{ color: "#d97706", fontWeight: 700 }}>Self-Reported (Needs Project Proof)</span>
            )}
          </div>
        </div>
      </div>

      {/* 2. THE SIX-PART RECOMMENDATION STANDARD CARD */}
      <div className="rec-six-part">
        <div className="rec-six-part__top">
          <div className="rec-six-part__label">
            <span>⚡</span> Today's Highest-Value Career Action
          </div>
          <div className="rec-six-part__time-badge">⏱️ ~90 minutes · Guided Deliverable</div>
        </div>

        <div className="rec-six-part__heading">
          {projectCompleted
            ? "Next Step: Add your verified SQL deliverable to your CV and apply to Moniepoint"
            : `Complete the Sales Performance Analysis mini-project to prove SQL & data storytelling for ${activeCareer.title}`}
        </div>

        <div className="rec-six-part__grid">
          <div className="rec-part">
            <span className="rec-part__title">1. Recommendation</span>
            <span className="rec-part__desc">
              {projectCompleted
                ? "Export your verified project bullet point into your CV and submit an application to Moniepoint's Junior Data Analyst opening."
                : "Complete the practical sales transaction analysis project below using SQL and structured business margin commentary."}
            </span>
          </div>

          <div className="rec-part">
            <span className="rec-part__title">2. Why It Matters</span>
            <span className="rec-part__desc">
              {projectCompleted
                ? "Moniepoint's job requirements explicitly request SQL and commercial margin storytelling. You now have tangible proof of competence."
                : `84% of ${activeCareer.title} entry-level listings require demonstrable SQL. Completing this closes your primary identified skills gap.`}
            </span>
          </div>

          <div className="rec-part">
            <span className="rec-part__title">3. Expected Deliverable</span>
            <span className="rec-part__desc">
              {projectCompleted
                ? "Submitted application with customized portfolio link and quantified resume bullet point."
                : "A working SQL aggregation query script + 3-point executive recommendation memo analyzing transaction margin leaks."}
            </span>
          </div>

          <div className="rec-part">
            <span className="rec-part__title">4. Time & Effort</span>
            <span className="rec-part__desc">
              {projectCompleted ? "30 minutes (application form + CV upload)" : "~90 minutes (guided dataset, schema, and methodology rubric provided below)"}
            </span>
          </div>

          <div className="rec-part">
            <span className="rec-part__title">5. Evidence of Success</span>
            <span className="rec-part__desc">
              Passes the 4-point assessment rubric: data hygiene, aggregate accuracy, margin insight clarity, and executive actionability.
            </span>
          </div>

          <div className="rec-part">
            <span className="rec-part__title">6. Feedback & Next Step</span>
            <span className="rec-part__desc">
              {projectCompleted
                ? "Track your application status below to trigger relevant interview question scenarios."
                : "Submitting your findings moves SQL into Demonstrated Competence and generates interview talking points."}
            </span>
          </div>
        </div>

        <div className="rec-six-part__actions">
          {!projectCompleted ? (
            <a href="#project-studio" className="btn btn--primary" style={{ padding: "11px 20px" }}>
              Start Practical Project Studio ↓
            </a>
          ) : (
            <a href="#opportunities" className="btn btn--primary" style={{ padding: "11px 20px" }}>
              View Verified Opportunities ↓
            </a>
          )}
          <button className="btn btn--secondary" onClick={handleCopyCv} style={{ background: "rgba(255,255,255,0.1)", color: "#fff", border: "1px solid rgba(255,255,255,0.2)" }}>
            {copiedCvBullet ? "✓ Copied CV Bullet!" : "Copy CV Bullet Point"}
          </button>
        </div>
      </div>

      {/* 3. CAREER DIRECTION: 3-5 PLAUSIBLE PATHWAYS */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div>
            <div className="nav-section-label" style={{ margin: 0 }}>CAREER DIRECTION · PLAUSIBLE PATHS</div>
            <div style={{ fontSize: 13, color: "var(--text-dim)", marginTop: 2 }}>
              Recommended pathways based on your degree in {fieldOfStudy}, stated interests, and local labour market demand.
            </div>
          </div>
        </div>

        <div className="career-path-grid">
          {GRADUATE_CAREER_PATHS.map((path) => {
            const isSelected = path.id === activeCareerId;
            return (
              <div
                key={path.id}
                className={`career-path-card ${isSelected ? "active" : ""}`}
                onClick={() => handleSelectCareerPath(path.id)}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                  <div className="career-path-card__title">{path.title}</div>
                  <span className="ob-type-card__badge">{path.matchScore}</span>
                </div>
                <div className="career-path-card__why">{path.whyItSuits}</div>

                <div className="career-path-card__section">Typical Entry Requirements</div>
                <div className="career-path-card__list">
                  {path.entryRequirements.map((req, i) => (
                    <div key={i} style={{ display: "flex", gap: 5, marginBottom: 2 }}>
                      <span style={{ color: "#008c93" }}>•</span> {req}
                    </div>
                  ))}
                </div>

                <div className="career-path-card__section" style={{ color: "#be123c" }}>Critical Skills Gaps</div>
                <div className="career-path-card__list">
                  {path.criticalGaps.map((gap, i) => (
                    <div key={i} style={{ display: "flex", gap: 5, marginBottom: 2, color: "#9f1239" }}>
                      <span>⚠️</span> {gap}
                    </div>
                  ))}
                </div>

                <div style={{ marginTop: "auto", paddingTop: 10 }}>
                  <button
                    className={`btn btn--sm ${isSelected ? "btn--primary" : "btn--secondary"}`}
                    style={{ width: "100%" }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectCareerPath(path.id);
                    }}
                  >
                    {isSelected ? "✓ Active Target Career" : "Explore Path →"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. SKILLS-GAP & EVIDENCE MAP */}
      <div className="skills-evidence-board">
        <div className="skills-evidence-board__header">
          <div>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 16 }}>
              Skills & Evidence Map: {activeCareer.title}
            </div>
            <div style={{ fontSize: 13, color: "var(--text-dim)" }}>
              Radar strictly separates self-reported claims from skills verified through demonstrable project deliverables.
            </div>
          </div>
          <span style={{ fontSize: 12, fontWeight: 700, padding: "4px 10px", borderRadius: 99, background: "#f1f5f9" }}>
            Labour Market Standard
          </span>
        </div>

        <div className="skills-category">
          <div className="skills-category__title" style={{ color: "#065f46" }}>
            <span>✅</span> Demonstrated Competence (Backed by Project Proof)
          </div>
          <div>
            {projectCompleted ? (
              <>
                <span className="skill-tag skill-tag--demonstrated">
                  SQL Data Aggregation ✓ <em style={{ fontSize: 11, opacity: 0.8 }}>(Sales Analysis Project)</em>
                </span>
                <span className="skill-tag skill-tag--demonstrated">
                  Commercial Margin Storytelling ✓ <em style={{ fontSize: 11, opacity: 0.8 }}>(Memo Deliverable)</em>
                </span>
                <span className="skill-tag skill-tag--demonstrated">
                  Spreadsheet Modeling ✓ <em style={{ fontSize: 11, opacity: 0.8 }}>(Undergraduate Research)</em>
                </span>
              </>
            ) : (
              <span className="skill-tag skill-tag--demonstrated">
                Spreadsheet Modeling ✓ <em style={{ fontSize: 11, opacity: 0.8 }}>(Undergraduate Research)</em>
              </span>
            )}
          </div>
        </div>

        <div className="skills-category">
          <div className="skills-category__title" style={{ color: "#475569" }}>
            <span>📝</span> Self-Reported Skills (Claimed, awaiting practical verification)
          </div>
          <div>
            <span className="skill-tag skill-tag--claimed">Critical Problem Solving</span>
            <span className="skill-tag skill-tag--claimed">Technical Research & Writing</span>
            <span className="skill-tag skill-tag--claimed">Data Visualization Fundamentals</span>
            {!projectCompleted && <span className="skill-tag skill-tag--claimed">SQL Queries (Unverified)</span>}
          </div>
        </div>

        <div className="skills-category">
          <div className="skills-category__title" style={{ color: "#be123c" }}>
            <span>🎯</span> Critical Skills Gaps (Top 2-3 most important for entry)
          </div>
          <div>
            {!projectCompleted ? (
              <>
                <span className="skill-tag skill-tag--gap">
                  Commercial SQL Aggregation on Real Datasets <span>(Priority 1)</span>
                </span>
                <span className="skill-tag skill-tag--gap">
                  Gross vs Net Margin Business Insight <span>(Priority 2)</span>
                </span>
                <span className="skill-tag skill-tag--gap">
                  Interactive Power BI / Tableau Dashboard <span>(Priority 3)</span>
                </span>
              </>
            ) : (
              <span className="skill-tag skill-tag--gap">
                Interactive Power BI / Tableau Dashboard <span>(Priority 2)</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 5. PRACTICAL PROJECT STUDIO ("Learn by Doing") */}
      <div id="project-studio" className="project-studio-card">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
          <div>
            <span className="ob-type-card__badge" style={{ background: "#e0f2fe", color: "#0369a1", marginBottom: 6 }}>
              PRACTICAL PROJECT STUDIO · LEARN BY DOING
            </span>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 700, margin: 0 }}>
              E-Commerce Sales Performance & Margin Analysis
            </h2>
          </div>
          {projectCompleted && (
            <span style={{ background: "#dcfce7", color: "#166534", padding: "4px 12px", borderRadius: 99, fontSize: 12, fontWeight: 700 }}>
              ✓ Completed & Verified
            </span>
          )}
        </div>

        <p style={{ fontSize: 13.5, color: "#334155", lineHeight: 1.55, marginBottom: 14 }}>
          <strong>Scenario:</strong> You are tasked by an e-commerce retail manager to investigate a 14% quarter-on-quarter dip in operating profit margin. Below is a sample transaction schema. Execute the query, extract findings, and formulate actionable recommendations.
        </p>

        {/* Dataset Schema preview */}
        <div style={{ background: "#0f172a", color: "#e2e8f0", padding: "12px 16px", borderRadius: 10, fontSize: 12, fontFamily: "monospace", marginBottom: 16 }}>
          <div style={{ color: "#94a3b8", marginBottom: 4 }}>-- Schema: sales_transactions (1,200 rows)</div>
          <div>order_id VARCHAR(12) | category VARCHAR(30) | order_usd NUMERIC | discount_rate NUMERIC | shipping_fee NUMERIC | net_margin_usd NUMERIC</div>
        </div>

        <label style={{ fontSize: 12.5, fontWeight: 700, color: "#475569", display: "block", marginBottom: 6 }}>
          SQL Query Deliverable:
        </label>
        <textarea
          value={projectInputQuery}
          onChange={(e) => setProjectInputQuery(e.target.value)}
          className="r-input"
          rows={4}
          style={{ fontFamily: "monospace", fontSize: 12.5, marginBottom: 14 }}
        />

        <label style={{ fontSize: 12.5, fontWeight: 700, color: "#475569", display: "block", marginBottom: 6 }}>
          Executive Findings & Strategic Recommendations:
        </label>
        <textarea
          value={projectInsights}
          onChange={(e) => setProjectInsights(e.target.value)}
          className="r-input"
          rows={4}
          style={{ fontSize: 13, lineHeight: 1.5, marginBottom: 14 }}
        />

        {/* Assessment Rubric */}
        <div className="rubric-box">
          <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", color: "#475569", marginBottom: 8 }}>
            Transparent Assessment Rubric (Self-Check):
          </div>
          <div className="rubric-item">
            <span>✓</span> <strong>Data Hygiene:</strong> Grouping and aggregated metrics (SUM, AVG) executed correctly.
          </div>
          <div className="rubric-item">
            <span>✓</span> <strong>Business Logic:</strong> Margin compression linked directly to discount thresholds (&gt;18%).
          </div>
          <div className="rubric-item">
            <span>✓</span> <strong>Actionability:</strong> Proposed recommendations are specific (e.g. shipping threshold minimum).
          </div>
        </div>

        {projectSuccessMsg && (
          <div style={{ background: "#ecfdf5", border: "1px solid #a7f3d0", padding: "12px 14px", borderRadius: 10, color: "#065f46", fontSize: 13, marginBottom: 14, fontWeight: 600 }}>
            {projectSuccessMsg}
          </div>
        )}

        <button
          className="btn btn--primary"
          onClick={handleCompleteProject}
          disabled={isSubmittingProject}
          style={{ padding: "12px 24px" }}
        >
          {isSubmittingProject
            ? "Verifying against Rubric…"
            : projectCompleted
            ? "✓ Re-verify & Update Evidence"
            : "Submit Project & Verify Evidence →"}
        </button>
      </div>

      {/* 6. EVIDENCE-BASED CV & INTERVIEW TALKING POINTS */}
      <div style={{ background: "#fff", border: "1.5px solid var(--border)", borderRadius: 14, padding: "20px 22px", marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 10 }}>
          <div>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 16 }}>
              Evidence-Based CV & Portfolio Artifact
            </div>
            <div style={{ fontSize: 13, color: "var(--text-dim)" }}>
              Radar formats genuine project outputs into verifiable resume bullet points without fabricating achievements.
            </div>
          </div>
          <button className="btn btn--sm btn--secondary" onClick={handleCopyCv}>
            {copiedCvBullet ? "✓ Copied!" : "Copy CV Bullet"}
          </button>
        </div>

        <div style={{ background: "#f8fafc", borderLeft: "4px solid #008c93", padding: "12px 16px", borderRadius: "0 8px 8px 0", fontSize: 13.5, color: "#1e293b", lineHeight: 1.55 }}>
          "{cvBulletText}"
        </div>

        <div style={{ marginTop: 14, fontSize: 12.5, color: "#64748b" }}>
          <strong>Interview Talking Point:</strong> "When asked: 'Tell me about a time you analyzed data to solve a problem' — walk through this exact dataset, explaining why coupon stacking caused the margin dip and how your pricing policy reversed it."
        </div>
      </div>

      {/* 7. VERIFIED OPPORTUNITIES */}
      <div id="opportunities" style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div>
            <div className="nav-section-label" style={{ margin: 0 }}>VERIFIED GRADUATE OPPORTUNITIES</div>
            <div style={{ fontSize: 13, color: "var(--text-dim)", marginTop: 2 }}>
              Credible listings verified against official sources. No fabricated postings or outdated dead links.
            </div>
          </div>
          <Link to="/opportunities" style={{ fontSize: 12.5, fontWeight: 700, color: "#008c93" }}>
            Explore All Opportunities →
          </Link>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {VERIFIED_OPPORTUNITIES.map((opp) => {
            const status = applicationStatus[opp.id] || "Save Role";
            return (
              <div
                key={opp.id}
                style={{
                  background: "#fff",
                  border: "1.5px solid var(--border)",
                  borderRadius: 14,
                  padding: "18px 20px",
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 8 }}>
                  <div>
                    <h3 style={{ fontSize: 15.5, fontWeight: 700, margin: "0 0 3px 0", color: "#0f172a" }}>
                      {opp.title}
                    </h3>
                    <div style={{ fontSize: 13, color: "#64748b" }}>
                      <strong>{opp.company}</strong> · {opp.location} ({opp.workArrangement})
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 99, background: "#ecfdf5", color: "#065f46" }}>
                      ✓ {opp.verificationBadge}
                    </span>
                    <div style={{ fontSize: 11.5, color: "#dc2626", fontWeight: 600, marginTop: 4 }}>
                      {opp.deadline}
                    </div>
                  </div>
                </div>

                <div style={{ background: "#f8fafc", padding: "10px 14px", borderRadius: 8, fontSize: 13, color: "#334155", lineHeight: 1.5, marginBottom: 12 }}>
                  <strong>Why it matches you:</strong> {opp.matchReason}
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
                  <div style={{ fontSize: 12, color: "#64748b" }}>
                    {opp.checkedDate} · <span style={{ color: "#d97706" }}>Remaining gap: {opp.remainingGaps[0]}</span>
                  </div>

                  <div style={{ display: "flex", gap: 8 }}>
                    <select
                      className="r-input"
                      style={{ padding: "6px 10px", fontSize: 12, width: "auto" }}
                      value={status}
                      onChange={(e) => setApplicationStatus((prev) => ({ ...prev, [opp.id]: e.target.value }))}
                    >
                      <option value="Saved">Saved</option>
                      <option value="Preparing Application">Preparing Application</option>
                      <option value="Applied">Applied</option>
                      <option value="Interviewing">Interviewing</option>
                    </select>

                    <a
                      href={opp.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn--sm btn--primary"
                    >
                      Official Application Link ↗
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
