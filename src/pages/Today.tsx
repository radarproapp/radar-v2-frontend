import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { getToday } from "../lib/api";

function timeOfDay(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}

function personaLabel(persona: string): string {
  return persona === "YoungProfessional" ? "Young Professional" : persona;
}

export function Today() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const focusQuery = useQuery({ queryKey: ["today"], queryFn: getToday });

  const focus = focusQuery.data;

  if (!focus || !profile) {
    return (
      <div className="r-page">
        <div className="r-empty">
          <div className="r-spinner" />
        </div>
      </div>
    );
  }

  const firstName = profile.name.split(" ")[0] || "there";
  const dateLabel = new Date().toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "long" });
  const weekday = new Date().toLocaleDateString("en-US", { weekday: "long" });

  const openReadItem = () => {
    if (focus.read.contentItemId) navigate(`/feed/${focus.read.contentItemId}`);
    else navigate("/feed");
  };

  return (
    <div className="r-page">
      <div className="nav-greeting">
        <div className="nav-date">{dateLabel}</div>
        <h1 className="nav-good-morning">Good {timeOfDay()}, {firstName}.</h1>
        <div className="nav-tagline">Here's what matters today.</div>
      </div>

      <button className="nav-brief-banner" onClick={() => navigate("/weekly")}>
        <div className="nav-brief-meta">
          <span className="nav-brief-label">Weekly Intelligence Brief · {weekday}</span>
          <span className="nav-brief-time">6 min</span>
        </div>
        <div className="nav-brief-text">
          Your week in one place — top opportunities, articles, papers, videos and podcasts.
        </div>
        <span className="nav-brief-cta">Read the brief →</span>
      </button>

      <div className="nav-section-label">TODAY'S FOCUS</div>

      <button className="nav-focus-card nav-focus-card--active" onClick={() => navigate("/learn")}>
        <div className="nav-focus-label">LEARN</div>
        <div className="nav-focus-title">{focus.learn.title}</div>
        <div className="nav-focus-sub">{focus.learn.subtitle}</div>
        <div className="nav-focus-meta">
          <span className="btn btn--primary btn--sm">Start →</span>
          {focus.learn.estimatedTime && (
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{focus.learn.estimatedTime} today</span>
          )}
        </div>
      </button>

      <div className="nav-section-label">YOUR SIGNAL</div>

      <button className="nav-signal-card" onClick={openReadItem}>
        <div className="nav-signal-headline">{focus.read.title}</div>
        <div className="nav-signal-section-label">Why it matters</div>
        <div className="nav-signal-why">{focus.read.whyItMatters}</div>
        <div className="nav-signal-edge">
          <div className="nav-signal-edge-label">Your edge</div>
          <div className="nav-signal-edge-text">{focus.read.aiSummary}</div>
        </div>
        <div className="nav-signal-actions">
          <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--cyan)" }}>Understand →</span>
          <span style={{ fontSize: 11.5, color: "var(--text-faint)", fontWeight: 600 }}>{focus.read.subtitle}</span>
        </div>
      </button>

      <div className="nav-section-label">OPPORTUNITY · FOUND FOR YOU</div>

      <button className="nav-opp-card" onClick={() => navigate("/opportunities")}>
        <div className="nav-opp-match-row">
          <span className="nav-opp-match-num">{focus.apply.matchScorePercent}%</span>
          <span className="nav-opp-match-label">match</span>
          {focus.apply.deadlineDays != null && (
            <span className="nav-opp-deadline" style={{ color: "var(--red)" }}>{focus.apply.deadlineDays} days left</span>
          )}
        </div>
        <div className="nav-focus-title" style={{ marginBottom: 3 }}>{focus.apply.title}</div>
        <div className="opp-org" style={{ marginBottom: 14 }}>{focus.apply.subtitle}</div>
        <div className="nav-opp-reasons">
          <div className="nav-opp-reasons-label">Why Radar matched you</div>
          <div className="nav-opp-reason">Your goal · {profile.primaryGoal}</div>
          <div className="nav-opp-reason">Your interests · {profile.interests.slice(0, 2).join(" + ")}</div>
          <div className="nav-opp-reason">Your profile · {personaLabel(profile.persona)}</div>
        </div>
        <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--cyan)" }}>Explore →</span>
      </button>

      <div className="nav-section-label">YOUR NEXT MOVE</div>

      <button className="nav-next-move" onClick={() => navigate("/learn")}>
        <div className="nav-next-move-title">{focus.build.title}</div>
        <div className="nav-next-move-desc">
          One practical action that turns what you have learned into something you can show.
        </div>
        <span className="nav-next-move-link">Open Project Studio →</span>
      </button>

      <div className="nav-momentum">
        <div className="nav-momentum-label">YOUR MOMENTUM</div>
        <div className="nav-momentum-stats">
          <div>
            <div className="nav-momentum-stat-val">{profile.stats.learningStreakDays}-day</div>
            <div className="nav-momentum-stat-label">Learning streak</div>
          </div>
          <div>
            <div className="nav-momentum-stat-val">{profile.stats.roadmapProgressPercent}%</div>
            <div className="nav-momentum-stat-label">Roadmap complete</div>
          </div>
          <div>
            <div className="nav-momentum-stat-val">{profile.stats.savedResourcesCount}</div>
            <div className="nav-momentum-stat-label">Resources saved</div>
          </div>
          <div>
            <div className="nav-momentum-stat-val">{profile.stats.projectsCompleted}</div>
            <div className="nav-momentum-stat-label">Projects built</div>
          </div>
          <div>
            <div className="nav-momentum-stat-val">{profile.stats.opportunitiesApplied}</div>
            <div className="nav-momentum-stat-label">Opportunities explored</div>
          </div>
        </div>
      </div>

      <div className="nav-caught-up">
        <div className="nav-caught-up-title">You're caught up.</div>
        <div className="nav-caught-up-sub">5 signals worth your attention today. Radar will have more tomorrow.</div>
      </div>

      <button className="nav-ask-bar" onClick={() => navigate("/ask")}>
        <div className="nav-ask-icon">?</div>
        <span className="nav-ask-input">Ask Radar anything…</span>
      </button>
    </div>
  );
}
