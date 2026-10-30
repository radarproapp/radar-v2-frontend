import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { getHome } from "../lib/api";
import { humanize } from "../lib/date";
import { layerBg, layerColor, layerLabel } from "../lib/layers";
import { LoadingSkeleton } from "./LoadingSkeleton";
import { InterestControls } from "./InterestControls";

/// The signed-in home screen, shared by every persona.
///
/// The screen this replaced was a hand-written mock: "Option A: Internal Promotion", "$225k+
/// impact", "Kuda Microfinance Bank" were string literals, identical for every user regardless of
/// what they picked at onboarding. The reviewer's response was "when I picked cybersecurity, how
/// do all these relate?" — and they were right, because nothing on it was derived from them.
///
/// Two rules hold here:
///  1. Every section is rendered from /api/home, which computes from the user's own profile,
///     roadmap, behaviour and real ingested content.
///  2. A section Radar cannot ground is omitted, not filled with plausible-sounding copy.
export function HomeBriefView({ firstName }: { firstName: string }) {
  const navigate = useNavigate();
  const { data: brief, isLoading, isError } = useQuery({ queryKey: ["home"], queryFn: getHome });

  if (isLoading) return <LoadingSkeleton />;

  if (isError || !brief) {
    return (
      <div className="r-page">
        <div className="nav-greeting">
          <h1 className="nav-good-morning">Good day, {firstName}</h1>
          <div className="nav-tagline">Radar couldn't load your brief just now. Pull to refresh, or try again shortly.</div>
        </div>
      </div>
    );
  }

  const dateLabel = new Date().toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "long" });

  // Read defensively, every list and every nested object.
  //
  // A section the server omits for one account used to take the whole screen with it: reading
  // .length off a list that is not there throws during render, and this is the first screen
  // after signing in. The same shape of bug was found on the opportunities page the same day,
  // where one missing count blanked the page. A brief with a section missing should show the
  // sections it does have.
  const topSignals = brief.topSignals ?? [];
  const noticed = brief.noticed ?? [];
  const opportunities = brief.opportunities ?? [];
  const closingSoon = brief.closingSoon ?? [];
  const focus = brief.todaysFocus ?? null;
  const nextBuild = brief.nextBuild ?? null;
  const stats = brief.stats;

  const hasAnything =
    topSignals.length > 0 ||
    noticed.length > 0 ||
    focus !== null ||
    opportunities.length > 0 ||
    closingSoon.length > 0;

  return (
    <div className="r-page">
      <div className="nav-greeting">
        <div className="nav-date">{dateLabel}</div>
        <h1 className="nav-good-morning">Good day, {firstName}</h1>
        {brief.context && <div className="nav-tagline">{brief.context}</div>}

        {/* Radar Intelligence is a workspace of seven screens and this is its home, so this is
            where somebody looks to change what it follows - the same place Radar Learn puts the
            control that changes a path. It is on the feed too; this is the screen they land on. */}
        <InterestControls />
      </div>

      {/* 1. The three things that matter today — the central ask: "what are the top three things
          a professional should see when they open Radar, based on what they picked?" */}
      {topSignals.length > 0 && (
        <>
          <div className="nav-section-label">WHAT MATTERS TO YOU TODAY</div>
          {topSignals.map((item) => (
            <button
              key={item.contentItemId}
              className="nav-signal-card"
              onClick={() => navigate(`/feed/${item.contentItemId}`)}
              style={{ marginBottom: 10 }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8, flexWrap: "wrap" }}>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: ".06em",
                    textTransform: "uppercase",
                    color: layerColor(item.layer),
                    background: layerBg(item.layer),
                    borderRadius: 5,
                    padding: "2px 7px",
                  }}
                >
                  {layerLabel(item.layer)}
                </span>
                <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600 }}>{item.source}</span>
                <span style={{ fontSize: 11, color: "var(--text-faint)", marginLeft: "auto" }}>
                  {humanize(item.publishedAt)}
                </span>
              </div>
              <div className="nav-signal-headline" style={{ fontSize: 15 }}>{item.signal}</div>
              <div className="nav-signal-why">{item.whyYoureSeeingThis}</div>
            </button>
          ))}
        </>
      )}

      {/* 2. Radar noticed — what the user keeps returning to, from observed behaviour only. */}
      {noticed.length > 0 && (
        <>
          <div className="nav-section-label">RADAR NOTICED</div>
          {noticed.map((n) => (
            <button
              key={n.term}
              className="nav-signal-card"
              onClick={() => navigate(n.actionUrl)}
              style={{ marginBottom: 10 }}
            >
              <div className="nav-signal-headline" style={{ fontSize: 15 }}>{n.suggestion}</div>
              <div className="nav-signal-why">
                {n.timesEngaged} {n.timesEngaged === 1 ? "interaction" : "interactions"} so far
              </div>
            </button>
          ))}
        </>
      )}

      {/* 3. Today's focus — names the actual topic. "Continue your learning path" was the
             complaint; if there is no roadmap to name one from, this section does not render. */}
      {focus && (
        <>
          <div className="nav-section-label">TODAY'S FOCUS</div>
          <button className="nav-focus-card nav-focus-card--active" onClick={() => navigate(focus.actionUrl)}>
            <div className="nav-focus-label">{(focus.stage ?? "").toUpperCase()}</div>
            <div className="nav-focus-title">{focus.topic}</div>
            <div className="nav-focus-sub">{focus.why}</div>
            <div className="nav-focus-meta">
              <span className="btn btn--primary btn--sm">Start →</span>
              {focus.estimatedTime && (
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{focus.estimatedTime}</span>
              )}
            </div>
          </button>
        </>
      )}

      {/* 3b. Reminders the user set. Above the general list on purpose: these are deadlines
             they chose to track, and they are about to pass. */}
      {closingSoon.length > 0 && (
        <>
          <div className="nav-section-label">CLOSING SOON — YOU ASKED TO BE REMINDED</div>
          {closingSoon.map((opp) => (
            <button
              className="nav-opp-card"
              key={opp.id}
              onClick={() => navigate("/opportunities")}
              style={{ marginBottom: 10 }}
            >
              <div className="nav-opp-match-row">
                <span className="nav-opp-deadline" style={{ color: "var(--red)" }}>
                  {opp.daysUntilDeadline === 0
                    ? "Closes today"
                    : opp.daysUntilDeadline === 1
                      ? "Closes tomorrow"
                      : `${opp.daysUntilDeadline} days left`}
                </span>
              </div>
              <div className="nav-focus-title" style={{ marginBottom: 3 }}>{opp.title}</div>
              <div className="opp-org">
                {opp.organisation}
                {opp.location ? ` · ${opp.location}` : ""}
              </div>
            </button>
          ))}
        </>
      )}

      {/* 4. Opportunities — each with the specific reason it matched. */}
      {opportunities.length > 0 && (
        <>
          <div className="nav-section-label">OPPORTUNITIES FOR YOU</div>
          {opportunities.map((opp) => (
            <button
              className="nav-opp-card"
              key={opp.id}
              onClick={() => navigate("/opportunities")}
              style={{ marginBottom: 10 }}
            >
              <div className="nav-opp-match-row">
                <span className="nav-opp-match-num">{opp.matchScorePercent}%</span>
                <span className="nav-opp-match-label">match</span>
                {opp.daysUntilDeadline != null && (
                  <span className="nav-opp-deadline" style={{ color: opp.daysUntilDeadline <= 7 ? "var(--red)" : undefined }}>
                    {opp.daysUntilDeadline} days left
                  </span>
                )}
              </div>
              <div className="nav-focus-title" style={{ marginBottom: 3 }}>{opp.title}</div>
              <div className="opp-org">
                {opp.organisation}
                {opp.location ? ` · ${opp.location}` : ""}
              </div>
              {opp.whyItMatches && <div className="nav-signal-why">{opp.whyItMatches}</div>}
            </button>
          ))}
        </>
      )}

      {/* 5. Next build — names the artifact, not "something you can show". */}
      {nextBuild && (
        <>
          <div className="nav-section-label">YOUR NEXT MOVE</div>
          <button className="nav-next-move" onClick={() => navigate(nextBuild.actionUrl)}>
            <div className="nav-next-move-title">Build {nextBuild.artifact}</div>
            <div className="nav-next-move-desc">{nextBuild.why}</div>
            <span className="nav-next-move-link">Open Project Studio →</span>
          </button>
        </>
      )}

      {!hasAnything && (
        <div className="nav-signal-card" style={{ cursor: "default" }}>
          <div className="nav-signal-headline">Radar is still building your brief</div>
          <div className="nav-signal-why">
            It takes a little while to gather content against your interests. Check back shortly — or open the feed to
            start exploring.
          </div>
        </div>
      )}

      <div className="nav-momentum">
        <div className="nav-momentum-label">YOUR MOMENTUM</div>
        <div className="nav-momentum-stats">
          <div>
            <div className="nav-momentum-stat-val">{stats?.learningStreakDays ?? 0}-day</div>
            <div className="nav-momentum-stat-label">Learning streak</div>
          </div>
          <div>
            <div className="nav-momentum-stat-val">{stats?.roadmapProgressPercent ?? 0}%</div>
            <div className="nav-momentum-stat-label">Roadmap complete</div>
          </div>
          <div>
            <div className="nav-momentum-stat-val">{stats?.savedResourcesCount ?? 0}</div>
            <div className="nav-momentum-stat-label">Resources saved</div>
          </div>
          <div>
            <div className="nav-momentum-stat-val">{stats?.projectsCompleted ?? 0}</div>
            <div className="nav-momentum-stat-label">Projects built</div>
          </div>
        </div>
      </div>

      <button className="nav-ask-bar" onClick={() => navigate("/ask")}>
        <div className="nav-ask-icon">?</div>
        <span className="nav-ask-input">Ask Radar anything…</span>
      </button>
    </div>
  );
}
