import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { LoadingSkeleton } from "../components/LoadingSkeleton";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { ApiError, getSavedItems, unsaveFeedItem } from "../lib/api";
import { humanize } from "../lib/date";
import type { ContentItem } from "../lib/types";

export function Saved() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const savedQuery = useQuery({ queryKey: ["feed", "saved"], queryFn: getSavedItems });

  const unsave = async (item: ContentItem) => {
    queryClient.setQueryData<ContentItem[]>(["feed", "saved"], (old) => old?.filter((i) => i.id !== item.id));
    await unsaveFeedItem(item.id);
    queryClient.invalidateQueries({ queryKey: ["feed"] });
  };

  const items = savedQuery.data ?? [];
  const errorMessage = savedQuery.error instanceof ApiError ? savedQuery.error.message : "Could not load saved items.";

  return (
    <div className="r-page">
      <div className="r-page-head">
        <h1 className="r-page-title">Saved resources</h1>
        <p className="r-page-sub">Everything you have saved, in one searchable place.</p>
      </div>

      {savedQuery.isError ? (
        <ErrorState title="Failed to load saved items" description={errorMessage} onRetry={() => savedQuery.refetch()} />
      ) : savedQuery.isLoading ? (
        <LoadingSkeleton variant="feed" count={3} />
      ) : items.length === 0 ? (
        <EmptyState icon="🔖" title="Nothing saved yet." description="Save an article, paper, video or opportunity and it lands here.">
          <button className="btn btn--primary btn--sm" onClick={() => navigate("/feed")}>Browse the feed</button>
        </EmptyState>
      ) : (
        items.map((item) => (
          <div className="saved-item" key={item.id}>
            <span className="saved-item-kind">{item.type}</span>
            <button className="saved-item-info" onClick={() => navigate(`/feed/${item.id}`)}>
              <div className="saved-item-title">{item.title}</div>
              <div className="saved-item-note">{item.source} · {humanize(item.publishedAt)}</div>
            </button>
            <button className="saved-item-remove" onClick={() => unsave(item)}>Remove</button>
          </div>
        ))
      )}
    </div>
  );
}
