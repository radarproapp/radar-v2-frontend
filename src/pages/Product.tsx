import { Link } from "react-router-dom";

export function Product() {
  return (
    <div className="mkt-product">
      {/* HEADER */}
      <section className="mkt-page-header">
        <div className="mkt-page-header__inner">
          <div className="mkt-section-label">One system, four applications</div>
          <h1>Everything runs on the same intelligence.</h1>
          <p>
            Radar Intelligence, Learn, Career and Insights all draw from one engine — so the report you read this
            morning can become a learning pathway this afternoon, and evidence in your portfolio by next week.
          </p>
        </div>
      </section>

      {/* PRODUCT 1: INTELLIGENCE */}
      <section className="mkt-product-section mkt-product-section--alt">
        <div className="mkt-product-section__inner">
          <div className="mkt-product-section__text">
            <div className="mkt-product-icon mkt-product-icon--teal">
              <div style={{ width: 18, height: 18, borderRadius: "50%", border: "2px solid #008c93", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ width: 5.5, height: 5.5, borderRadius: "50%", background: "#008c93" }} />
              </div>
            </div>
            <div className="mkt-product-section__label">RADAR INTELLIGENCE</div>
            <h2>Understand the world in five minutes.</h2>
            <p>
              Radar continuously monitors trusted sources — government, research, industry, global institutions —
              and turns every document into a briefing: what happened, why it matters, who's affected, and what to
              do next. No two people see the same feed.
            </p>
            <ul className="mkt-checklist">
              <li><span className="mkt-checklist__arrow">→</span>One-minute overview and five-minute summary for every source</li>
              <li><span className="mkt-checklist__arrow">→</span>Personalised by role, region and interests</li>
              <li><span className="mkt-checklist__arrow">→</span>Everything linked into your growing knowledge graph</li>
            </ul>
          </div>
          <div className="mkt-product-section__visual">
            <div className="mkt-product-mockup mkt-product-mockup--intelligence" />
          </div>
        </div>
      </section>

      {/* PRODUCT 2: LEARN */}
      <section className="mkt-product-section">
        <div className="mkt-product-section__inner mkt-product-section__inner--reverse">
          <div className="mkt-product-section__visual">
            <div className="mkt-product-mockup mkt-product-mockup--learn" />
          </div>
          <div className="mkt-product-section__text">
            <div className="mkt-product-icon mkt-product-icon--amber">
              <div style={{ display: "flex", alignItems: "flex-end", gap: 2.5, height: 18 }}>
                <div style={{ width: 4.5, height: 8, borderRadius: 1, background: "#b7791a" }} />
                <div style={{ width: 4.5, height: 13, borderRadius: 1, background: "#b7791a" }} />
                <div style={{ width: 4.5, height: 18, borderRadius: 1, background: "#b7791a" }} />
              </div>
            </div>
            <div className="mkt-product-section__label">RADAR LEARN</div>
            <h2>Master a valuable skill, step by step.</h2>
            <p>
              No more guessing what to learn next. Radar builds a complete pathway toward a real goal — resources,
              projects, and assessments, all connected — and always knows what you've mastered and what's left.
            </p>
            <ul className="mkt-checklist">
              <li><span className="mkt-checklist__arrow">→</span>Skill maps that show exactly where you stand</li>
              <li><span className="mkt-checklist__arrow">→</span>Practical projects, not just lessons</li>
              <li><span className="mkt-checklist__arrow">→</span>Every project feeds your Career portfolio</li>
            </ul>
          </div>
        </div>
      </section>

      {/* PRODUCT 3: CAREER */}
      <section className="mkt-product-section mkt-product-section--alt">
        <div className="mkt-product-section__inner">
          <div className="mkt-product-section__text">
            <div className="mkt-product-icon mkt-product-icon--indigo">
              <div style={{ position: "relative", width: 17, height: 18 }}>
                <div style={{ width: 16, height: 16, borderRadius: "50%", background: "#5b6bd9" }} />
                <div
                  style={{
                    position: "absolute", top: 12, left: 4.5, width: 0, height: 0,
                    borderLeft: "3.5px solid transparent", borderRight: "3.5px solid transparent", borderTop: "5.5px solid #5b6bd9",
                  }}
                />
              </div>
            </div>
            <div className="mkt-product-section__label">RADAR CAREER</div>
            <h2>Prove your capability — not just claim it.</h2>
            <p>
              A CV tells people what you say you've done. Radar builds a living Intelligence Portfolio from what you
              actually do — learning history, completed projects, assessments — and rolls it into your RCIS score.
            </p>
            <ul className="mkt-checklist">
              <li><span className="mkt-checklist__arrow">→</span>Every lesson, article, paper and project you finish, tracked</li>
              <li><span className="mkt-checklist__arrow">→</span>A portfolio that grows automatically, no manual updates</li>
              <li><span className="mkt-checklist__arrow">→</span>Discoverable by employers searching for verified skills</li>
            </ul>
          </div>
          <div className="mkt-product-section__visual">
            <div className="mkt-product-mockup mkt-product-mockup--career">
              <div className="mkt-career-score">
                <div className="mkt-career-score__header">
                  <span>Roadmap progress</span>
                  <span className="mkt-career-score__pct">68%</span>
                </div>
                <div className="mkt-career-score__row">
                  <div className="mkt-career-score__row-label"><span>Learning consistency</span><span>96</span></div>
                  <div className="mkt-career-score__bar"><div style={{ width: "96%" }} /></div>
                </div>
                <div className="mkt-career-score__row">
                  <div className="mkt-career-score__row-label"><span>Knowledge depth</span><span>91</span></div>
                  <div className="mkt-career-score__bar"><div style={{ width: "91%" }} /></div>
                </div>
                <div className="mkt-career-score__row">
                  <div className="mkt-career-score__row-label"><span>Projects</span><span>89</span></div>
                  <div className="mkt-career-score__bar"><div style={{ width: "89%" }} /></div>
                </div>
                <div className="mkt-career-score__row">
                  <div className="mkt-career-score__row-label"><span>Leadership</span><span>82</span></div>
                  <div className="mkt-career-score__bar"><div style={{ width: "82%" }} /></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PRODUCT 4: INSIGHTS */}
      <section className="mkt-product-section">
        <div className="mkt-product-section__inner mkt-product-section__inner--reverse">
          <div className="mkt-product-section__visual">
            <div className="mkt-product-mockup mkt-product-mockup--insights" />
          </div>
          <div className="mkt-product-section__text">
            <div className="mkt-product-icon mkt-product-icon--green">
              <div style={{ position: "relative", width: 18, height: 18 }}>
                <div style={{ position: "absolute", left: 2, bottom: 3.5, width: 11, height: 2, borderRadius: 1, background: "#1f9d63", transformOrigin: "0% 100%", transform: "rotate(-35deg)" }} />
                <div style={{ position: "absolute", top: 1, right: 1, width: 5, height: 5, borderTop: "2px solid #1f9d63", borderRight: "2px solid #1f9d63", transform: "rotate(45deg)" }} />
              </div>
            </div>
            <div className="mkt-product-section__label">RADAR INSIGHTS</div>
            <h2>Decide with evidence, not assumptions.</h2>
            <p>
              Built for leaders. Instead of waiting for an annual report, see engagement, capability growth, and
              outcomes as they happen — with a dashboard tailored to the decision each role actually makes.
            </p>
            <ul className="mkt-checklist">
              <li><span className="mkt-checklist__arrow">→</span>Role-specific dashboards — VC, CEO, HR Director, Minister</li>
              <li><span className="mkt-checklist__arrow">→</span>Live, not quarterly</li>
              <li>
                <span className="mkt-checklist__arrow">→</span>See the detail in <Link to="/institutions">institution dashboards →</Link>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mkt-cta-section">
        <div className="mkt-cta-card">
          <div className="mkt-cta-card__content">
            <h2>See all four products working together.</h2>
            <p>One engine. One account. Four ways to turn knowledge into outcomes.</p>
          </div>
          <div className="mkt-cta-card__actions">
            <Link to="/onboarding" className="btn btn--dark btn--lg">
              Start free
            </Link>
            <Link to="/how-it-works" className="btn btn--outline-white btn--lg">
              See how it works
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
