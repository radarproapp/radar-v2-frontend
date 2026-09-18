import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { getFeed, getOpportunities, getToday } from "../lib/api";
import { isWeeklyBriefUnlocked } from "../lib/schedule";
import { humanize } from "../lib/date";
import { layerBg, layerColor, layerLabel } from "../lib/layers";
import type { ContentType } from "../lib/types";

const BRIEF_TYPES: ContentType[] = ["Article", "Podcast", "Video", "Essay"];

function timeOfDay(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}

export function Today() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const focusQuery = useQuery({ queryKey: ["today"], queryFn: getToday });
  const briefQuery = useQuery({ queryKey: ["feed", null], queryFn: () => getFeed(null, 1, 20) });
  const oppsQuery = useQuery({ queryKey: ["opportunities", null], queryFn: () => getOpportunities(null, 1, 3) });

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
  const dailyBrief = (briefQuery.data ?? []).filter((item) => BRIEF_TYPES.includes(item.type)).slice(0, 5);
  const opportunities = oppsQuery.data ?? [];

  return (
    <div className="r-page">
      <div className="nav-greeting">
        <div className="nav-date">{dateLabel}</div>
        <h1 className="nav-good-morning">Good {timeOfDay()}, {firstName}.</h1>
        <div className="nav-tagline">Here's what matters today.</div>
      </div>

      {isWeeklyBriefUnlocked() && (
        <button className="nav-brief-banner" onClick={() => navigate("/weekly")}>
          <div className="nav-brief-meta">
            <span className="nav-brief-label">Weekly Intelligence Brief</span>
            <span className="nav-brief-time">6 min</span>
          </div>
          <div className="nav-brief-text">Your week in one place — top articles, blog posts, videos and podcasts.</div>
          <span className="nav-brief-cta">Read the brief →</span>
        </button>
      )}

      <div className="nav-section-label">TODAY'S FOCUS</div>
      <p className="nav-tagline" style={{ marginBottom: 12 }}>
        {firstName}, this is what you should be learning and the path you should follow to succeed!
      </p>

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

      <div className="nav-section-label">DAILY INTELLIGENCE BRIEF</div>
      <p className="nav-tagline" style={{ marginBottom: 12 }}>
        {firstName}, these are all the articles, podcasts, videos and news you should check out today. They'll take
        you one step closer to your goal.
      </p>

      {dailyBrief.length === 0 ? (
        <div className="nav-signal-card" style={{ cursor: "default" }}>
          <div className="nav-signal-headline">Your feed is still filling up</div>
          <div className="nav-signal-why">Check back shortly — Radar curates fresh signals for your interests throughout the day.</div>
        </div>
      ) : (
        dailyBrief.map((item) => (
          <button key={item.id} className="nav-signal-card" onClick={() => navigate(`/feed/${item.id}`)} style={{ marginBottom: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}>
              <span
                style={{
                  fontSize: 10, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase",
                  color: layerColor(item.layer), background: layerBg(item.layer), borderRadius: 5, padding: "2px 7px",
                }}
              >
                {layerLabel(item.layer)}
              </span>
              <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600 }}>{item.source}</span>
              <span style={{ fontSize: 11, color: "var(--text-faint)", marginLeft: "auto" }}>{humanize(item.publishedAt)}</span>
            </div>
            <div className="nav-signal-headline" style={{ fontSize: 15 }}>{item.signal}</div>
          </button>
        ))
      )}

      <div className="nav-section-label">OPPORTUNITIES · FOUND FOR YOU</div>
      <p className="nav-tagline" style={{ marginBottom: 12 }}>
        {firstName}, these are opportunities I found for you based on what you love. Chase these opportunities and
        make sure you get them!
      </p>

      {opportunities.length === 0 ? (
        <div className="nav-opp-card" style={{ cursor: "default" }}>
          <div className="nav-focus-title">Opportunities matched to your profile</div>
          <div className="opp-org">Radar is still finding opportunities for your interests.</div>
        </div>
      ) : (
        opportunities.map((opp) => (
          <button className="nav-opp-card" key={opp.id} onClick={() => navigate("/opportunities")} style={{ marginBottom: 10 }}>
            <div className="nav-opp-match-row">
              <span className="nav-opp-match-num">{opp.matchScorePercent}%</span>
              <span className="nav-opp-match-label">match</span>
              {opp.daysUntilDeadline !== 2147483647 && (
                <span className="nav-opp-deadline" style={{ color: "var(--red)" }}>{opp.daysUntilDeadline} days left</span>
              )}
            </div>
            <div className="nav-focus-title" style={{ marginBottom: 3 }}>{opp.title}</div>
            <div className="opp-org">{opp.organisation}</div>
          </button>
        ))
      )}

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
