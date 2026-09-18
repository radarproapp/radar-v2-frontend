import { Link, Outlet } from "react-router-dom";

export function MarketingLayout() {
  return (
    <div style={{ minHeight: "100dvh", overflowX: "hidden", display: "flex", flexDirection: "column" }}>
      <nav className="mkt-nav">
        <Link to="/landing" className="mkt-nav__brand">
          <div className="mkt-nav__mark">R</div>
          <div className="mkt-nav__divider" />
          <span className="mkt-nav__name">Radar</span>
        </Link>
        <div className="mkt-nav__links">
          <Link to="/product">Product</Link>
          <Link to="/institutions">Institutions</Link>
          <Link to="/how-it-works">How it works</Link>
        </div>
        <div className="mkt-nav__actions">
          <Link to="/login" className="mkt-nav__signin">
            Sign in
          </Link>
          <Link to="/onboarding" className="btn btn--accent mkt-nav__start">
            Start free
          </Link>
        </div>
      </nav>

      <main style={{ flex: 1 }}>
        <Outlet />
      </main>

      <footer className="mkt-footer">
        <div className="mkt-footer__inner">
          <div className="mkt-footer__top">
            <div className="mkt-footer__brand">
              <div className="mkt-footer__brand-row">
                <div className="mkt-nav__mark" style={{ background: "#00c2cb", color: "#12161d" }}>
                  R
                </div>
                <div className="mkt-footer__brand-divider" />
                <span>Radar</span>
              </div>
              <p>Africa's Intelligence Operating System — turning information into understanding, skills and proof.</p>
            </div>
            <div className="mkt-footer__cols">
              <div className="mkt-footer__col">
                <div className="mkt-footer__col-title">Product</div>
                <Link to="/product">Overview</Link>
                <Link to="/product">Radar Intelligence</Link>
                <Link to="/product">Radar Learn</Link>
                <Link to="/how-it-works">How it works</Link>
              </div>
              <div className="mkt-footer__col">
                <div className="mkt-footer__col-title">Institutions</div>
                <Link to="/institutions">Universities</Link>
                <Link to="/institutions">Banks &amp; finance</Link>
                <Link to="/institutions">Government &amp; NGOs</Link>
              </div>
              <div className="mkt-footer__col">
                <div className="mkt-footer__col-title">Company</div>
                <a href="#privacy">Privacy policy</a>
                <a href="#terms">Terms of service</a>
                <a href="#contact">Contact</a>
              </div>
            </div>
          </div>
          <div className="mkt-footer__bottom">
            <span>© 2026 Radar. All rights reserved.</span>
            <span>Made for a global, regionally-aware audience.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
