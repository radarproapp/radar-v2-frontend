import { useState } from "react";
import { Link } from "react-router-dom";

interface TabData {
  id: string;
  label: string;
  title: string;
  body: string;
  quote: string;
  imgBg: string;
  stats: [string, string][];
}

const TABS: TabData[] = [
  {
    id: "universities",
    label: "Universities",
    title: "Every student graduates with a portfolio, not just a transcript.",
    body: "Radar gives each student a personalised intelligence feed and learning pathway aligned to their programme. Faculty see which modules are driving real capability growth, and employers discover graduates with verified skills.",
    quote: "We used to measure success by graduation rates. Now we measure it by capability at graduation.",
    imgBg: "linear-gradient(135deg,rgba(13,37,48,.1),rgba(13,37,48,.7)),url(/images/marketing/university.jpg)",
    stats: [["12,400+", "Active students"], ["89%", "Daily usage"], ["3.2×", "Portfolio completion"]],
  },
  {
    id: "banks",
    label: "Banks & enterprises",
    title: "Your workforce stays current without leaving their desk.",
    body: "Radar delivers curated intelligence to every employee based on their role — risk, compliance, strategy, tech — and tracks which teams are building the capabilities your next quarter demands.",
    quote: "Our compliance team catches regulatory shifts weeks earlier than before.",
    imgBg: "linear-gradient(135deg,rgba(13,24,32,.1),rgba(13,24,32,.7)),url(/images/marketing/hero.jpg)",
    stats: [["4,200+", "Employees enrolled"], ["94%", "Weekly return rate"], ["67%", "Skills gap reduced"]],
  },
  {
    id: "government",
    label: "Government",
    title: "Policy teams stay ahead of change — not behind it.",
    body: "Radar monitors domestic and international policy shifts, translates them into plain language briefs, and connects each update to the departments and skills it affects.",
    quote: "Five minutes on Radar replaced three hours of manual policy scanning.",
    imgBg: "linear-gradient(135deg,rgba(24,24,32,.1),rgba(24,24,32,.72)),url(/images/marketing/government.jpg)",
    stats: [["8", "Ministries onboarded"], ["200+", "Policy briefs / week"], ["34%", "Faster response time"]],
  },
  {
    id: "ngos",
    label: "NGOs & partners",
    title: "Programme teams track what matters — without the data lag.",
    body: "Radar turns scattered reports, field data, and research into actionable briefs — so programme leads can make decisions based on what's happening now, not what was true three months ago.",
    quote: "Radar helped us spot a funding opportunity we would have missed entirely.",
    imgBg: "linear-gradient(135deg,rgba(13,32,24,.1),rgba(13,32,24,.7)),url(/images/marketing/ngo.jpg)",
    stats: [["16", "Programme teams"], ["92%", "Brief relevance score"], ["2.8×", "Faster reporting"]],
  },
];

export function Institutions() {
  const [activeTab, setActiveTab] = useState("universities");
  const active = TABS.find((t) => t.id === activeTab) ?? TABS[0];

  return (
    <div className="mkt-institutions">
      {/* HEADER */}
      <section className="mkt-page-header">
        <div className="mkt-page-header__inner">
          <div className="mkt-section-label">Built for institutions</div>
          <h1>Every leader gets the view they need.</h1>
          <p>Same underlying intelligence, adapted to the decisions each institution actually makes. Choose a type below to see how Radar shows up for them.</p>
        </div>
      </section>

      {/* TABS + CONTENT */}
      <section className="mkt-inst-content">
        <div className="mkt-inst-content__inner">
          <div className="mkt-inst-tabs">
            {TABS.map((tab) => (
              <button key={tab.id} className={`mkt-inst-tab ${activeTab === tab.id ? "active" : ""}`} onClick={() => setActiveTab(tab.id)}>
                {tab.label}
              </button>
            ))}
          </div>

          <div className="mkt-inst-detail">
            <div className="mkt-inst-detail__visual">
              <div className="mkt-inst-detail__img" style={{ background: active.imgBg }} />
            </div>
            <div className="mkt-inst-detail__text">
              <h2>{active.title}</h2>
              <p>{active.body}</p>
              <div className="mkt-inst-stats">
                {active.stats.map(([value, label]) => (
                  <div className="mkt-inst-stat" key={label}>
                    <div className="mkt-inst-stat__val">{value}</div>
                    <div className="mkt-inst-stat__label">{label}</div>
                  </div>
                ))}
              </div>
              <div className="mkt-inst-quote">"{active.quote}"</div>
            </div>
          </div>
        </div>
      </section>

      {/* INTEGRATION */}
      <section className="mkt-inst-integration">
        <div className="mkt-inst-integration__inner">
          <div>
            <h2>Radar sits alongside what you already use.</h2>
            <p>No rip-and-replace. Works with your LMS, HR system, and SSO — live within a month.</p>
          </div>
          <Link to="/how-it-works" className="btn btn--dark btn--lg">
            See the implementation timeline →
          </Link>
        </div>
      </section>

      {/* CTA */}
      <section className="mkt-cta-section">
        <div className="mkt-cta-card">
          <div className="mkt-cta-card__content">
            <h2>Bring Radar to your institution.</h2>
            <p>Most institutions see measurable impact within six months. Let's talk about yours.</p>
          </div>
          <div className="mkt-cta-card__actions">
            <Link to="/onboarding" className="btn btn--dark btn--lg">
              Talk to us
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
