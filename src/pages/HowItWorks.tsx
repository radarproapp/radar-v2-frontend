import { Link } from "react-router-dom";

const STEPS: { label: string; title: string; body: string; icon: React.ReactNode; accent?: boolean }[] = [
  {
    label: "STEP 01 · INPUT",
    title: "Trusted sources",
    body: "Government, research bodies, industry and global institutions — monitored continuously, not searched randomly.",
    icon: (
      <div style={{ display: "flex", flexDirection: "column", gap: 3, alignItems: "flex-start" }}>
        <div style={{ width: 14, height: 2.5, borderRadius: 1, background: "#00c2cb" }} />
        <div style={{ width: 11, height: 2.5, borderRadius: 1, background: "#00c2cb", opacity: 0.7 }} />
        <div style={{ width: 8, height: 2.5, borderRadius: 1, background: "#00c2cb", opacity: 0.45 }} />
      </div>
    ),
  },
  {
    label: "STEP 02 · PROCESS",
    title: "AI engine",
    body: "Every document is broken down: what happened, why it matters, who's affected, what to do next.",
    icon: <div style={{ width: 13, height: 13, background: "#00c2cb", borderRadius: 3, transform: "rotate(45deg)" }} />,
  },
  {
    label: "STEP 03 · PROCESS",
    title: "Verification",
    body: "Checked for accuracy and source quality before anything reaches a user.",
    icon: <div style={{ width: 13, height: 7, borderLeft: "2.5px solid #00c2cb", borderBottom: "2.5px solid #00c2cb", transform: "rotate(-45deg)", marginTop: -3 }} />,
  },
  {
    label: "STEP 04 · CONNECT",
    title: "Knowledge graph",
    body: "Ideas get linked — to skills, industries, careers, and everything else you've read.",
    icon: (
      <div style={{ position: "relative", width: 16, height: 14 }}>
        <div style={{ position: "absolute", top: 0, left: 6, width: 4, height: 4, borderRadius: "50%", background: "#00c2cb" }} />
        <div style={{ position: "absolute", bottom: 0, left: 0, width: 4, height: 4, borderRadius: "50%", background: "#00c2cb" }} />
        <div style={{ position: "absolute", bottom: 0, right: 0, width: 4, height: 4, borderRadius: "50%", background: "#00c2cb" }} />
      </div>
    ),
  },
  {
    label: "STEP 05 · TAILOR",
    title: "Personalisation",
    body: "Filtered by role, region and goals — no two people see the same brief.",
    icon: (
      <div style={{ width: 16, height: 16, borderRadius: "50%", border: "2px solid #00c2cb", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#00c2cb" }} />
      </div>
    ),
  },
  {
    label: "STEP 06 · OUTPUT",
    title: "Actionable intelligence",
    body: "Delivered as something you can actually use today — not another PDF to forget.",
    accent: true,
    icon: (
      <div style={{ position: "relative", width: 16, height: 16 }}>
        <div style={{ position: "absolute", bottom: 2, left: 0, width: 11, height: 2, borderRadius: 1, background: "#fff", transform: "rotate(-40deg)", transformOrigin: "0 100%" }} />
        <div style={{ position: "absolute", top: 0, right: 0, width: 7, height: 7, borderTop: "2px solid #fff", borderRight: "2px solid #fff", transform: "rotate(45deg)" }} />
      </div>
    ),
  },
];

const TIMELINE = [
  { month: "Month 1", title: "Getting started", body: "Configuration, admin training, first users onboarded." },
  { month: "Month 3", title: "Building momentum", body: "Daily usage, active learning pathways, early dashboards." },
  { month: "Month 6", title: "Measuring impact", body: "Capability growth becomes visible and reportable." },
  { month: "Year 1", title: "Transformation", body: "Radar becomes part of how decisions get made." },
];

export function HowItWorks() {
  return (
    <div className="mkt-how">
      {/* HEADER */}
      <section className="mkt-page-header">
        <div className="mkt-page-header__inner">
          <div className="mkt-section-label">One engine</div>
          <h1>From trusted source to actionable intelligence.</h1>
          <p>Nothing reaches a user until it's passed through all six steps — so what you see is always sourced, verified, and relevant to you.</p>
        </div>
      </section>

      {/* ENGINE STEPS */}
      <section className="mkt-engine">
        <div className="mkt-engine__inner">
          {STEPS.map((step, i) => (
            <div className="mkt-engine__step" key={step.title}>
              <div className="mkt-engine__icon-wrap">
                <div className={`mkt-engine__icon ${step.accent ? "mkt-engine__icon--accent" : "mkt-engine__icon--dark"}`}>{step.icon}</div>
                {i < STEPS.length - 1 && <div className="mkt-engine__line" />}
              </div>
              <div className="mkt-engine__text">
                <div className="mkt-engine__step-label">{step.label}</div>
                <div className="mkt-engine__step-title">{step.title}</div>
                <p>{step.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* IMPLEMENTATION TIMELINE */}
      <section className="mkt-timeline">
        <div className="mkt-timeline__inner">
          <div className="mkt-timeline__header">
            <div className="mkt-section-label">Getting started</div>
            <h2>Live in a month. Measurable in six.</h2>
            <p>Radar sits alongside what you already use — no rip-and-replace, no disruption to existing systems.</p>
          </div>
          <div className="mkt-timeline__grid">
            {TIMELINE.map((item) => (
              <div className="mkt-timeline__item" key={item.month}>
                <div className="mkt-timeline__month">{item.month}</div>
                <div className="mkt-timeline__title">{item.title}</div>
                <p>{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mkt-cta-section">
        <div className="mkt-cta-card">
          <div className="mkt-cta-card__content">
            <h2>Ready to turn information into intelligence?</h2>
            <p>Start free as an individual, or bring Radar to your organisation.</p>
          </div>
          <div className="mkt-cta-card__actions">
            <Link to="/onboarding" className="btn btn--dark btn--lg">
              Start free
            </Link>
            <Link to="/institutions" className="btn btn--outline-white btn--lg">
              Talk to us about your institution
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
