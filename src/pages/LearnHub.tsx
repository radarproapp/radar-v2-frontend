import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { LoadingSkeleton } from "../components/LoadingSkeleton";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { ApiError, getFeed } from "../lib/api";
import type { ContentType } from "../lib/types";

const SECTIONS: { id: string; label: string; type: ContentType }[] = [
  { id: "articles", label: "Articles", type: "Article" },
  { id: "podcasts", label: "Podcasts", type: "Podcast" },
  { id: "videos", label: "Videos", type: "Video" },
  { id: "papers", label: "Papers", type: "ResearchPaper" },
  { id: "blogposts", label: "Blog posts", type: "Essay" },
];

export function LearnHub() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState("articles");
  const section = SECTIONS.find((s) => s.id === activeSection)!;

  const itemsQuery = useQuery({
    queryKey: ["learn-hub", activeSection],
    queryFn: () => getFeed(section.type, 1, 20),
  });

  const items = itemsQuery.data ?? [];
  const errorMessage = itemsQuery.error instanceof ApiError ? itemsQuery.error.message : "Could not load resources.";

  return (
    <div className="r-page" style={{ maxWidth: 780 }}>
      <div className="r-page-head">
        <h1 className="r-page-title">Learn Hub</h1>
        <p className="r-page-sub">The world's best learning resources, organised — not dumped into one feed.</p>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
        {SECTIONS.map((sec) => (
          <button key={sec.id} className={`r-chip ${activeSection === sec.id ? "active" : ""}`} onClick={() => setActiveSection(sec.id)}>
            {sec.label}
          </button>
        ))}
      </div>

      {itemsQuery.isError ? (
        <ErrorState title="Failed to load resources" description={errorMessage} onRetry={() => itemsQuery.refetch()} />
      ) : itemsQuery.isLoading ? (
        <LoadingSkeleton variant="feed" count={4} />
      ) : items.length === 0 ? (
        <EmptyState icon="📚" title="Nothing in this section yet" description="Radar is curating resources for your interests. Check back soon." />
      ) : (
        items.map((item) => (
          <div className="feed-item" style={{ cursor: "pointer" }} key={item.id} onClick={() => navigate(`/feed/${item.id}`)}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
              <span className="item-detail-source">{item.source}</span>
              <span style={{ fontSize: 11.5, color: "var(--text-muted)", fontWeight: 600 }}>{item.estimatedReadTime ?? item.estimatedWatchTime ?? ""}</span>
            </div>
            <div className="feed-item-signal">{item.signal}</div>

            {item.aiSummary && (
              <div className="feed-edge" style={{ marginBottom: 12 }}>
                <div className="feed-edge-label">AI SUMMARY</div>
                <div className="feed-edge-text">{item.aiSummary}</div>
              </div>
            )}

            {item.whyItMatters && (
              <>
                <div className="feed-section-label">WHY IT MATTERS</div>
                <div style={{ fontSize: 13.5, color: "#374151", lineHeight: 1.7 }}>{item.whyItMatters}</div>
              </>
            )}

            <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginTop: 12 }}>
              {item.tags.slice(0, 4).map((tag) => (
                <span key={tag} style={{ fontSize: 11, fontWeight: 600, background: "#f0f2f4", borderRadius: 99, padding: "4px 10px" }}>
                  {tag}
                </span>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
