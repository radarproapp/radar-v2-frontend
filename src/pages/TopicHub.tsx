import { useParams, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LoadingSkeleton } from "../components/LoadingSkeleton";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { ApiError, getTopic, toggleTopicAlert, toggleTopicFollow } from "../lib/api";
import { humanize } from "../lib/date";
import type { TopicProfile } from "../lib/types";

export function TopicHub() {
  const { topicId = "" } = useParams<{ topicId: string }>();
  const queryClient = useQueryClient();
  const queryKey = ["topic", topicId];
  const topicQuery = useQuery({ queryKey, queryFn: () => getTopic(topicId) });

  const current = topicQuery.data;
  const errorMessage = topicQuery.error instanceof ApiError ? topicQuery.error.message : "Could not load topic.";

  const patch = (changes: Partial<TopicProfile>) =>
    queryClient.setQueryData<TopicProfile>(queryKey, (old) => (old ? { ...old, ...changes } : old));

  const toggleFollow = async () => {
    if (!current) return;
    patch({ isFollowing: !current.isFollowing });
    await toggleTopicFollow(current.id);
  };

  const toggleAlert = async (index: number) => {
    if (!current) return;
    const alerts = current.alerts.map((a, i) => (i === index ? { ...a, isEnabled: !a.isEnabled } : a));
    patch({ alerts });
    await toggleTopicAlert(current.id, index);
  };

  return (
    <div className="r-page">
      {topicQuery.isError ? (
        <ErrorState title="Failed to load topic" description={errorMessage} onRetry={() => topicQuery.refetch()} />
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
              <div className="r-kicker">TOPIC</div>
              <h1 className="r-page-title">{current.name}</h1>
            </div>
            <button className={`btn ${current.isFollowing ? "btn--primary" : ""} btn--sm`} onClick={toggleFollow}>
              {current.isFollowing ? "Following" : "Follow"}
            </button>
          </div>

          <div style={{ background: "var(--navy)", borderRadius: 16, padding: "20px 22px", color: "#fff", marginBottom: 14 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--cyan-bright)", marginBottom: 9 }}>
              WHERE THIS TOPIC STANDS
            </div>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 15, lineHeight: 1.5, marginBottom: 12 }}>{current.summary}</div>
            <div style={{ fontSize: 11.5, color: "rgba(255,255,255,.42)" }}>{current.summarySource}</div>
          </div>

          {current.aiEdge && (
            <div style={{ background: "var(--cyan-light)", borderRadius: 14, padding: "17px 19px", marginBottom: 20 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--cyan-deep)", marginBottom: 6 }}>
                YOUR EDGE
              </div>
              <div style={{ fontSize: 13, color: "#0d3d40", lineHeight: 1.7 }}>{current.aiEdge}</div>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 20 }}>
            <div style={{ textAlign: "center", padding: "15px 8px", borderRadius: 13, background: "#fff", border: "1px solid rgba(20,24,31,.1)" }}>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.3rem", color: "var(--cyan-deep)", lineHeight: 1, marginBottom: 5 }}>
                {current.itemsInRadar}
              </div>
              <div style={{ fontSize: 10.5, fontWeight: 600, color: "var(--text-muted)" }}>Items in Radar</div>
            </div>
            <div style={{ textAlign: "center", padding: "15px 8px", borderRadius: 13, background: "#fff", border: "1px solid rgba(20,24,31,.1)" }}>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.3rem", color: "var(--cyan-deep)", lineHeight: 1, marginBottom: 5 }}>
                {current.itemsThisWeek}
              </div>
              <div style={{ fontSize: 10.5, fontWeight: 600, color: "var(--text-muted)" }}>This week</div>
            </div>
            <div style={{ textAlign: "center", padding: "15px 8px", borderRadius: 13, background: "#fff", border: "1px solid rgba(20,24,31,.1)" }}>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.3rem", color: "var(--cyan-deep)", lineHeight: 1, marginBottom: 5 }}>
                {current.sourceCount}
              </div>
              <div style={{ fontSize: 10.5, fontWeight: 600, color: "var(--text-muted)" }}>Sources</div>
            </div>
          </div>

          {current.onRoadmap && (
            <Link
              to="/learn"
              style={{ display: "block", background: "#fff", border: "1.5px solid var(--cyan)", borderRadius: 16, padding: "19px 21px", marginBottom: 20, textDecoration: "none", color: "inherit" }}
            >
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--cyan)", marginBottom: 7 }}>
                ON YOUR ROADMAP
              </div>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 15, marginBottom: 9 }}>{current.roadmapModuleName}</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {current.roadmapContents.map((content) => (
                  <span key={content} style={{ fontSize: 11, fontWeight: 600, background: "#f6f8f9", color: "var(--text-dim)", borderRadius: 99, padding: "5px 10px" }}>
                    {content}
                  </span>
                ))}
              </div>
            </Link>
          )}

          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".07em", textTransform: "uppercase", color: "var(--text-faint)", marginBottom: 10 }}>
            ALERT ME WHEN
          </div>
          <div style={{ background: "#fff", border: "1px solid rgba(20,24,31,.1)", borderRadius: 14, padding: "18px 20px", marginBottom: 20 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              {current.alerts.map((alert, i) => (
                <button
                  key={alert.label}
                  onClick={() => toggleAlert(i)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                    textAlign: "left",
                    width: "100%",
                    padding: "13px 15px",
                    borderRadius: 10,
                    cursor: "pointer",
                    background: alert.isEnabled ? "var(--cyan-light)" : "#fff",
                    border: `1.5px solid ${alert.isEnabled ? "var(--cyan)" : "rgba(20,24,31,.12)"}`,
                  }}
                >
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 700 }}>{alert.label}</div>
                    <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>{alert.note}</div>
                  </div>
                  <span style={{ fontSize: 12, color: alert.isEnabled ? "var(--cyan)" : "transparent", fontWeight: 800, flex: "none" }}>✓</span>
                </button>
              ))}
            </div>
          </div>

          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".07em", textTransform: "uppercase", color: "var(--text-faint)", marginBottom: 10 }}>
            RECENT IN THIS TOPIC
          </div>
          {current.recentItems.length === 0 ? (
            <EmptyState icon="📰" title="No recent items" description="Radar hasn't found anything new in this topic this week." compact />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              {current.recentItems.map((item) => (
                <Link
                  key={item.id}
                  to={`/feed/${item.id}`}
                  style={{ display: "block", background: "#fff", border: "1px solid rgba(20,24,31,.1)", borderRadius: 14, padding: "16px 18px", textDecoration: "none", color: "inherit" }}
                >
                  <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14, lineHeight: 1.4, marginBottom: 4 }}>{item.signal}</div>
                  <div style={{ fontSize: 11.5, color: "var(--text-muted)", fontWeight: 600 }}>
                    {item.source} · {humanize(item.publishedAt)}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
