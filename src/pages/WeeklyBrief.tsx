import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { LoadingSkeleton } from "../components/LoadingSkeleton";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { useAuth } from "../auth/AuthContext";
import { ApiError, getWeeklyBrief } from "../lib/api";
import { isWeeklyBriefUnlocked } from "../lib/schedule";

export function WeeklyBrief() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const unlocked = isWeeklyBriefUnlocked();
  const briefQuery = useQuery({ queryKey: ["weekly-brief"], queryFn: getWeeklyBrief, enabled: unlocked });
  const brief = briefQuery.data;

  const errorMessage = briefQuery.error instanceof ApiError ? briefQuery.error.message : "Failed to load weekly brief.";

  return (
    <div className="r-page" style={{ maxWidth: 720 }}>
      {!unlocked ? (
        <EmptyState icon="📋" title="Your weekly brief unlocks Saturday evening" description="Radar spends the week gathering your best signals, then wraps them up for you every Saturday from 6pm.">
          <button className="btn btn--primary btn--sm" onClick={() => navigate("/feed")}>
            Browse the feed
          </button>
        </EmptyState>
      ) : briefQuery.isLoading ? (
        <>
          <LoadingSkeleton variant="card" count={1} />
          <div style={{ height: 16 }} />
          <LoadingSkeleton variant="feed" count={4} />
        </>
      ) : briefQuery.isError ? (
        <ErrorState title="Failed to load weekly brief" description={errorMessage} onRetry={() => briefQuery.refetch()} />
      ) : !brief ? (
        <EmptyState icon="📋" title="No weekly brief yet" description="Check back once Radar has finished gathering this week's signals.">
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
