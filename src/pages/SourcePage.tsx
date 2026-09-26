import { useParams, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LoadingSkeleton } from "../components/LoadingSkeleton";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { ApiError, getSource, toggleSourceFollow, toggleSourcePrioritise, toggleSourceWeeklyBrief } from "../lib/api";
import { humanize } from "../lib/date";
import type { SourceProfile } from "../lib/types";

export function SourcePage() {
  const { sourceId = "" } = useParams<{ sourceId: string }>();
  const queryClient = useQueryClient();
  const queryKey = ["source", sourceId];
  const sourceQuery = useQuery({ queryKey, queryFn: () => getSource(sourceId) });

  const current = sourceQuery.data;
  const errorMessage = sourceQuery.error instanceof ApiError ? sourceQuery.error.message : "Could not load source.";

  const patch = (changes: Partial<SourceProfile>) =>
    queryClient.setQueryData<SourceProfile>(queryKey, (old) => (old ? { ...old, ...changes } : old));

  const toggleFollow = async () => {
    if (!current) return;
    patch({ isFollowing: !current.isFollowing });
    await toggleSourceFollow(current.id);
  };

  const toggleWeeklyBrief = async () => {
    if (!current) return;
    patch({ includeInWeeklyBrief: !current.includeInWeeklyBrief });
    await toggleSourceWeeklyBrief(current.id);
  };

  const togglePrioritise = async () => {
    if (!current) return;
    patch({ prioritiseInFeed: !current.prioritiseInFeed });
    await toggleSourcePrioritise(current.id);
  };

  return (
    <div className="r-page">
      {sourceQuery.isError ? (
        <ErrorState title="Failed to load source" description={errorMessage} onRetry={() => sourceQuery.refetch()} />
      ) : !current ? (
        <>
          <LoadingSkeleton variant="stats" />
          <div style={{ height: 16 }} />
          <LoadingSkeleton variant="feed" count={2} />
        </>
      ) : (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
            <div style={{ flex: 1 }}>
              <h1 className="r-page-title">{current.name}</h1>
            </div>
            <button className={`btn ${current.isFollowing ? "btn--primary" : ""} btn--sm`} onClick={toggleFollow}>
              {current.isFollowing ? "Following" : "Follow"}
            </button>
          </div>

          <div style={{ background: "#fff", border: "1px solid rgba(20,24,31,.1)", borderRadius: 16, padding: 22, marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 12,
                  background: "var(--cyan-light)",
                  color: "var(--cyan-deep)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: "var(--font-display)",
                  fontWeight: 700,
                  fontSize: 15,
                  flex: "none",
                }}
              >
                {current.abbreviation}
              </div>
              <div style={{ minWidth: 0 }}>
                <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.2rem", lineHeight: 1.25, marginBottom: 3 }}>{current.name}</h1>
                <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600 }}>
                  {current.type} · {current.domain}
                </div>
              </div>
            </div>
            <div style={{ background: "#f6f8f9", borderRadius: 12, padding: "15px 17px" }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--text-faint)", marginBottom: 7 }}>
                WHY RADAR TRUSTS THIS SOURCE
              </div>
              <div style={{ fontSize: 13, color: "#374151", lineHeight: 1.7 }}>{current.trustNote}</div>
            </div>
          </div>

          {current.aiEdge && (
            <div style={{ background: "var(--cyan-light)", borderRadius: 14, padding: "17px 19px", marginBottom: 20 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--cyan-deep)", marginBottom: 6 }}>
                YOUR EDGE
              </div>
              <div style={{ fontSize: 13, color: "#0d3d40", lineHeight: 1.7 }}>{current.aiEdge}</div>
            </div>
          )}

          <div className="source-stats" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 20 }}>
            <div style={{ textAlign: "center", padding: "15px 8px", borderRadius: 13, background: "#fff", border: "1px solid rgba(20,24,31,.1)" }}>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.3rem", color: "var(--cyan-deep)", lineHeight: 1, marginBottom: 5 }}>
                {current.itemsInRadar}
              </div>
              <div style={{ fontSize: 10.5, fontWeight: 600, color: "var(--text-muted)" }}>Items in Radar</div>
            </div>
            <div style={{ textAlign: "center", padding: "15px 8px", borderRadius: 13, background: "#fff", border: "1px solid rgba(20,24,31,.1)" }}>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.3rem", color: "var(--cyan-deep)", lineHeight: 1, marginBottom: 5 }}>
                {current.itemsRead}
              </div>
              <div style={{ fontSize: 10.5, fontWeight: 600, color: "var(--text-muted)" }}>You have read</div>
            </div>
            <div style={{ textAlign: "center", padding: "15px 8px", borderRadius: 13, background: "#fff", border: "1px solid rgba(20,24,31,.1)" }}>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.3rem", color: "var(--cyan-deep)", lineHeight: 1, marginBottom: 5 }}>
                {current.publishFrequency}
              </div>
              <div style={{ fontSize: 10.5, fontWeight: 600, color: "var(--text-muted)" }}>Publishes</div>
            </div>
          </div>

          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".07em", textTransform: "uppercase", color: "var(--text-faint)", marginBottom: 10 }}>
            RECENT FROM THIS SOURCE
          </div>
          {current.recentItems.length === 0 ? (
            <EmptyState icon="📄" title="No recent items" description="This source hasn't published anything recently." compact />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 9, marginBottom: 20 }}>
              {current.recentItems.map((item) => (
                <Link
                  key={item.id}
                  to={`/feed/${item.id}`}
                  style={{ display: "block", background: "#fff", border: "1px solid rgba(20,24,31,.1)", borderRadius: 14, padding: "16px 18px", textDecoration: "none", color: "inherit" }}
                >
                  <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14, lineHeight: 1.4, marginBottom: 4 }}>{item.signal}</div>
                  <div style={{ fontSize: 11.5, color: "var(--text-muted)", fontWeight: 600 }}>{humanize(item.publishedAt)}</div>
                </Link>
              ))}
            </div>
          )}

          <div style={{ background: "#fff", border: "1px solid rgba(20,24,31,.1)", borderRadius: 14, padding: "18px 20px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".07em", textTransform: "uppercase", color: "var(--text-faint)", marginBottom: 12 }}>
              FOLLOWING SETTINGS
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                paddingBottom: 14,
                borderBottom: "1px solid rgba(20,24,31,.06)",
                marginBottom: 14,
              }}
            >
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 700 }}>Include in my weekly brief</div>
                <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>About two items a week</div>
              </div>
              <button
                onClick={toggleWeeklyBrief}
                style={{
                  width: 42,
                  height: 24,
                  borderRadius: 99,
                  border: "none",
                  background: current.includeInWeeklyBrief ? "var(--cyan)" : "rgba(20,24,31,.16)",
                  position: "relative",
                  flex: "none",
                  cursor: "pointer",
                }}
              >
                <div
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: "50%",
                    background: "#fff",
                    position: "absolute",
                    top: 3,
                    left: current.includeInWeeklyBrief ? 21 : 3,
                    transition: "left .15s",
                  }}
                />
              </button>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 700 }}>Prioritise in my feed</div>
                <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>Rank above other sources</div>
              </div>
              <button
                onClick={togglePrioritise}
                style={{
                  width: 42,
                  height: 24,
                  borderRadius: 99,
                  border: "none",
                  background: current.prioritiseInFeed ? "var(--cyan)" : "rgba(20,24,31,.16)",
                  position: "relative",
                  flex: "none",
                  cursor: "pointer",
                }}
              >
                <div
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: "50%",
                    background: "#fff",
                    position: "absolute",
                    top: 3,
                    left: current.prioritiseInFeed ? 21 : 3,
                    transition: "left .15s",
                  }}
                />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
