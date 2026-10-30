import { useEffect, useState, type ReactNode } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { Icon } from "./Icon";

/// The three destinations the public site navigates between, named once.
///
/// The header and the mobile menu both render this list. Written out twice, the menu was the copy
/// that would quietly fall behind when a page was added.
const NAV_LINKS = [
  { to: "/product", label: "Product" },
  { to: "/institutions", label: "Institutions" },
  { to: "/how-it-works", label: "How it works" },
];

/// The public site's shell: header, page, footer.
///
/// The header used to render the full desktop navigation at every width. On a 420px phone the logo
/// took the first row, the three links the second and "Sign in"/"Start free" the third — a 160px
/// header above a 420px-wide screen, so a third of the first view was navigation. Below 860px the
/// links and "Sign in" now collapse into a disclosure menu, which is the same width at which the
/// signed-in shell swaps its sidebar for the tab bar.
export function MarketingLayout({ children }: { children?: ReactNode } = {}) {
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  // Navigating is the usual way out of the menu, and leaving it open over the new page would hide
  // the top of what the visitor just asked for.
  useEffect(() => setMenuOpen(false), [pathname]);

  // Escape closes it. The backdrop below catches a click or tap, but a keyboard user has nothing
  // to click, and trapping them inside an open menu is how a hamburger ends up mouse-only.
  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  return (
    <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column" }}>
      <nav className="mkt-nav">
        <Link to="/landing" className="mkt-nav__brand">
          <div className="mkt-nav__mark">R</div>
          <div className="mkt-nav__divider" />
          <span className="mkt-nav__name">Radar</span>
        </Link>
        <div className="mkt-nav__links">
          {NAV_LINKS.map((link) => (
            <Link key={link.to} to={link.to}>
              {link.label}
            </Link>
          ))}
        </div>
        <div className="mkt-nav__actions">
          <Link to="/login" className="mkt-nav__signin">
            Sign in
          </Link>
          <Link to="/onboarding" className="btn btn--accent mkt-nav__start">
            Start free
          </Link>
          {/* A real button, so it is in the tab order and answers Enter and Space without any
              handler of ours. The icon alone would announce nothing, hence the label. */}
          <button
            type="button"
            className="mkt-nav__toggle"
            aria-expanded={menuOpen}
            aria-controls="mkt-nav-menu"
            aria-label={menuOpen ? "Close menu" : "Menu"}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <Icon name={menuOpen ? "close" : "menu"} size={19} />
          </button>
        </div>

        {menuOpen && (
          <div className="mkt-nav__sheet" id="mkt-nav-menu" role="menu">
            {NAV_LINKS.map((link) => (
              <Link key={link.to} to={link.to} role="menuitem" className="mkt-nav__sheet-link">
                {link.label}
              </Link>
            ))}
            <div className="mkt-nav__sheet-divider" />
            <Link to="/login" role="menuitem" className="mkt-nav__sheet-link">
              Sign in
            </Link>
          </div>
        )}
      </nav>

      {/* Sits below the header and the menu in the stacking order so it cannot swallow a tap on
          the thing it is there to dismiss. */}
      {menuOpen && (
        <div className="mkt-nav__backdrop" onClick={() => setMenuOpen(false)} aria-hidden="true" />
      )}

      <main style={{ flex: 1 }}>
        {children ?? <Outlet />}
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
                <Link to="/privacy">Privacy policy</Link>
                <Link to="/terms">Terms of service</Link>
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
