import { useEffect, useRef, useState } from "react";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Deferred } from "../components/Deferred";
import { LoadingSkeleton } from "../components/LoadingSkeleton";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { ApiError, dismissFeedItem, FEED_CARD_FIELDS, getFeed, logEvent, saveFeedItem, unsaveFeedItem } from "../lib/api";
import { humanize } from "../lib/date";
import { layerBg, layerColor, layerLabel } from "../lib/layers";
import type { ContentItem, ContentType, Page } from "../lib/types";

const FILTERS: [string, ContentType | null][] = [
  ["All", null],
  ["Policy", "PolicyPaper"],
  ["Articles", "Article"],
  ["Ideas", "Essay"],
  ["Podcasts", "Podcast"],
  ["Videos", "Video"],
  ["Papers", "ResearchPaper"],
];

const PAGE_SIZE = 20;

/// Shape react-query stores for an infinite query — needed to patch the cache optimistically.
type FeedCache = { pages: Page<ContentItem>[]; pageParams: unknown[] };

export function Feed() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeFilter, setActiveFilter] = useState<ContentType | null>(null);
  const feedQueryKey = ["feed", activeFilter] as const;

  // Keyset pagination: the server hands back an opaque cursor and we keep following it, rather than
  // asking for "page 3" — which would drift as the ingestion worker adds items mid-scroll.
  const feedQuery = useInfiniteQuery({
    queryKey: feedQueryKey,
    queryFn: ({ pageParam }) =>
      getFeed(activeFilter, {
        cursor: pageParam as string | null,
        limit: PAGE_SIZE,
        // Sparse fieldset: a feed row renders none of the podcast chapters, transcripts or paper
        // metadata the full document carries.
        fields: FEED_CARD_FIELDS,
      }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });

  const patchItem = (id: string, patch: Partial<ContentItem>) =>
    queryClient.setQueryData<FeedCache>(feedQueryKey, (old) =>
      old
        ? {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              items: page.items.map((item) => (item.id === id ? { ...item, ...patch } : item)),
            })),
          }
        : old,
    );

  const dropItem = (id: string) =>
    queryClient.setQueryData<FeedCache>(feedQueryKey, (old) =>
      old
        ? {
            ...old,
            pages: old.pages.map((page) => ({ ...page, items: page.items.filter((item) => item.id !== id) })),
          }
        : old,
    );

  const toggleSave = async (item: ContentItem, position: number) => {
    const nextSaved = !item.isSaved;
    patchItem(item.id, { isSaved: nextSaved });
    logEvent(nextSaved ? "Save" : "Unsave", { contentItemId: item.id, position });
    try {
      if (nextSaved) await saveFeedItem(item.id);
      else await unsaveFeedItem(item.id);
      queryClient.invalidateQueries({ queryKey: ["feed", "saved"] });
    } catch {
      patchItem(item.id, { isSaved: !nextSaved });
    }
  };

  const dismissItem = (item: ContentItem, position: number) => {
    logEvent("NotRelevant", { contentItemId: item.id, position });
    dropItem(item.id);
    dismissFeedItem(item.id).catch(() => {
      // couldn't persist the dismissal server-side — restore truth from the API
      queryClient.invalidateQueries({ queryKey: feedQueryKey });
    });
  };

  const items = feedQuery.data?.pages.flatMap((page) => page.items) ?? [];
  const errorMessage = feedQuery.error instanceof ApiError ? feedQuery.error.message : "Could not load the feed.";

  // Impression logging: each item is logged once per filter, not once per render. Without the
  // guard, loading page 2 would re-log every item already on screen and inflate the counts the
  // ranking weights are tuned against.
  const seen = useRef<{ filter: ContentType | null; ids: Set<string> }>({ filter: null, ids: new Set() });
  useEffect(() => {
    const pages = feedQuery.data?.pages;
    if (!pages) return;
    if (seen.current.filter !== activeFilter) seen.current = { filter: activeFilter, ids: new Set() };

    let position = 0;
    for (const page of pages) {
      for (const item of page.items) {
        if (!seen.current.ids.has(item.id)) {
          seen.current.ids.add(item.id);
          logEvent("Impression", { contentItemId: item.id, position });
        }
        position++;
      }
    }
  }, [feedQuery.data, activeFilter]);

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
        <>
          {items.map((item, position) => (
            // Rows are mounted on approach, not all at once: the first screen paints immediately and
            // the rest of the loaded pages cost nothing until they are scrolled towards.
            <Deferred key={item.id}>
              <div className="feed-item">
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

                {/* Topic line, in the review's requested shape: "Climate · Finance · Policy — Premium Times · Article".
                    Primary topic first, then the curated secondary topics, so the category reflects the
                    subject rather than only the source's coarse layer. */}
                {(item.topic || item.tags.length > 0) && (
                  <div style={{ fontSize: 11.5, fontWeight: 600, color: "var(--text-muted)", marginBottom: 8 }}>
                    <span style={{ color: "var(--cyan)" }}>{item.topic || item.tags[0]}</span>
                    {(item.secondaryTopics.length > 0 ? item.secondaryTopics : item.tags.slice(1)).map((topic) => (
                      <span key={topic}> · {topic}</span>
                    ))}
                    <span style={{ opacity: 0.6 }}> — {item.source} · {item.type}</span>
                  </div>
                )}

                <div className="feed-item-signal">{item.signal}</div>

                {item.whyItMatters && (
                  <>
                    <div className="feed-section-label">WHY IT MATTERS</div>
                    <div className="feed-why">{item.whyItMatters}</div>
                  </>
                )}

                {item.opportunities && item.opportunities.length > 0 && (
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
            </Deferred>
          ))}

          <div style={{ display: "flex", justifyContent: "center", marginTop: 18 }}>
            {feedQuery.hasNextPage ? (
              <button
                className="btn btn--sm"
                onClick={() => feedQuery.fetchNextPage()}
                disabled={feedQuery.isFetchingNextPage}
              >
                {feedQuery.isFetchingNextPage ? "Loading…" : "Load more"}
              </button>
            ) : (
              <span style={{ fontSize: 12.5, color: "var(--text-muted)" }}>You're all caught up.</span>
            )}
          </div>
        </>
      )}
    </div>
  );
}
