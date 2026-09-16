import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { LoadingSkeleton } from "../components/LoadingSkeleton";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { useAuth } from "../auth/AuthContext";
import { ApiError, getWeeklyBrief } from "../lib/api";

export function WeeklyBrief() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const briefQuery = useQuery({ queryKey: ["weekly-brief"], queryFn: getWeeklyBrief });
  const brief = briefQuery.data;

  const errorMessage = briefQuery.error instanceof ApiError ? briefQuery.error.message : "Failed to load weekly brief.";

  return (
    <div className="r-page" style={{ maxWidth: 720 }}>
      {briefQuery.isLoading ? (
        <>
          <LoadingSkeleton variant="card" count={1} />
          <div style={{ height: 16 }} />
          <LoadingSkeleton variant="feed" count={4} />
        </>
      ) : briefQuery.isError ? (
        <ErrorState title="Failed to load weekly brief" description={errorMessage} onRetry={() => briefQuery.refetch()} />
      ) : !brief ? (
        <EmptyState icon="📋" title="No weekly brief yet" description="Your first weekly brief will arrive on Monday. Check back then.">
          <button className="btn btn--primary btn--sm" onClick={() => navigate("/feed")}>
            Browse the feed
          </button>
        </EmptyState>
      ) : (
        <>
          <button
            style={{ fontSize: 13, fontWeight: 700, color: "var(--cyan)", background: "none", border: "none", padding: 0, marginBottom: 18, cursor: "pointer" }}
            onClick={() => navigate("/")}
          >
            ← Navigator
          </button>

          <div className="r-kicker">WEEKLY INTELLIGENCE BRIEF</div>
          <h1 className="r-page-title" style={{ marginBottom: 10 }}>
            Week of {new Date(brief.weekOf).toLocaleDateString("en-US", { day: "numeric", month: "long" })}
          </h1>
          <p className="r-page-sub" style={{ marginBottom: 22 }}>
            Everything worth your attention this week, chosen against{" "}
            <strong style={{ color: "var(--cyan-deep)" }}>{profile?.primaryGoal ?? "your goal"}</strong>.
          </p>

          <div className="weekly-rec">
            <div className="weekly-rec-label">THIS WEEK'S RECOMMENDATION</div>
            <div className="weekly-rec-text">{brief.weeklyRecommendation}</div>
          </div>

          {brief.topOpportunities.length > 0 && (
            <div className="weekly-section">
              <div className="weekly-section-label">TOP OPPORTUNITIES</div>
              {brief.topOpportunities.map((opp) => (
                <button className="weekly-item" key={opp.id} onClick={() => navigate("/opportunities")}>
                  <div className="weekly-item-meta">
                    {opp.type} · {opp.daysUntilDeadline} days left · {opp.matchScorePercent}% match
                  </div>
                  <div className="weekly-item-title">
                    {opp.title} — {opp.organisation}
                  </div>
                </button>
              ))}
            </div>
          )}

          {brief.topArticles.length > 0 && (
            <div className="weekly-section">
              <div className="weekly-section-label">TOP ARTICLES</div>
              {brief.topArticles.map((item) => (
                <button className="weekly-item" key={item.id} onClick={() => navigate(`/feed/${item.id}`)}>
                  <div className="weekly-item-meta">
                    {item.source} · {item.estimatedReadTime}
                  </div>
                  <div className="weekly-item-title">{item.signal}</div>
                </button>
              ))}
            </div>
          )}

          {brief.topResearchPapers.length > 0 && (
            <div className="weekly-section">
              <div className="weekly-section-label">TOP RESEARCH PAPERS</div>
              {brief.topResearchPapers.map((item) => (
                <button className="weekly-item" key={item.id} onClick={() => navigate(`/feed/${item.id}`)}>
                  <div className="weekly-item-meta">
                    {item.journal} · {new Date(item.publishedAt).getFullYear()}
                  </div>
                  <div className="weekly-item-title">{item.signal}</div>
                </button>
              ))}
            </div>
          )}

          {brief.topVideos.length > 0 && (
            <div className="weekly-section">
              <div className="weekly-section-label">TOP VIDEOS</div>
              {brief.topVideos.map((item) => (
                <button className="weekly-item" key={item.id} onClick={() => navigate(`/feed/${item.id}`)}>
                  <div className="weekly-item-meta">
                    {item.source} · {item.estimatedWatchTime}
                  </div>
                  <div className="weekly-item-title">{item.signal}</div>
                </button>
              ))}
            </div>
          )}

          {brief.topPodcasts.length > 0 && (
            <div className="weekly-section">
              <div className="weekly-section-label">TOP PODCASTS</div>
              {brief.topPodcasts.map((item) => (
                <button className="weekly-item" key={item.id} onClick={() => navigate(`/feed/${item.id}`)}>
                  <div className="weekly-item-meta">
                    {item.source} · {item.estimatedReadTime}
                  </div>
                  <div className="weekly-item-title">{item.signal}</div>
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
