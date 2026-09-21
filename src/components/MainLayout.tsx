import { useEffect, useState, type ReactNode } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { IconAsk, IconFeed, IconLearn, IconMore, IconSaved, IconToday } from "./NavIcons";

const PRIMARY_LINKS = [
  { label: "Today", path: "/", icon: IconToday, match: (p: string) => p === "/" },
  { label: "Feed", path: "/feed", icon: IconFeed, match: (p: string) => p.includes("/feed") },
  { label: "Learn", path: "/learn", icon: IconLearn, match: (p: string) => ["/learn", "/roadmap", "/lesson", "/progress"].some((s) => p.includes(s)) },
  { label: "Saved", path: "/saved", icon: IconSaved, match: (p: string) => p.includes("/saved") },
  { label: "Ask", path: "/ask", icon: IconAsk, match: (p: string) => p.includes("/ask") },
];

const MORE_LINKS: { label: string; path: string }[] = [
  { label: "Clips", path: "/clips" },
  { label: "Capture", path: "/capture" },
  { label: "Opportunities", path: "/opportunities" },
  { label: "Notebook", path: "/notebook" },
  { label: "Research", path: "/research" },
  { label: "Library", path: "/library" },
  { label: "Mentor", path: "/mentor" },
];

const MORE_PATH_HINTS = ["/clips", "/capture", "/opportunities", "/notebook", "/projects", "/research", "/library", "/mentor", "/weekly", "/source", "/topic", "/compare"];

function isMoreActive(pathname: string): boolean {
  const p = pathname.toLowerCase();
  return MORE_PATH_HINTS.some((s) => p.includes(s));
}

type OpenPanel = "more" | "account" | null;

export function MainLayout({ children }: { children?: ReactNode } = {}) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();
  const [openPanel, setOpenPanel] = useState<OpenPanel>(null);

  useEffect(() => setOpenPanel(null), [pathname]);

  const showNav = !pathname.toLowerCase().includes("/onboarding") && !pathname.toLowerCase().includes("/login");
  const initials = profile?.name?.trim()?.[0]?.toUpperCase() ?? "A";
  const moreActive = isMoreActive(pathname);
  const lowerPath = pathname.toLowerCase();

  const go = (path: string) => {
    setOpenPanel(null);
    navigate(path);
  };

  const handleSignOut = () => {
    setOpenPanel(null);
    signOut();
    navigate("/login");
  };

  const morePanel = (
    <div className="r-nav-panel">
      {MORE_LINKS.map((link) => (
        <button
          key={link.path}
          className={`r-nav-panel__item ${lowerPath.includes(link.path) ? "active" : ""}`}
          onClick={() => go(link.path)}
        >
          {link.label}
        </button>
      ))}
    </div>
  );

  const accountPanel = (
    <div className="r-nav-panel">
      <button className="r-nav-panel__item" onClick={() => go("/settings")}>
        Settings
      </button>
      <div className="r-nav-panel__divider" />
      <button className="r-nav-panel__item danger" onClick={handleSignOut}>
        Sign out
      </button>
    </div>
  );

  return (
    <div style={{ minHeight: "100dvh" }}>
      {showNav && (
        <>
          {/* Desktop icon rail */}
          <nav className="r-rail">
            <Link to="/" className="r-rail__brand">
              R
            </Link>

            <div className="r-rail__links">
              {PRIMARY_LINKS.map((link) => {
                const Icon = link.icon;
                const active = link.match(lowerPath);
                return (
                  <button key={link.path} className={`r-rail__item ${active ? "active" : ""}`} onClick={() => go(link.path)}>
                    <Icon />
                    <span>{link.label}</span>
                  </button>
                );
              })}

              <div style={{ position: "relative" }}>
                <button
                  className={`r-rail__item ${moreActive ? "active" : ""}`}
                  onClick={() => setOpenPanel((v) => (v === "more" ? null : "more"))}
                >
                  <IconMore />
                  <span>More</span>
                </button>
                {openPanel === "more" && (
                  <div style={{ position: "absolute", left: "calc(100% + 10px)", top: 0 }}>{morePanel}</div>
                )}
              </div>
            </div>

            <div className="r-rail__spacer" />

            <div style={{ position: "relative" }}>
              <button
                className="r-nav__avatar"
                title="Account"
                onClick={() => setOpenPanel((v) => (v === "account" ? null : "account"))}
              >
                {initials}
              </button>
              {openPanel === "account" && (
                <div style={{ position: "absolute", left: "calc(100% + 10px)", bottom: 0 }}>{accountPanel}</div>
              )}
            </div>
          </nav>

          {/* Mobile bottom tab bar */}
          <nav className="r-tabbar">
            {PRIMARY_LINKS.map((link) => {
              const Icon = link.icon;
              const active = link.match(lowerPath);
              return (
                <button key={link.path} className={`r-tabbar__item ${active ? "active" : ""}`} onClick={() => go(link.path)}>
                  <Icon size={22} />
                  <span>{link.label}</span>
                </button>
              );
            })}

            <button
              className={`r-tabbar__item ${moreActive ? "active" : ""}`}
              onClick={() => setOpenPanel((v) => (v === "more" ? null : "more"))}
            >
              <IconMore size={22} />
              <span>More</span>
            </button>

            <button
              className="r-tabbar__item"
              onClick={() => setOpenPanel((v) => (v === "account" ? null : "account"))}
            >
              <span className="r-nav__avatar" style={{ width: 22, height: 22, fontSize: 10 }}>
                {initials}
              </span>
              <span>You</span>
            </button>

            {openPanel === "more" && (
              <div style={{ position: "fixed", right: 12, bottom: "calc(var(--tabbar-h) + 8px)" }}>{morePanel}</div>
            )}
            {openPanel === "account" && (
              <div style={{ position: "fixed", right: 12, bottom: "calc(var(--tabbar-h) + 8px)" }}>{accountPanel}</div>
            )}
          </nav>
        </>
      )}

      <div className={showNav ? "r-app-content" : undefined}>
        {children ?? <Outlet />}
      </div>

      {openPanel && <div style={{ position: "fixed", inset: 0, zIndex: 199 }} onClick={() => setOpenPanel(null)} />}
    </div>
  );
}
