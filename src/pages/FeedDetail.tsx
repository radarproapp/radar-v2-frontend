import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LoadingSkeleton } from "../components/LoadingSkeleton";
import { ErrorState } from "../components/ErrorState";
import { useAuth } from "../auth/AuthContext";
import { addTopicToActiveRoadmap, ApiError, getFeedItem, saveFeedItem, unsaveFeedItem } from "../lib/api";
import { humanize } from "../lib/date";
import { layerBg, layerColor, layerLabel } from "../lib/layers";

// TimeSpan serialises as "hh:mm:ss[.fffffff]" — the chapter list only needs mm:ss.
function formatChapterTime(timestamp: string): string {
  const parts = timestamp.split(":");
  const mm = parts[parts.length - 2] ?? "00";
  const ss = (parts[parts.length - 1] ?? "00").split(".")[0];
  return `${mm}:${ss}`;
}

function defaultPersonaTab(persona: string | undefined, availableKeys: string[]): string | undefined {
  const mapped: Record<string, string> = {
    Student: "Student",
    Entrepreneur: "Founder",
    YoungProfessional: "Professional",
    Researcher: "Professional",
    Graduate: "Student",
  };
  const candidate = persona ? mapped[persona] : undefined;
  if (candidate && availableKeys.includes(candidate)) return candidate;
  return availableKeys[0];
}

export function FeedDetail() {
  const { itemId = "" } = useParams<{ itemId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  const itemQuery = useQuery({ queryKey: ["feed", "item", itemId], queryFn: () => getFeedItem(itemId) });
  const [activePersona, setActivePersona] = useState<string | undefined>(undefined);
  const [addedToRoadmap, setAddedToRoadmap] = useState(false);

  const item = itemQuery.data;

  useEffect(() => {
    if (item) setActivePersona(defaultPersonaTab(profile?.persona, Object.keys(item.personaImpact)));
  }, [item, profile?.persona]);

  const toggleSave = async () => {
    if (!item) return;
    const nextSaved = !item.isSaved;
    queryClient.setQueryData(["feed", "item", itemId], { ...item, isSaved: nextSaved });
    if (nextSaved) await saveFeedItem(item.id);
    else await unsaveFeedItem(item.id);
    queryClient.invalidateQueries({ queryKey: ["feed"] });
  };

  const addToRoadmap = async () => {
    if (!item || addedToRoadmap) return;
    setAddedToRoadmap(true);
    try {
      // Unenriched (freshly ingested) content often has no Topic yet — fall back to the title.
      await addTopicToActiveRoadmap(item.topic || item.title);
    } catch {
      setAddedToRoadmap(false);
    }
  };

  if (itemQuery.isError) {
    const message = itemQuery.error instanceof ApiError ? itemQuery.error.message : "Failed to load article.";
    return (
      <div className="r-page" style={{ maxWidth: 700 }}>
        <ErrorState title="Failed to load article" description={message} onRetry={() => itemQuery.refetch()} />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="r-page" style={{ maxWidth: 700 }}>
        <LoadingSkeleton variant="text" lines={1} width="120px" />
        <div style={{ height: 12 }} />
        <LoadingSkeleton variant="text" lines={1} width="200px" />
        <div style={{ height: 8 }} />
        <LoadingSkeleton variant="text" lines={1} width="80%" />
        <div style={{ height: 24 }} />
        <LoadingSkeleton variant="card" count={1} />
      </div>
    );
  }

  return (
    <div className="r-page" style={{ maxWidth: 700 }}>
      <button
        style={{ fontSize: 13, fontWeight: 700, color: "var(--cyan)", background: "none", border: "none", padding: 0, marginBottom: 18, cursor: "pointer" }}
        onClick={() => navigate("/feed")}
      >
        ← {item.type}
      </button>

      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 13, flexWrap: "wrap" }}>
        <span
          style={{
            fontSize: 10.5,
            fontWeight: 700,
            letterSpacing: ".06em",
            textTransform: "uppercase",
            color: layerColor(item.layer),
            background: layerBg(item.layer),
            borderRadius: 5,
            padding: "3px 9px",
          }}
        >
          {layerLabel(item.layer)}
        </span>
        {(item.credibilityTier === 1 || item.credibilityTier === 2) && (
          <span style={{ fontSize: 11, fontWeight: 700, color: "#008c93", background: "#e0f4f6", borderRadius: 5, padding: "3px 8px" }}>
            Tier {item.credibilityTier} Source
          </span>
        )}
        <span className="item-detail-source">{item.source}</span>
        <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-muted)" }}>
          {humanize(item.publishedAt)} · {item.estimatedReadTime ?? item.estimatedWatchTime ?? ""}
        </span>
      </div>

      <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "clamp(1.4rem,2.9vw,1.85rem)", lineHeight: 1.25, marginBottom: 8 }}>
        {item.signal}
      </h1>

      <div style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 600, lineHeight: 1.6, marginBottom: 18 }}>{item.title}</div>

      {item.authors.length > 0 && (
        <div style={{ fontSize: 12.5, color: "var(--text-muted)", fontWeight: 600, lineHeight: 1.6, marginBottom: 18 }}>
          {item.authors.join(", ")} · {item.journal} {new Date(item.publishedAt).getFullYear()} · DOI {item.doi}
        </div>
      )}

      <div className="item-detail-section">
        <div className="item-detail-section-label">WHY IT MATTERS</div>
        <p>{item.whyItMatters}</p>
      </div>

      <div className="item-detail-section">
        <div className="item-detail-section-label">WHAT HAPPENED</div>
        <p>{item.whatHappened}</p>
      </div>

      {item.keyInsights.length > 0 && (
        <div className="item-detail-section">
          <div className="item-detail-section-label">KEY INSIGHTS</div>
          {item.keyInsights.map((insight, i) => (
            <div className="item-detail-insight" key={i}>
              <div className="item-detail-insight-dot" />
              <div className="item-detail-insight-text">{insight}</div>
            </div>
          ))}
        </div>
      )}

      {Object.keys(item.personaImpact).length > 0 && (
        <div className="item-detail-section">
          <div className="item-detail-section-label">WHAT IT MEANS FOR YOU</div>
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 12 }}>
            {Object.keys(item.personaImpact).map((persona) => (
              <button
                key={persona}
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  padding: "5px 13px",
                  borderRadius: 99,
                  border: `1.5px solid ${activePersona === persona ? "var(--cyan)" : "rgba(20,24,31,.12)"}`,
                  background: activePersona === persona ? "var(--cyan)" : "transparent",
                  color: activePersona === persona ? "#fff" : "var(--text-muted)",
                  cursor: "pointer",
                }}
                onClick={() => setActivePersona(persona)}
              >
                {persona}
              </button>
            ))}
          </div>
          {activePersona && item.personaImpact[activePersona] && (
            <p style={{ fontSize: 14, lineHeight: 1.7, color: "#374151" }}>{item.personaImpact[activePersona]}</p>
          )}
        </div>
      )}

      {item.opportunities.length > 0 && (
        <div className="item-detail-section">
          <div className="item-detail-section-label">OPPORTUNITIES</div>
          {item.opportunities.map((opp, i) => (
            <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 8 }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--cyan)", flex: "none", marginTop: 6 }} />
              <div style={{ fontSize: 13.5, lineHeight: 1.6, color: "#14181f" }}>{opp}</div>
            </div>
          ))}
        </div>
      )}

      {item.recommendedActions.length > 0 && (
        <div style={{ background: "#f6f8f9", borderRadius: 13, padding: "17px 19px", marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".07em", textTransform: "uppercase", color: "var(--cyan)", marginBottom: 12 }}>
            RECOMMENDED ACTIONS
          </div>
          {item.recommendedActions.map((action, i) => (
            <div
              key={i}
              style={{ display: "flex", gap: 11, alignItems: "flex-start", marginBottom: i < item.recommendedActions.length - 1 ? 10 : 0 }}
            >
              <div
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  background: "var(--cyan)",
                  color: "#fff",
                  fontSize: 11,
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flex: "none",
                }}
              >
                {i + 1}
              </div>
              <div style={{ fontSize: 13.5, lineHeight: 1.6, color: "#14181f", paddingTop: 2 }}>{action}</div>
            </div>
          ))}
        </div>
      )}

      {item.methodology && (
        <div className="item-detail-section">
          <div className="item-detail-section-label">METHOD</div>
          <p>{item.methodology}</p>
        </div>
      )}

      {item.chapters.length > 0 && (
        <div className="item-detail-section">
          <div className="item-detail-section-label">CHAPTER BREAKDOWN</div>
          {item.chapters.map((ch, i) => (
            <div key={i} style={{ fontSize: 13, color: "#374151", fontWeight: 600, lineHeight: 1.5 }}>
              {formatChapterTime(ch.timestamp)} — {ch.title}
            </div>
          ))}
        </div>
      )}

      {item.aiSummary && (
        <div className="item-detail-edge">
          <div className="item-detail-edge-label">YOUR EDGE</div>
          <p>{item.aiSummary}</p>
        </div>
      )}

      <div className="item-detail-learn-loop">
        <div className="item-detail-learn-loop-label">WANT TO UNDERSTAND THIS PROPERLY?</div>
        <div className="item-detail-learn-loop-title">Add {item.topic || item.title} to your Growth Roadmap.</div>
        <div className="item-detail-learn-loop-tags">
          <span className="item-detail-learn-loop-tag">6 articles</span>
          <span className="item-detail-learn-loop-tag">3 podcasts</span>
          <span className="item-detail-learn-loop-tag">5 videos</span>
          <span className="item-detail-learn-loop-tag">8 papers</span>
          <span className="item-detail-learn-loop-tag">1 project</span>
        </div>
        <button className="btn btn--sm" style={{ background: "var(--cyan-bright)", color: "#0d2b2d", borderColor: "transparent" }} onClick={addToRoadmap}>
          {addedToRoadmap ? "✓ Added" : "Add to roadmap"}
        </button>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button className="btn btn--sm" onClick={toggleSave}>
          {item.isSaved ? "Saved ✓" : "Save"}
        </button>
        <a className="btn btn--sm" style={{ background: "#f0f2f4", color: "var(--text)", borderColor: "transparent" }} href={item.url} target="_blank" rel="noreferrer">
          Open original →
        </a>
      </div>
    </div>
  );
}
