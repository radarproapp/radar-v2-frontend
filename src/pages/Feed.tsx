import { useEffect, useRef, useState } from "react";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Deferred } from "../components/Deferred";
import { LoadingSkeleton } from "../components/LoadingSkeleton";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { ApiError, dismissFeedItem, FEED_CARD_FIELDS, getFeed, logEvent, restoreDismissedFeedItems, saveFeedItem, unsaveFeedItem } from "../lib/api";
import { humanize } from "../lib/date";
import { layerBg, layerColor, layerLabel } from "../lib/layers";
import type { ContentItem, ContentType, FeedEmptyReason, Page } from "../lib/types";
import { feedEmptyCopy, type FeedEmptyAction } from "../lib/feed-empty";
import { Icon } from "../components/Icon";
import { PersonalisePrompt } from "../components/PersonalisePrompt";
import type { IconName } from "../components/icon-map";
import { feedTypeFor } from "../components/feed-types";



const PAGE_SIZE = 20;

/// Shape react-query stores for an infinite query — needed to patch the cache optimistically.
type FeedCache = { pages: Page<ContentItem>[]; pageParams: unknown[] };

/// The badge drawn on a feed card that has no image of its own.
///
/// Each branch used to return an emoji. Stripping them left every branch returning an empty
/// string, which renders as nothing - the card kept its coloured placeholder and lost the one
/// mark that said what kind of thing it was.
function layerIcon(layer: string): IconName {
  switch (layer) {
    case "Policy": return "policy";
    case "Science": return "paper";
    case "Capital": return "trend";
    case "Ideas": return "idea";
    case "Enterprise": return "organisation";
    default: return "energy";
  }
}

function layerGradient(layer: string): string {
  switch (layer) {
    case "Policy": return "linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)";
    case "Science": return "linear-gradient(135deg, #064e3b 0%, #047857 50%, #059669 100%)";
    case "Capital": return "linear-gradient(135deg, #143538 0%, #005f66 50%, #008c93 100%)";
    case "Ideas": return "linear-gradient(135deg, #451a03 0%, #78350f 50%, #b45309 100%)";
    default: return "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)";
  }
}

/// Falls back only when the server could not compute a reason. The server-side version lives next
/// to the scorer that produces the signals, so it can name the dimensions that actually fired; this
/// client copy previously pasted the raw goal into a noun slot ("Relevant to your goal of \"Get
/// Promotion\" in AI Fundamentals") and printed signals with their internal prefix still attached.
function fallbackWhySeeing(item: ContentItem): string {
  if (item.topic) return `Recent in ${item.topic}`;
  return `Recent from ${item.source}`;
}

export function Feed() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  // From the URL, not state: the sidebar sets the filter without the page handing it a setter,
  // and a filtered feed becomes a link you can send to someone.
  const [searchParams, setSearchParams] = useSearchParams();
  const activeType = feedTypeFor(searchParams.get("type"));
  const activeFilter = activeType.type;
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

  /// Steering the feed rather than removing one item from it.
  ///
  /// Section 6 asks for four controls and three existed: save, not relevant, and the implicit
  /// signal of opening something. The whole path behind these two was already built — the event
  /// type, the mapping in MongoAnalyticsService, and a weight in BehavioralSignalService — and
  /// nothing had ever sent one from the feed, so the only steer a reader could give was negative.
  ///
  /// The item stays where it is. "Less like this" is about the subject, not this article, and
  /// making it vanish would make it indistinguishable from "not relevant" — which already exists
  /// and does mean remove.
  const [steered, setSteered] = useState<Record<string, "more" | "less">>({});

  const steer = (item: ContentItem, position: number, direction: "more" | "less") => {
    setSteered((prev) => ({ ...prev, [item.id]: direction }));
    logEvent(direction === "more" ? "MoreLikeThis" : "LessLikeThis", {
      contentItemId: item.id,
      position,
    });
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

  const activeLabel = activeType.label;

  // Said by the server even when the sample is non-empty: two general items are not a feed, and
  // only the server knows whether the profile has been personalised.
  const notPersonalised = feedQuery.data?.pages?.[0]?.emptyReason === "NotPersonalisedYet";

  return (
    <div className="r-page">
      <div className="r-page-head">
        {/* "Latest" when nothing has been personalised, because that is what it is. A heading
            promising relevance over a list ranked on nothing teaches a new user that Radar does
            not know them, and the lesson is hard to undo. */}
        <h1 className="r-page-title">
          {notPersonalised ? "Latest" : activeType.type === null ? "Intelligence Feed" : activeLabel}
        </h1>
      </div>

      {notPersonalised && (
        <>
          <PersonalisePrompt />
          <div className="feed-sample-label">A sample of what Radar carries</div>
        </>
      )}

      {feedQuery.isLoading ? (
        <LoadingSkeleton variant="feed" count={4} />
      ) : feedQuery.isError ? (
        <ErrorState title="Failed to load feed" description={errorMessage} onRetry={() => feedQuery.refetch()} />
      ) : items.length === 0 ? (
        <FeedEmptyState
          reason={feedQuery.data?.pages?.[0]?.emptyReason}
          onRefresh={() => feedQuery.refetch()}
          onClearFilter={() => setSearchParams({})}
          onWidenInterests={() => navigate("/profile/edit")}
          onRestoreDismissed={async () => {
            await restoreDismissedFeedItems();
            await feedQuery.refetch();
          }}
        />
      ) : (
        <>
          {items.map((item, position) => (
            // Rows are mounted on approach, not all at once: the first screen paints immediately and
            // the rest of the loaded pages cost nothing until they are scrolled towards.
            <Deferred key={item.id}>
              <div className="feed-card">
                {/* 1. BIG IMAGE */}
                <div
                  className="feed-card__media"
                  onClick={() => {
                    logEvent("Open", { contentItemId: item.id, position });
                    navigate(`/feed/${item.id}`);
                  }}
                >
                  {item.thumbnailUrl ? (
                    <img
                      src={item.thumbnailUrl}
                      alt={item.title}
                      className="feed-card__img"
                      loading="lazy"
                      onError={(e) => {
                        (e.currentTarget as HTMLElement).style.display = "none";
                        const placeholder = e.currentTarget.parentElement?.querySelector(".feed-card__placeholder") as HTMLElement;
                        if (placeholder) placeholder.style.display = "flex";
                      }}
                    />
                  ) : null}
                  <div
                    className="feed-card__placeholder"
                    style={{
                      display: item.thumbnailUrl ? "none" : "flex",
                      background: layerGradient(item.layer),
                    }}
                  >
                    <span className="feed-card__placeholder-icon">
                      <Icon name={layerIcon(item.layer)} size={26} strokeWidth={1.5} />
                    </span>
                    <span className="feed-card__placeholder-tag">{item.topic || layerLabel(item.layer)}</span>
                  </div>
                </div>

                <div className="feed-card__content">
                  <div className="feed-card__meta">
                    <span
                      className="feed-card__badge"
                      style={{
                        color: layerColor(item.layer),
                        background: layerBg(item.layer),
                      }}
                    >
                      {layerLabel(item.layer)}
                    </span>
                    <span className="feed-card__source">{item.source}</span>
                    <span className="feed-card__time">{humanize(item.publishedAt)}</span>
                  </div>

                  {/* 2. TITLE OF THE FEED */}
                  <h2
                    className="feed-card__title"
                    onClick={() => {
                      logEvent("Open", { contentItemId: item.id, position });
                      navigate(`/feed/${item.id}`);
                    }}
                  >
                    {item.title || item.signal}
                  </h2>

                  {/* 3. A SHORT SENTENCE ON WHY THE USER IS SEEING IT */}
                  <div className="feed-card__why-seeing">
                    <span className="feed-card__why-icon"><Icon name="goal" /></span>
                    <span className="feed-card__why-text">
                      {item.whyYoureSeeingThis || fallbackWhySeeing(item)}
                    </span>
                  </div>

                  {/* 4. READ BRIEF ACTION */}
                  <div className="feed-card__footer">
                    <button
                      className="btn btn--primary btn--sm feed-card__read-btn"
                      onClick={() => {
                        logEvent("Open", { contentItemId: item.id, position });
                        navigate(`/feed/${item.id}`);
                      }}
                    >
                      Read brief →
                    </button>

                    <div className="feed-card__sub-actions">
                      <button
                        className="btn btn--text btn--sm"
                        onClick={() => toggleSave(item, position)}
                        title={item.isSaved ? "Saved" : "Save for later"}
                      >
                        {item.isSaved ? "Saved " : "Save"}
                      </button>
                      <button
                        className="btn btn--text btn--sm"
                        onClick={() => steer(item, position, "more")}
                        aria-pressed={steered[item.id] === "more"}
                        disabled={steered[item.id] === "more"}
                        title={`More about ${item.topic}`}
                      >
                        More like this
                      </button>
                      <button
                        className="btn btn--text btn--sm"
                        onClick={() => steer(item, position, "less")}
                        aria-pressed={steered[item.id] === "less"}
                        disabled={steered[item.id] === "less"}
                        title={`Less about ${item.topic}`}
                      >
                        Less like this
                      </button>
                      <button
                        className="btn btn--text btn--sm"
                        onClick={() => dismissItem(item, position)}
                        title="Dismiss from feed"
                      >
                        Not relevant
                      </button>

                      {/* The shortest route from "this is interesting" to a path about it.
                          
                          Only when the item has a topic. The alternative is handing Learn an
                          article headline as a subject, which produces a section about one news
                          story rather than about the thing the story is an instance of. */}
                      {item.topic && (
                        <button
                          className="btn btn--text btn--sm"
                          onClick={() => {
                            logEvent("Open", { contentItemId: item.id, position });
                            navigate(`/learn/build?subject=${encodeURIComponent(item.topic!)}`);
                          }}
                          title={`Build a learning path on ${item.topic}`}
                        >
                          Learn this
                        </button>
                      )}
                      <span className="feed-card__read-time">
                        {item.estimatedReadTime ?? item.estimatedWatchTime ?? "3 min read"}
                      </span>
                    </div>
                  </div>
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


/// Renders the empty-feed message chosen by `feedEmptyCopy`.
///
/// The wording and the choice of action live in lib/feed-empty.ts so they can be tested without a
/// DOM; this only wires the chosen action to a handler.
function FeedEmptyState({
  reason,
  onRefresh,
  onClearFilter,
  onRestoreDismissed,
  onWidenInterests,
}: {
  reason?: FeedEmptyReason;
  onRefresh: () => void;
  onClearFilter: () => void;
  onRestoreDismissed: () => void;
  onWidenInterests: () => void;
}) {
  const copy = feedEmptyCopy(reason);

  // Every action the copy can ask for. A missing entry here renders a button whose onClick is
  // undefined — it looks exactly like a working button and does nothing, which is a failure that
  // has already shipped once in this codebase.
  const handlers: Record<FeedEmptyAction, (() => void) | undefined> = {
    refresh: onRefresh,
    clearFilter: onClearFilter,
    restoreDismissed: onRestoreDismissed,
    widenInterests: onWidenInterests,
    none: undefined,
  };

  return (
    <EmptyState icon={copy.icon} title={copy.title} description={copy.description}>
      {copy.action !== "none" && (
        <button className="btn btn--primary btn--sm" onClick={handlers[copy.action]}>
          {copy.actionLabel}
        </button>
      )}
    </EmptyState>
  );
}
