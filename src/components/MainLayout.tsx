import { useEffect, useState, type ReactNode } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { Icon } from "./Icon";
import { WORKSPACES, isItemActive, workspaceForPath } from "./workspaces";
import { FEED_TYPES } from "./feed-types";
import { ProfileSwitcher } from "./ProfileSwitcher";

/// The application shell: a workspace switcher, that workspace's own navigation, and the content.
///
/// This replaces a flat rail of eleven destinations that listed "Radar Intelligence" and "Feed"
/// as siblings — the same idea twice, which is why the navigation could not describe the product.
/// Now the switcher names which of the three jobs you are doing, and the sidebar shows only what
/// belongs to it. Feed is inside Intelligence, where it always belonged.
///
/// Ask is deliberately absent: it is a verb, available from anywhere, not a place to go.
type OpenPanel = "switcher" | "account" | "subnav" | null;

export function MainLayout({ children }: { children?: ReactNode } = {}) {
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();
  const [openPanel, setOpenPanel] = useState<OpenPanel>(null);

  useEffect(() => setOpenPanel(null), [pathname]);

  const lowerPath = pathname.toLowerCase();
  const showNav = !lowerPath.includes("/onboarding") && !lowerPath.includes("/login");
  const workspace = workspaceForPath(pathname);
  const currentItem = workspace.items.find((item) => isItemActive(item, pathname, workspace.items));

  // The feed list only — a single item's page keeps the workspace nav, because the types are a
  // way of browsing the list, not of reading one thing.
  const onFeed = lowerPath === "/feed";
  const currentFeedSlug = new URLSearchParams(search).get("type")?.toLowerCase() ?? undefined;

  /// What the navigation lists at this level, described once.
  ///
  /// The desktop sidebar and the mobile sheet both render this. They used to be written out
  /// separately, which is how the feed ended up with a row of chips above a sidebar saying the
  /// same seven words.
  const navRows = onFeed
    ? FEED_TYPES.map((entry) => ({
        key: entry.label,
        label: entry.label,
        icon: entry.icon,
        path: entry.slug ? `/feed?type=${entry.slug}` : "/feed",
        active: entry.slug === currentFeedSlug,
      }))
    : workspace.items.map((item) => ({
        key: item.path,
        label: item.label,
        icon: item.icon,
        path: item.path,
        active: isItemActive(item, pathname, workspace.items),
      }));

  const navLabel = navRows.find((row) => row.active)?.label ?? currentItem?.label ?? workspace.label;
  const initials = profile?.name?.trim()?.[0]?.toUpperCase() ?? "A";

  const go = (path: string) => {
    setOpenPanel(null);
    navigate(path);
  };

  const handleSignOut = () => {
    setOpenPanel(null);
    signOut();
    navigate("/login");
  };

  const switcherPanel = (
    <div className="r-nav-panel" style={{ minWidth: 232 }}>
      {WORKSPACES.map((option) => (
        <button
          key={option.id}
          className={`r-nav-panel__item ${option.id === workspace.id ? "active" : ""}`}
          onClick={() => go(option.home)}
          style={{ display: "flex", alignItems: "flex-start", gap: 10, textAlign: "left" }}
        >
          <span style={{ marginTop: 2 }}>
            <Icon name={option.icon} size={15} />
          </span>
          <span>
            <span style={{ display: "block", fontWeight: 700 }}>{option.label}</span>
            <span style={{ display: "block", fontSize: 11.5, color: "var(--text-muted)" }}>{option.tagline}</span>
          </span>
        </button>
      ))}
    </div>
  );

  const accountPanel = (
    <div className="r-nav-panel">
      {/* Profiles sit above the account actions because switching is a change of who you are on
          this account, not a setting. */}
      <ProfileSwitcher onDone={() => setOpenPanel(null)} />

      <div className="r-nav-panel__divider" />

      <button className="r-nav-panel__item" onClick={() => go("/profiles")}>
        Switch profile
      </button>
      <button className="r-nav-panel__item" onClick={() => go("/settings")}>
        Settings
      </button>
      <button className="r-nav-panel__item" onClick={() => go("/profile/edit")}>
        Your profile
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
          {/* Desktop sidebar */}
          <nav className="r-side">
            <div style={{ position: "relative" }}>
              <button
                className="r-side__switcher"
                onClick={() => setOpenPanel((v) => (v === "switcher" ? null : "switcher"))}
                aria-haspopup="menu"
                aria-expanded={openPanel === "switcher"}
              >
                <span className="r-nav__avatar">{initials}</span>
                <span className="r-side__switcher-label">{workspace.label}</span>
                <Icon name="expand" size={14} />
              </button>
              {openPanel === "switcher" && (
                <div style={{ position: "absolute", left: 0, top: "calc(100% + 6px)", zIndex: 60 }}>
                  {switcherPanel}
                </div>
              )}
            </div>

            {onFeed && (
              <button className="r-side__back" onClick={() => go("/")}>
                <Icon name="menu" size={14} />
                <span>{workspace.label}</span>
              </button>
            )}

            {onFeed && <div className="r-side__label">Feed</div>}

            <div className="r-side__items">
              {navRows.map((row) => (
                <button
                  key={row.key}
                  className={`r-side__item ${row.active ? "active" : ""}`}
                  onClick={() => go(row.path)}
                >
                  <Icon name={row.icon} size={15} />
                  <span>{row.label}</span>
                </button>
              ))}
            </div>

            <div style={{ flex: 1 }} />

            {/* Ask is an action, not a destination. */}
            <button className="r-side__item" onClick={() => go("/ask")}>
              <Icon name="chat" size={15} />
              <span>Ask Radar</span>
            </button>

            <div style={{ position: "relative" }}>
              <button
                className="r-side__item"
                onClick={() => setOpenPanel((v) => (v === "account" ? null : "account"))}
                aria-haspopup="menu"
                aria-expanded={openPanel === "account"}
              >
                <Icon name="settings" size={15} />
                <span>{profile?.name?.trim() || "Account"}</span>
              </button>
              {openPanel === "account" && (
                <div style={{ position: "absolute", left: 0, bottom: "calc(100% + 6px)", zIndex: 60 }}>
                  {accountPanel}
                </div>
              )}
            </div>
          </nav>

          {/* Mobile: the three workspaces, then account. Sub-navigation rides at the top of the
              content on small screens, where a sidebar does not fit. */}
          <nav className="r-tabbar">
            {WORKSPACES.map((option) => (
              <button
                key={option.id}
                className={`r-tabbar__item ${option.id === workspace.id ? "active" : ""}`}
                onClick={() => go(option.home)}
              >
                <Icon name={option.icon} size={21} />
                <span>{option.label.replace("Radar ", "")}</span>
              </button>
            ))}

            <button
              className="r-tabbar__item"
              onClick={() => setOpenPanel((v) => (v === "account" ? null : "account"))}
            >
              <span className="r-nav__avatar" style={{ width: 21, height: 21, fontSize: 10 }}>
                {initials}
              </span>
              <span>You</span>
            </button>

            {openPanel === "account" && (
              <div style={{ position: "fixed", right: 12, bottom: "calc(var(--tabbar-h) + 8px)" }}>{accountPanel}</div>
            )}
          </nav>
        </>
      )}

      <div className={showNav ? "r-app-content" : undefined}>
        {/* Mobile: the same two levels, as a hamburger. A row of chips scrolled off the right
            edge and, on the feed, repeated the sidebar word for word. */}
        {showNav && navRows.length > 1 && (
          <div className="r-subnav">
            <button
              className="r-subnav__toggle"
              onClick={() => setOpenPanel((v) => (v === "subnav" ? null : "subnav"))}
              aria-haspopup="menu"
              aria-expanded={openPanel === "subnav"}
            >
              <Icon name="menu" size={16} />
              <span className="r-subnav__current">{navLabel}</span>
              <Icon name="expand" size={13} />
            </button>

            {openPanel === "subnav" && (
              <div className="r-subnav__sheet" role="menu">
                {onFeed && (
                  <button className="r-subnav__row" role="menuitem" onClick={() => go("/")}>
                    <Icon name="menu" size={15} />
                    <span>{workspace.label}</span>
                  </button>
                )}

                {navRows.map((row) => (
                  <button
                    key={row.key}
                    role="menuitem"
                    className={`r-subnav__row ${row.active ? "active" : ""}`}
                    onClick={() => go(row.path)}
                  >
                    <Icon name={row.icon} size={15} />
                    <span>{row.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {children ?? <Outlet />}
      </div>

      {/* Outside-click catcher. Stays below the sidebar and tabbar (z-index 50) so it cannot
          swallow clicks on the panels it is meant to dismiss. */}
      {openPanel && <div style={{ position: "fixed", inset: 0, zIndex: 40 }} onClick={() => setOpenPanel(null)} />}
    </div>
  );
}
