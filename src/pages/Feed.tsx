import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { LoadingSkeleton } from "../components/LoadingSkeleton";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { ApiError, dismissFeedItem, getFeed, logEvent, saveFeedItem, unsaveFeedItem } from "../lib/api";
import { humanize } from "../lib/date";
import { layerBg, layerColor, layerLabel } from "../lib/layers";
import type { ContentItem, ContentType } from "../lib/types";

const FILTERS: [string, ContentType | null][] = [
  ["All", null],
  ["Policy", "PolicyPaper"],
  ["Articles", "Article"],
  ["Ideas", "Essay"],
  ["Podcasts", "Podcast"],
  ["Videos", "Video"],
  ["Papers", "ResearchPaper"],
];

export function Feed() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeFilter, setActiveFilter] = useState<ContentType | null>(null);

  const feedQuery = useQuery({
    queryKey: ["feed", activeFilter],
    queryFn: () => getFeed(activeFilter),
  });

  const toggleSave = async (item: ContentItem, position: number) => {
    const queryKey = ["feed", activeFilter] as const;
    const nextSaved = !item.isSaved;
    queryClient.setQueryData<ContentItem[]>(queryKey, (old) =>
      old?.map((i) => (i.id === item.id ? { ...i, isSaved: nextSaved } : i)),
    );
    logEvent(nextSaved ? "Save" : "Unsave", { contentItemId: item.id, position });
    try {
      if (nextSaved) await saveFeedItem(item.id);
      else await unsaveFeedItem(item.id);
      queryClient.invalidateQueries({ queryKey: ["feed", "saved"] });
    } catch {
      // revert on failure
      queryClient.setQueryData<ContentItem[]>(queryKey, (old) =>
        old?.map((i) => (i.id === item.id ? { ...i, isSaved: !nextSaved } : i)),
      );
    }
  };

  const dismissItem = (item: ContentItem, position: number) => {
    const queryKey = ["feed", activeFilter] as const;
    logEvent("NotRelevant", { contentItemId: item.id, position });
    queryClient.setQueryData<ContentItem[]>(queryKey, (old) => old?.filter((i) => i.id !== item.id));
    dismissFeedItem(item.id).catch(() => {
      // couldn't persist the dismissal server-side — restore truth from the API
      queryClient.invalidateQueries({ queryKey });
    });
  };

  const items = feedQuery.data ?? [];
  const errorMessage = feedQuery.error instanceof ApiError ? feedQuery.error.message : "Could not load the feed.";

  // Not full scroll-based impression tracking (no IntersectionObserver yet) — logs the whole
  // rendered page as "shown" per fetch, which is enough to start measuring position effects.
  useEffect(() => {
    feedQuery.data?.forEach((item, position) => logEvent("Impression", { contentItemId: item.id, position }));
  }, [feedQuery.data]);

  return (
    <div className="r-page">
      <div className="r-page-head">
        <h1 className="r-page-title">Intelligence Feed</h1>
      </div>

      <div className="feed-type-tabs">
        {FILTERS.map(([label, type]) => (
          <button
            key={label}
            className={`r-chip ${activeFilter === type ? "active" : ""}`}
            onClick={() => setActiveFilter(type)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="feed-sources">
        Sources: MIT · Stanford · Harvard · OpenAI · Google · World Bank · IMF · McKinsey · Stripe · Y Combinator
      </div>

      {feedQuery.isLoading ? (
        <LoadingSkeleton variant="feed" count={4} />
      ) : feedQuery.isError ? (
        <ErrorState title="Failed to load feed" description={errorMessage} onRetry={() => feedQuery.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState icon="📰" title="Nothing here yet" description="Radar is still curating content for your interests. Check back soon.">
          <button className="btn btn--primary btn--sm" onClick={() => feedQuery.refetch()}>Refresh feed</button>
        </EmptyState>
      ) : (
        items.map((item, position) => (
          <div className="feed-item" key={item.id}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8, flexWrap: "wrap" }}>
              <span
                style={{
                  fontSize: 10.5,
                  fontWeight: 700,
                  letterSpacing: ".06em",
                  textTransform: "uppercase",
                  color: layerColor(item.layer),
                  background: layerBg(item.layer),
                  borderRadius: 5,
                  padding: "3px 8px",
                }}
              >
                {layerLabel(item.layer)}
              </span>
              {item.credibilityTier === 1 || item.credibilityTier === 2 ? (
                <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".05em", textTransform: "uppercase", color: "#535c6b", opacity: 0.75 }}>
                  Tier {item.credibilityTier} · {item.source}
                </span>
              ) : (
                <span style={{ fontSize: 10.5, fontWeight: 600, color: "var(--text-muted)" }}>{item.source}</span>
              )}
              <span style={{ fontSize: 10.5, color: "var(--text-muted)", marginLeft: "auto" }}>{humanize(item.publishedAt)}</span>
            </div>

            <div className="feed-item-signal">{item.signal}</div>

            {item.whyItMatters && (
              <>
                <div className="feed-section-label">WHY IT MATTERS</div>
                <div className="feed-why">{item.whyItMatters}</div>
              </>
            )}

            {item.opportunities.length > 0 && (
              <div style={{ marginTop: 10, padding: "10px 13px", background: "#f0fafa", borderRadius: 9, borderLeft: "3px solid var(--cyan)" }}>
                <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--cyan)", marginBottom: 5 }}>
                  OPPORTUNITY
                </div>
                <div style={{ fontSize: 13, color: "#14181f", lineHeight: 1.55 }}>{item.opportunities[0]}</div>
              </div>
            )}

            <div className="feed-actions">
              <div className="feed-actions-left">
                <button
                  className="btn btn--primary btn--sm"
                  onClick={() => {
                    logEvent("Open", { contentItemId: item.id, position });
                    navigate(`/feed/${item.id}`);
                  }}
                >
                  Read brief →
                </button>
                <button className="btn btn--sm" onClick={() => toggleSave(item, position)}>
                  {item.isSaved ? "Saved ✓" : "Save"}
                </button>
                <button className="btn btn--text btn--sm" onClick={() => dismissItem(item, position)}>
                  Not relevant
                </button>
              </div>
              <div className="feed-actions-right">{item.estimatedReadTime ?? item.estimatedWatchTime ?? ""}</div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
