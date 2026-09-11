import { useEffect, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

const NAV_LINKS: { label: string; path: string; page: string }[] = [
  { label: "Feed", path: "/feed", page: "feed" },
  { label: "Clips", path: "/clips", page: "clips" },
  { label: "Capture", path: "/capture", page: "capture" },
  { label: "Opportunities", path: "/opportunities", page: "opportunities" },
  { label: "Saved", path: "/saved", page: "saved" },
  { label: "Notebook", path: "/notebook", page: "notebook" },
  { label: "Ask Radar", path: "/ask", page: "ask" },
  { label: "Learn", path: "/learn", page: "learn-section" },
  { label: "Research", path: "/research", page: "research" },
  { label: "Library", path: "/library", page: "library" },
  { label: "Mentor", path: "/mentor", page: "mentor" },
];

function activePage(pathname: string): string {
  const p = pathname.toLowerCase();
  if (p.includes("/feed")) return "feed";
  if (p.includes("/clips")) return "clips";
  if (p.includes("/capture")) return "capture";
  if (p.includes("/opportunities")) return "opportunities";
  if (p.includes("/saved")) return "saved";
  if (p.includes("/notebook")) return "notebook";
  if (p.includes("/ask")) return "ask";
  if (p.includes("/research")) return "research";
  if (p.includes("/library")) return "library";
  if (p.includes("/mentor")) return "mentor";
  if (["/learn", "/roadmap", "/lesson", "/projects", "/progress"].some((s) => p.includes(s))) return "learn";
  return "";
}

function activeSection(pathname: string): "intelligence" | "learn" {
  const p = pathname.toLowerCase();
  return p.includes("/learn") || p.includes("/roadmap") || p.includes("/lesson") ? "learn" : "intelligence";
}

export function MainLayout() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => setMenuOpen(false), [pathname]);

  const showNav = !pathname.toLowerCase().includes("/onboarding") && !pathname.toLowerCase().includes("/login");
  const section = activeSection(pathname);
  const page = activePage(pathname);
  const initials = profile?.name?.trim()?.[0]?.toUpperCase() ?? "A";

  const handleSignOut = () => {
    setMenuOpen(false);
    signOut();
    navigate("/login");
  };

  return (
    <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column" }}>
      {showNav && (
        <nav className="r-nav">
          <Link to="/" className="r-nav__brand">
            <div className="r-nav__mark">R</div>
            <span className="r-nav__brand-text">Radar</span>
          </Link>

          <div className="r-nav__links">
            <button className={`r-nav__link ${section === "intelligence" ? "active" : ""}`} onClick={() => navigate("/")}>
              Today
            </button>
            {NAV_LINKS.map((link) => (
              <button
                key={link.path}
                className={`r-nav__link ${page === link.page ? "active" : ""}`}
                onClick={() => navigate(link.path)}
              >
                {link.label}
              </button>
            ))}
          </div>

          <div className="r-nav__right">
            <div className="r-nav__section-pills">
              <button className={`r-nav__pill ${section === "intelligence" ? "active" : ""}`} onClick={() => navigate("/")}>
                Intelligence
              </button>
              <button className={`r-nav__pill ${section === "learn" ? "active" : ""}`} onClick={() => navigate("/learn")}>
                Learn
              </button>
            </div>

            <div style={{ position: "relative" }}>
              <button className="r-nav__avatar" title="Account" onClick={() => setMenuOpen((v) => !v)}>
                {initials}
              </button>
              {menuOpen && (
                <div
                  style={{
                    position: "absolute",
                    right: 0,
                    top: "calc(100% + 8px)",
                    background: "#fff",
                    borderRadius: 12,
                    boxShadow: "0 4px 24px rgba(20,24,31,.14)",
                    border: "1px solid rgba(20,24,31,.08)",
                    minWidth: 160,
                    zIndex: 200,
                    overflow: "hidden",
                  }}
                >
                  <button
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: "12px 16px",
                      fontSize: 13.5,
                      fontWeight: 500,
                      border: "none",
                      background: "none",
                      cursor: "pointer",
                      color: "#14181f",
                    }}
                    onClick={() => {
                      setMenuOpen(false);
                      navigate("/settings");
                    }}
                  >
                    Settings
                  </button>
                  <div style={{ height: 1, background: "rgba(20,24,31,.07)", margin: "0 12px" }} />
                  <button
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: "12px 16px",
                      fontSize: 13.5,
                      fontWeight: 500,
                      border: "none",
                      background: "none",
                      cursor: "pointer",
                      color: "#d94f4f",
                    }}
                    onClick={handleSignOut}
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </nav>
      )}

      <main style={{ flex: 1 }}>
        <Outlet />
      </main>

      {menuOpen && <div style={{ position: "fixed", inset: 0, zIndex: 199 }} onClick={() => setMenuOpen(false)} />}
    </div>
  );
}
