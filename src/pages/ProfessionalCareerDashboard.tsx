import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { updateMe } from "../lib/api";

interface CareerDecisionOption {
  id: string;
  title: string;
  category: string;
  badge: string;
  benefits: string;
  costsEffort: string;
  timeHorizon: string;
  requirements: string[];
  risks: string;
  nextStep: string;
}

const CAREER_DECISIONS: CareerDecisionOption[] = [
  {
    id: "internal-promotion",
    title: "Option A: Internal Promotion to Senior/Director",
    category: "Internal Advancement",
    badge: "Recommended: Low Risk",
    benefits: "Leverage existing political capital and internal trust. 20-30% salary increase without probation or cultural reset.",
    costsEffort: "Executive sponsor alignment, cross-department visibility initiative (~3 hrs/week).",
    timeHorizon: "4 - 6 months (aligned with annual review cycle)",
    requirements: ["Quantified P&L / operational impact", "Executive sponsor sponsorship", "Identified team successor"],
    risks: "Subject to annual executive headcount budget limits and departmental restructuring.",
    nextStep: "Draft an Executive Value Memorandum detailing recent quantifiable business outcomes for your VP.",
  },
  {
    id: "lateral-scaleup",
    title: "Option B: Strategic Lateral Move to Tier-1 Scaleup",
    category: "External Mobility",
    badge: "High Growth",
    benefits: "35-50% compensation increase, significant equity allocation, broader strategic mandate.",
    costsEffort: "Intensive executive interview loops, external networking, 3-month ramp-up time.",
    timeHorizon: "3 - 5 months",
    requirements: ["Demonstrable track record of multi-team delivery", "Strong market positioning", "Refined executive CV"],
    risks: "Probation risk, company burn rate vulnerability, longer working hours during onboarding.",
    nextStep: "Target 3 verified growth-stage scaleups and initiate warm introduction conversations.",
  },
  {
    id: "fractional-advisory",
    title: "Option C: Fractional Advisory & Independent Consulting",
    category: "Independent Income",
    badge: "Parallel Income",
    benefits: "Diversified secondary income ($1,500 - $3,500/month), increased industry authority and network depth.",
    costsEffort: "Client acquisition, legal retainer agreements, 4-6 weekend hours per month.",
    timeHorizon: "2 - 3 months to first client",
    requirements: ["Documented advisory case studies", "Packaged consulting proposal framework", "Industry visibility"],
    risks: "Time management discipline needed to avoid conflicts with your primary full-time responsibilities.",
    nextStep: "Package your core domain expertise into a 3-part diagnostic advisory sprint.",
  },
];

interface ImpactRecord {
  id: string;
  title: string;
  situation: string;
  role: string;
  action: string;
  result: string;
  metricBadge: string;
  evidenceLink: string;
}

interface SeniorOpportunity {
  id: string;
  title: string;
  organisation: string;
  location: string;
  workArrangement: string;
  compensationBand: string;
  sourceUrl: string;
  deadline: string;
  checkedDate: string;
  verificationBadge: string;
  fitExplanation: string;
  strategicGaps: string[];
}

const SENIOR_OPPORTUNITIES: SeniorOpportunity[] = [
  {
    id: "sr-1",
    title: "Director of Product / Head of Strategy",
    organisation: "Kuda Microfinance Bank",
    location: "Lagos, Nigeria / London, UK",
    workArrangement: "Hybrid",
    compensationBand: "Tier-1 Executive Band + Performance Bonus",
    sourceUrl: "https://kuda.com/careers",
    deadline: "Open until filled (Checked 2 days ago)",
    checkedDate: "Verified 2 days ago",
    verificationBadge: "Official Executive Board",
    fitExplanation: "Matches your fintech industry tenure and cross-functional leadership scope. Requires demonstrable experience scaling transaction volumes.",
    strategicGaps: ["Cross-border regulatory licensing exposure"],
  },
  {
    id: "sr-2",
    title: "Executive Fellow — Technology & Emerging Markets",
    organisation: "African Leadership University / Mastercard Foundation",
    location: "Regional / Remote",
    workArrangement: "Remote (Advisory Fellowship)",
    compensationBand: "Annual Advisory Stipend + Travel",
    sourceUrl: "https://alueducation.com",
    deadline: "Closing December 1st",
    checkedDate: "Verified 3 days ago",
    verificationBadge: "Official Fellowship Portal",
    fitExplanation: "Prestigious fellowship designed for mid-to-senior leaders to publish policy papers and mentor rising talent.",
    strategicGaps: ["Published industry thought piece"],
  },
];

export function ProfessionalCareerDashboard() {
  const { profile, refetchProfile } = useAuth();

  const details = profile?.personaDetails ?? {};
  const currentRole = details.role || "Senior Product Lead";
  const currentIndustry = details.industry || "Technology & Software";
  const currentExperience = details.experience || "5-8 years";
  const currentLeadership = details.leadershipScope || "Team Lead (3-8 people)";
  const currentRisk = details.riskTolerance || "Low risk: internal advancement";

  // Decision state
  const [activeDecisionId, setActiveDecisionId] = useState(
    details.activeCareerDecision?.includes("Option B")
      ? "lateral-scaleup"
      : details.activeCareerDecision?.includes("Option C")
      ? "fractional-advisory"
      : "internal-promotion",
  );

  const activeDecision = CAREER_DECISIONS.find((d) => d.id === activeDecisionId) ?? CAREER_DECISIONS[0];

  // Impact Tracker State
  const [impactRecords, setImpactRecords] = useState<ImpactRecord[]>([
    {
      id: "imp-1",
      title: "Core Platform Latency Optimization & Checkout Overhaul",
      situation: "Legacy payment service experienced checkout timeouts during peak commercial traffic, causing transaction abandonment.",
      role: "Lead Project Driver & Product Architect",
      action: "Led cross-functional team of 5 engineers to re-architect API caching layers and simplify multi-step mobile checkout.",
      result: "Reduced checkout latency by 35% and recovered an estimated $180k in annual abandoned transaction revenue.",
      metricBadge: "$180k Revenue Supported",
      evidenceLink: "Internal Analytics Dashboard #412",
    },
    {
      id: "imp-2",
      title: "Cross-Departmental Cloud Infrastructure Right-Sizing",
      situation: "Underutilized compute clusters and unmonitored test instances caused 28% annual budget overrun.",
      role: "Department Lead & Budget Contributor",
      action: "Initiated automated teardown policies and negotiated reserve capacity pricing with cloud vendors.",
      result: "Cut monthly operational expenditure by 22% ($45k annual recurring savings) with zero service disruption.",
      metricBadge: "$45k Recurring Savings",
      evidenceLink: "Q3 Finance Audit Report",
    },
  ]);

  // Form to add new impact record
  const [showAddImpact, setShowAddImpact] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newSituation, setNewSituation] = useState("");
  const [newAction, setNewAction] = useState("");
  const [newResult, setNewResult] = useState("");
  const [newMetric, setNewMetric] = useState("");
  const [newEvidence, setNewEvidence] = useState("");
  const [isSavingImpact, setIsSavingImpact] = useState(false);

  const [copiedId, setCopiedId] = useState<string | null>(null);

  const firstName = profile?.name?.split(" ")[0] || "Leader";

  const handleSelectDecision = async (id: string) => {
    setActiveDecisionId(id);
    const chosen = CAREER_DECISIONS.find((d) => d.id === id);
    if (!chosen) return;

    try {
      await updateMe({
        personaDetails: {
          ...details,
          activeCareerDecision: chosen.title,
        },
      });
      await refetchProfile();
    } catch {
      // non-blocking
    }
  };

  const handleSaveImpact = async () => {
    if (!newTitle.trim() || !newResult.trim()) return;
    setIsSavingImpact(true);

    const record: ImpactRecord = {
      id: `imp-${Date.now()}`,
      title: newTitle.trim(),
      situation: newSituation.trim() || "Operational inefficiency addressed.",
      role: currentRole,
      action: newAction.trim() || "Executed strategic restructuring.",
      result: newResult.trim(),
      metricBadge: newMetric.trim() || "Measurable Impact",
      evidenceLink: newEvidence.trim() || "Internal Documentation",
    };

    const updated = [record, ...impactRecords];
    setImpactRecords(updated);

    try {
      await updateMe({
        personaDetails: {
          ...details,
          impactRecords: JSON.stringify(updated.map((r) => r.title)),
        },
      });
      await refetchProfile();
    } catch {
      // non-blocking
    } finally {
      setIsSavingImpact(false);
      setShowAddImpact(false);
      setNewTitle("");
      setNewSituation("");
      setNewAction("");
      setNewResult("");
      setNewMetric("");
      setNewEvidence("");
    }
  };

  const copyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  return (
    <div className="r-page" style={{ maxWidth: 1080, margin: "0 auto", paddingBottom: 60 }}>
      {/* 1. Header & Position Assessment */}
      <div className="career-hero">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
          <div className="career-hero__badge" style={{ background: "#eef2ff", color: "#4f46e5" }}>
            <span>🚀</span> Radar Career for Professionals
          </div>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#4f46e5" }}>
            Decision Focus: {activeDecision.category}
          </span>
        </div>

        <h1 className="career-hero__title">
          Good day, {firstName}. Here is your strategic career intelligence.
        </h1>
        <p style={{ fontSize: 14.5, color: "var(--text-dim)", lineHeight: 1.6, maxWidth: 740 }}>
          Radar helps working professionals understand their current position, evaluate realistic options, build structured evidence of impact, and pursue advancement without taking unnecessary risks.
        </p>

        <div className="career-hero__meta">
          <div className="career-hero__meta-item">
            <strong>Current Baseline:</strong> {currentRole} · {currentIndustry} ({currentExperience})
          </div>
          <div className="career-hero__meta-item">
            <strong>Scope:</strong> {currentLeadership}
          </div>
          <div className="career-hero__meta-item">
            <strong>Risk Appetite:</strong> {currentRisk.split(":")[0]}
          </div>
        </div>
      </div>

      {/* 2. THE SIX-PART RECOMMENDATION STANDARD CARD */}
      <div className="rec-six-part" style={{ background: "linear-gradient(135deg, #111827 0%, #1f2937 100%)" }}>
        <div className="rec-six-part__top">
          <div className="rec-six-part__label" style={{ color: "#818cf8" }}>
            <span>⚡</span> Strategic Decision Action · Six-Part Standard
          </div>
          <div className="rec-six-part__time-badge">⏱️ ~75 minutes · Executive Output</div>
        </div>

        <div className="rec-six-part__heading">
          {activeDecisionId === "internal-promotion"
            ? "Draft an Executive Value Memorandum detailing your $225k+ impact for your upcoming leadership review"
            : activeDecisionId === "lateral-scaleup"
            ? "Structure an Executive Scaleup Pitch converting your system overhaul into an interview case study"
            : "Package your operational optimization methodology into a 3-part diagnostic advisory framework"}
        </div>

        <div className="rec-six-part__grid">
          <div className="rec-part">
            <span className="rec-part__title">1. Recommendation</span>
            <span className="rec-part__desc">
              {activeDecisionId === "internal-promotion"
                ? "Prepare a 1-page Executive Value Memorandum mapping your cross-team operational savings and 2027 technical vision for your VP/Director."
                : "Translate your top 2 quantified projects into an Executive Capability Summary highlighting multi-product delivery."}
            </span>
          </div>

          <div className="rec-part">
            <span className="rec-part__title">2. Why It Matters</span>
            <span className="rec-part__desc">
              {activeDecisionId === "internal-promotion"
                ? "Senior promotions require demonstrated P&L impact and executive sponsorship ahead of the Q1 budget and title calibration cycles."
                : "Scaleup leadership hiring prioritizes candidates with clear architectural ownership and proven cost-efficiency metrics."}
            </span>
          </div>

          <div className="rec-part">
            <span className="rec-part__title">3. Expected Deliverable</span>
            <span className="rec-part__desc">
              A structured 1-page executive memorandum containing: (1) baseline inefficiency, (2) quantifiable result ($225k+), and (3) proposed next-level initiatives.
            </span>
          </div>

          <div className="rec-part">
            <span className="rec-part__title">4. Time & Effort</span>
            <span className="rec-part__desc">
              75 minutes. Template provided in the Impact Tracker below using your recorded contributions.
            </span>
          </div>

          <div className="rec-part">
            <span className="rec-part__title">5. Evidence of Success</span>
            <span className="rec-part__desc">
              Memo contains verified operational metrics, clear attribution of your leadership role, and no ungrounded claims.
            </span>
          </div>

          <div className="rec-part">
            <span className="rec-part__title">6. Feedback & Next Step</span>
            <span className="rec-part__desc">
              Logging executive responses in Radar recalibrates your promotion probability model and refines compensation negotiation ranges.
            </span>
          </div>
        </div>

        <div className="rec-six-part__actions">
          <a href="#impact-tracker" className="btn btn--primary" style={{ padding: "11px 20px" }}>
            Open Professional Impact Tracker ↓
          </a>
          <a href="#decision-intelligence" className="btn btn--secondary" style={{ background: "rgba(255,255,255,0.1)", color: "#fff", border: "1px solid rgba(255,255,255,0.2)" }}>
            Compare Career Decisions ↗
          </a>
        </div>
      </div>

      {/* 3. CAREER DECISION INTELLIGENCE (COMPARING REALISTIC OPTIONS) */}
      <div id="decision-intelligence" style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div>
            <div className="nav-section-label" style={{ margin: 0 }}>CAREER DECISION INTELLIGENCE · COMPARATIVE EVALUATION</div>
            <div style={{ fontSize: 13, color: "var(--text-dim)", marginTop: 2 }}>
              Radar evaluates realistic paths with transparent trade-offs, estimated time horizons, and risk assumptions.
            </div>
          </div>
        </div>

        <div className="career-path-grid">
          {CAREER_DECISIONS.map((option) => {
            const isSelected = option.id === activeDecisionId;
            return (
              <div
                key={option.id}
                className={`career-path-card ${isSelected ? "active" : ""}`}
                onClick={() => handleSelectDecision(option.id)}
                style={{
                  borderLeft: isSelected ? "4px solid var(--cyan)" : undefined,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                  <div className="career-path-card__title">{option.title}</div>
                  <span className="ob-type-card__badge" style={{ background: isSelected ? "#cffafe" : undefined }}>
                    {option.badge}
                  </span>
                </div>

                <div className="career-path-card__why">
                  <strong>Expected Upside:</strong> {option.benefits}
                </div>

                <div className="career-path-card__section">Costs, Effort & Horizon</div>
                <div className="career-path-card__list">
                  <div>• <strong>Time:</strong> {option.timeHorizon}</div>
                  <div>• <strong>Effort:</strong> {option.costsEffort}</div>
                </div>

                <div className="career-path-card__section">Prerequisites & Key Requirements</div>
                <div className="career-path-card__list">
                  {option.requirements.map((req, i) => (
                    <div key={i} style={{ display: "flex", gap: 5 }}>
                      <span style={{ color: "#008c93" }}>•</span> {req}
                    </div>
                  ))}
                </div>

                <div className="career-path-card__section" style={{ color: "#be123c" }}>Risks & Trade-Offs</div>
                <div className="career-path-card__list" style={{ color: "#9f1239" }}>
                  ⚠️ {option.risks}
                </div>

                <div style={{ marginTop: "auto", paddingTop: 10 }}>
                  <button
                    className={`btn btn--sm ${isSelected ? "btn--primary" : "btn--secondary"}`}
                    style={{ width: "100%" }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectDecision(option.id);
                    }}
                  >
                    {isSelected ? "✓ Active Strategic Direction" : "Select Option →"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. PROFESSIONAL IMPACT TRACKER (STAR & GENUINE CONTRIBUTIONS) */}
      <div id="impact-tracker" style={{ background: "var(--bg-card)", border: "1.5px solid var(--border)", borderRadius: 16, padding: "24px", marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
          <div>
            <span className="ob-type-card__badge" style={{ background: "#f0fdf4", color: "#166534", marginBottom: 6 }}>
              PROFESSIONAL IMPACT TRACKER · EVIDENCE OF VALUE
            </span>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 700, margin: 0 }}>
              Demonstrated Workplace Contributions
            </h2>
            <div style={{ fontSize: 13, color: "var(--text-dim)", marginTop: 2 }}>
              A structured record of genuine contributions used for promotion cases, executive CVs, and negotiation.
            </div>
          </div>

          <button
            className="btn btn--primary btn--sm"
            onClick={() => setShowAddImpact((v) => !v)}
          >
            {showAddImpact ? "Cancel" : "+ Record New Impact"}
          </button>
        </div>

        {/* Modal / Inline form to add new impact record */}
        {showAddImpact && (
          <div style={{ background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: 12, padding: "18px 20px", marginBottom: 20 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: "#0f172a", marginBottom: 12 }}>
              Record a Verified Workplace Contribution
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: "#475569", display: "block", marginBottom: 4 }}>
                  Contribution Title / Initiative
                </label>
                <input
                  type="text"
                  placeholder="e.g. Multi-Cloud Migration Cost Optimization"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="r-input"
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: "#475569", display: "block", marginBottom: 4 }}>
                  Quantified Metric / Result Badge
                </label>
                <input
                  type="text"
                  placeholder="e.g. $75k annual savings or 40% speed gain"
                  value={newMetric}
                  onChange={(e) => setNewMetric(e.target.value)}
                  className="r-input"
                />
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: "#475569", display: "block", marginBottom: 4 }}>
                Situation & Problem Solved (Context)
              </label>
              <textarea
                placeholder="What operational or revenue bottleneck existed?"
                value={newSituation}
                onChange={(e) => setNewSituation(e.target.value)}
                className="r-input"
                rows={2}
              />
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: "#475569", display: "block", marginBottom: 4 }}>
                Specific Actions & Leadership Role
              </label>
              <textarea
                placeholder="What architectural, management, or strategic actions did you lead?"
                value={newAction}
                onChange={(e) => setNewAction(e.target.value)}
                className="r-input"
                rows={2}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: "#475569", display: "block", marginBottom: 4 }}>
                  Measurable Business Result
                </label>
                <input
                  type="text"
                  placeholder="e.g. Reduced downtime by 88% and improved CSAT from 3.8 to 4.7"
                  value={newResult}
                  onChange={(e) => setNewResult(e.target.value)}
                  className="r-input"
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: "#475569", display: "block", marginBottom: 4 }}>
                  Supporting Evidence / Link
                </label>
                <input
                  type="text"
                  placeholder="e.g. Jira Board #812, Audit Doc, Executive Report"
                  value={newEvidence}
                  onChange={(e) => setNewEvidence(e.target.value)}
                  className="r-input"
                />
              </div>
            </div>

            <button
              className="btn btn--primary"
              onClick={handleSaveImpact}
              disabled={isSavingImpact || !newTitle.trim() || !newResult.trim()}
            >
              {isSavingImpact ? "Saving Impact…" : "Save to Impact Log →"}
            </button>
          </div>
        )}

        {/* Impact List */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {impactRecords.map((item) => {
            const promotionBullet = `Led ${item.title.toLowerCase()}: addressed ${item.situation.toLowerCase()} by leading ${item.action.toLowerCase()}, achieving ${item.result} (${item.evidenceLink}).`;
            const isCopied = copiedId === item.id;

            return (
              <div key={item.id} className="impact-entry-card">
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 8 }}>
                  <div>
                    <h3 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 3px 0", color: "#0f172a" }}>
                      {item.title}
                    </h3>
                    <div style={{ fontSize: 12.5, color: "#64748b" }}>
                      <strong>Role:</strong> {item.role} · <strong>Evidence:</strong> {item.evidenceLink}
                    </div>
                  </div>
                  <span className="impact-metric-pill">
                    ⚡ {item.metricBadge}
                  </span>
                </div>

                <div style={{ fontSize: 13, color: "#334155", lineHeight: 1.5, marginBottom: 10 }}>
                  <strong>Situation & Action:</strong> {item.situation} {item.action}
                </div>

                <div style={{ background: "#f8fafc", borderLeft: "3px solid #16a34a", padding: "8px 12px", borderRadius: "0 6px 6px 0", fontSize: 12.5, color: "#166534", marginBottom: 10 }}>
                  <strong>Measurable Outcome:</strong> {item.result}
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8, paddingTop: 4 }}>
                  <span style={{ fontSize: 11.5, color: "#64748b" }}>
                    Formats into: Executive Memo · Resume Bullet · Senior Interview STAR
                  </span>
                  <button
                    className="btn btn--sm btn--secondary"
                    onClick={() => copyText(item.id, promotionBullet)}
                  >
                    {isCopied ? "✓ Copied Promotion Bullet!" : "Copy Promotion Case Bullet"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. SKILLS & MARKET VALUE ANALYSIS */}
      <div className="skills-evidence-board">
        <div className="skills-evidence-board__header">
          <div>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 16 }}>
              Market Value & Capabilities Benchmark
            </div>
            <div style={{ fontSize: 13, color: "var(--text-dim)" }}>
              High-leverage senior skills evaluated against {currentRole} benchmark data.
            </div>
          </div>
          <span style={{ fontSize: 12, fontWeight: 700, padding: "4px 10px", borderRadius: 99, background: "#f1f5f9" }}>
            Senior Level Standard
          </span>
        </div>

        <div className="skills-category">
          <div className="skills-category__title" style={{ color: "#065f46" }}>
            <span>✅</span> Demonstrated Executive Capabilities (Backed by Documented Results)
          </div>
          <div>
            <span className="skill-tag skill-tag--demonstrated">
              Operational Latency Optimization ✓ <em style={{ fontSize: 11, opacity: 0.8 }}>($180k Impact)</em>
            </span>
            <span className="skill-tag skill-tag--demonstrated">
              Cloud Infrastructure Budgeting ✓ <em style={{ fontSize: 11, opacity: 0.8 }}>($45k Annual Savings)</em>
            </span>
            <span className="skill-tag skill-tag--demonstrated">
              Cross-Functional Team Leadership ✓ <em style={{ fontSize: 11, opacity: 0.8 }}>(Team of 5-8)</em>
            </span>
          </div>
        </div>

        <div className="skills-category">
          <div className="skills-category__title" style={{ color: "#475569" }}>
            <span>📝</span> Self-Reported Capabilities (Awaiting Formal Attribution)
          </div>
          <div>
            <span className="skill-tag skill-tag--claimed">Executive Stakeholder Alignment</span>
            <span className="skill-tag skill-tag--claimed">Product Strategy & Roadmap Governance</span>
            <span className="skill-tag skill-tag--claimed">Vendor Negotiations</span>
          </div>
        </div>

        <div className="skills-category">
          <div className="skills-category__title" style={{ color: "#be123c" }}>
            <span>🎯</span> High-Leverage Senior Gaps (Needed for Director / Head Role)
          </div>
          <div>
            <span className="skill-tag skill-tag--gap">
              Full P&L and Multi-Million Dollar Budget Ownership <span>(Priority 1)</span>
            </span>
            <span className="skill-tag skill-tag--gap">
              Executive Board & C-Suite Communication Presentation <span>(Priority 2)</span>
            </span>
          </div>
        </div>
      </div>

      {/* 6. OPPORTUNITY INTELLIGENCE (SENIOR & EXECUTIVE OPPORTUNITIES) */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div>
            <div className="nav-section-label" style={{ margin: 0 }}>OPPORTUNITY INTELLIGENCE · SENIOR & ADVISORY</div>
            <div style={{ fontSize: 13, color: "var(--text-dim)", marginTop: 2 }}>
              Credible senior roles and leadership fellowships verified against official boards.
            </div>
          </div>
          <Link to="/opportunities" style={{ fontSize: 12.5, fontWeight: 700, color: "#008c93" }}>
            Explore All Opportunities →
          </Link>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {SENIOR_OPPORTUNITIES.map((opp) => (
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
                    <strong>{opp.organisation}</strong> · {opp.location} ({opp.workArrangement})
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 99, background: "#ecfdf5", color: "#065f46" }}>
                    ✓ {opp.verificationBadge}
                  </span>
                  <div style={{ fontSize: 12, color: "#166534", fontWeight: 700, marginTop: 4 }}>
                    {opp.compensationBand}
                  </div>
                </div>
              </div>

              <div style={{ background: "#f8fafc", padding: "10px 14px", borderRadius: 8, fontSize: 13, color: "#334155", lineHeight: 1.5, marginBottom: 12 }}>
                <strong>Why it fits:</strong> {opp.fitExplanation}
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
                <div style={{ fontSize: 12, color: "#64748b" }}>
                  {opp.checkedDate} · <span style={{ color: "#d97706" }}>Remaining gap: {opp.strategicGaps[0]}</span>
                </div>

                <a
                  href={opp.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn--sm btn--primary"
                >
                  View Executive Posting ↗
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
