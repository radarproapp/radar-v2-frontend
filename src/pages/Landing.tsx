import { Link } from "react-router-dom";

export function Landing() {
  return (
    <div className="mkt-landing">
      {/* HERO */}
      <section className="mkt-hero">
        <div className="mkt-hero__content">
          <div className="mkt-hero__badge">Africa's Intelligence Operating System</div>
          <h1 className="mkt-hero__title">Turn everything you read into something you can act on.</h1>
          <p className="mkt-hero__desc">
            Radar reads the news, research and reports piling up around you, explains what actually matters, and
            turns that understanding into skills, proof of capability, and better decisions — for you, and for the
            institutions you belong to.
          </p>
          <div className="mkt-hero__actions">
            <Link to="/onboarding" className="btn btn--accent btn--lg">
              Start free
            </Link>
            <Link to="/institutions" className="btn btn--outline-dark btn--lg">
              For institutions →
            </Link>
          </div>
        </div>
        <div className="mkt-hero__visual">
          <div className="mkt-hero__photo" />
          <div className="mkt-hero__stat-card">
            <div className="mkt-hero__stat">
              <div className="mkt-hero__stat-val" style={{ color: "#00c2cb" }}>
                18
              </div>
              <div className="mkt-hero__stat-label">Day streak</div>
            </div>
            <div className="mkt-hero__stat">
              <div className="mkt-hero__stat-val" style={{ color: "#fff" }}>
                143
              </div>
              <div className="mkt-hero__stat-label">Resources</div>
            </div>
          </div>
        </div>
      </section>

      {/* PROBLEM */}
      <section className="mkt-problem">
        <div className="mkt-problem__inner">
          <div className="mkt-problem__header">
            <div className="mkt-section-label">The intelligence gap</div>
            <h2>You've never had less time, or more information.</h2>
            <p>
              Search engines find things. Courses end. Chat tools answer one question at a time. None of them build a
              lasting, connected understanding of your world — that's the gap Radar closes.
            </p>
          </div>
          <div className="mkt-problem__cards">
            <div className="mkt-card">
              <div className="mkt-card__icon">🔍</div>
              <div className="mkt-card__title">Google finds it. It doesn't explain it.</div>
              <div className="mkt-card__desc">You still have to decide what's trustworthy, what's current, and what it means for you.</div>
            </div>
            <div className="mkt-card">
              <div className="mkt-card__icon">🎓</div>
              <div className="mkt-card__title">Courses end. Learning shouldn't.</div>
              <div className="mkt-card__desc">
                Most learning platforms go quiet the moment the syllabus finishes — right when the real world keeps
                moving.
              </div>
            </div>
            <div className="mkt-card">
              <div className="mkt-card__icon">💬</div>
              <div className="mkt-card__title">AI chat answers one question.</div>
              <div className="mkt-card__desc">
                Radar builds the whole picture — connecting months of reading into one growing body of knowledge.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PRODUCT TEASER */}
      <section className="mkt-products">
        <div className="mkt-products__inner">
          <div className="mkt-section-row">
            <div>
              <div className="mkt-section-label">One system, four applications</div>
              <h2>Everything runs on the same intelligence.</h2>
            </div>
            <Link to="/product" className="mkt-link-arrow">
              Explore all products →
            </Link>
          </div>
          <div className="mkt-products__grid">
            <Link to="/product" className="mkt-product-card">
              <div className="mkt-product-card__icon mkt-product-card__icon--teal">
                <div style={{ width: 16, height: 16, borderRadius: "50%", border: "1.8px solid #008c93", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#008c93" }} />
                </div>
              </div>
              <div className="mkt-product-card__title">Radar Intelligence</div>
              <div className="mkt-product-card__desc">Understand the world in five minutes a day.</div>
            </Link>
            <Link to="/product" className="mkt-product-card">
              <div className="mkt-product-card__icon mkt-product-card__icon--amber">
                <div style={{ display: "flex", alignItems: "flex-end", gap: 2.5, height: 16 }}>
                  <div style={{ width: 4, height: 7, borderRadius: 1, background: "#b7791a" }} />
                  <div style={{ width: 4, height: 11.5, borderRadius: 1, background: "#b7791a" }} />
                  <div style={{ width: 4, height: 16, borderRadius: 1, background: "#b7791a" }} />
                </div>
              </div>
              <div className="mkt-product-card__title">Radar Learn</div>
              <div className="mkt-product-card__desc">Structured pathways toward a real skill.</div>
            </Link>
            <Link to="/product" className="mkt-product-card">
              <div className="mkt-product-card__icon mkt-product-card__icon--indigo">
                <div style={{ position: "relative", width: 15, height: 16 }}>
                  <div style={{ width: 14, height: 14, borderRadius: "50%", background: "#5b6bd9" }} />
                  <div
                    style={{
                      position: "absolute", top: 10.5, left: 4, width: 0, height: 0,
                      borderLeft: "3px solid transparent", borderRight: "3px solid transparent", borderTop: "5px solid #5b6bd9",
                    }}
                  />
                </div>
              </div>
              <div className="mkt-product-card__title">Radar Career</div>
              <div className="mkt-product-card__desc">A living portfolio that proves your capability.</div>
            </Link>
            <Link to="/product" className="mkt-product-card">
              <div className="mkt-product-card__icon mkt-product-card__icon--green">
                <div style={{ position: "relative", width: 16, height: 16 }}>
                  <div style={{ position: "absolute", left: 2, bottom: 3, width: 10, height: 1.8, borderRadius: 1, background: "#1f9d63", transformOrigin: "0% 100%", transform: "rotate(-35deg)" }} />
                  <div style={{ position: "absolute", top: 1, right: 1, width: 4.5, height: 4.5, borderTop: "1.8px solid #1f9d63", borderRight: "1.8px solid #1f9d63", transform: "rotate(45deg)" }} />
                </div>
              </div>
              <div className="mkt-product-card__title">Radar Insights</div>
              <div className="mkt-product-card__desc">Live dashboards for institutional leaders.</div>
            </Link>
          </div>
        </div>
      </section>

      {/* INSTITUTIONS TEASER */}
      <section className="mkt-institutions-teaser">
        <div className="mkt-institutions-teaser__inner">
          <div className="mkt-section-row">
            <div>
              <div className="mkt-section-label">Built for institutions</div>
              <h2>Every leader gets the view they need.</h2>
            </div>
            <Link to="/institutions" className="mkt-link-arrow">
              See institution dashboards →
            </Link>
          </div>
          <div className="mkt-inst-grid">
            <Link to="/institutions" className="mkt-inst-card">
              <div className="mkt-inst-card__img" style={{ background: "linear-gradient(135deg,#1a3a4a,#0d2530)" }} />
              <div className="mkt-inst-card__name">Universities</div>
            </Link>
            <Link to="/institutions" className="mkt-inst-card">
              <div className="mkt-inst-card__img" style={{ background: "linear-gradient(135deg,#1a2a3a,#0d1820)" }} />
              <div className="mkt-inst-card__name">Banks &amp; enterprises</div>
            </Link>
            <Link to="/institutions" className="mkt-inst-card">
              <div className="mkt-inst-card__img" style={{ background: "linear-gradient(135deg,#2a2a3a,#181820)" }} />
              <div className="mkt-inst-card__name">Government</div>
            </Link>
            <Link to="/institutions" className="mkt-inst-card">
              <div className="mkt-inst-card__img" style={{ background: "linear-gradient(135deg,#1a3a2a,#0d2018)" }} />
              <div className="mkt-inst-card__name">NGOs &amp; partners</div>
            </Link>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="mkt-testimonials">
        <div className="mkt-testimonials__inner">
          <div className="mkt-section-label">A day with Radar</div>
          <h2>Real people, real decisions.</h2>
          <div className="mkt-testimonials__grid">
            <div className="mkt-testimonial-card">
              <div className="mkt-testimonial-card__img" style={{ background: "linear-gradient(135deg,#1a3040,#0d1f2a)" }} />
              <div className="mkt-testimonial-card__body">
                <div className="mkt-testimonial-card__name">Ada</div>
                <div className="mkt-testimonial-card__role">200-level Economics student</div>
                <p>"Instead of a 180-page report, Radar gave me five minutes that explained what mattered — then turned it into a project for my portfolio."</p>
              </div>
            </div>
            <div className="mkt-testimonial-card">
              <div className="mkt-testimonial-card__img" style={{ background: "linear-gradient(135deg,#1a2a3a,#0d1a25)" }} />
              <div className="mkt-testimonial-card__body">
                <div className="mkt-testimonial-card__name">David</div>
                <div className="mkt-testimonial-card__role">Software engineer, 29</div>
                <p>"Ten minutes every morning instead of two hours of blogs. A year in, my manager noticed the consistency — and promoted me."</p>
              </div>
            </div>
            <div className="mkt-testimonial-card">
              <div className="mkt-testimonial-card__img" style={{ background: "linear-gradient(135deg,#2a2a30,#1a1a20)" }} />
              <div className="mkt-testimonial-card__body">
                <div className="mkt-testimonial-card__name">Mr. Okafor</div>
                <div className="mkt-testimonial-card__role">Managing Director, Manufacturing</div>
                <p>"Five minutes on Radar and I walk into the executive meeting already informed — competitors, costs, regulation, all of it."</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mkt-cta-section">
        <div className="mkt-cta-card">
          <div className="mkt-cta-card__content">
            <h2>Ready to turn information into intelligence?</h2>
            <p>Start free as an individual, or bring Radar to your university, bank, government agency, or organisation.</p>
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
