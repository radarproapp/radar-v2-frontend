import { useState } from "react";
import { IntelBlock } from "../components/IntelBlock";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LoadingSkeleton } from "../components/LoadingSkeleton";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { VideoEmbed } from "../components/VideoEmbed";
import { AudioEmbed } from "../components/AudioEmbed";
import {
  ApiError,
  getLearnHub,
  completeHubResource,
  toggleSaveHubResource,
} from "../lib/api";
import type {
  HubResourceCategory,
  HubResourceItem,
} from "../lib/types";
import { Icon, type IconName } from "../components/Icon";

const INTENT_STREAMS: { id: HubResourceCategory; label: string; icon: IconName; desc: string }[] = [
  { id: "Learn", label: "Learn", icon: "build", desc: "Tutorials, courses, how-to videos & technical guides" },
  { id: "Understand", label: "Understand", icon: "idea", desc: "Articles, explainers, podcasts & in-depth interviews" },
  { id: "Research", label: "Research", icon: "paper", desc: "Peer-reviewed papers, benchmarks & threat research" },
  { id: "Apply", label: "Apply", icon: "code", desc: "Hands-on projects, virtual labs & security challenges" },
  { id: "StayCurrent", label: "Stay Current", icon: "energy", desc: "Vulnerability advisories & industry developments" },
];

export function LearnHub() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [activeSubInterest, setActiveSubInterest] = useState<string>("All Sub-Interests");
  const [activeIntent, setActiveIntent] = useState<HubResourceCategory | "all">("all");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [showGraph, setShowGraph] = useState<boolean>(true);
  const [completing, setCompleting] = useState<Record<string, boolean>>({});

  const hubQuery = useQuery({
    queryKey: ["learn-hub", activeSubInterest],
    queryFn: () => getLearnHub(activeSubInterest),
    retry: 1,
  });

  const hubData = hubQuery.data;
  const errorMessage = hubQuery.error instanceof ApiError ? hubQuery.error.message : "Could not load Learn Hub.";

  const handleToggleComplete = async (resourceId: string) => {
    setCompleting((prev) => ({ ...prev, [resourceId]: true }));
    try {
      await completeHubResource(resourceId);
      queryClient.setQueryData(["learn-hub", activeSubInterest], (old: typeof hubData) => {
        if (!old) return old;
        return {
          ...old,
          resources: old.resources.map((r) =>
            r.id === resourceId ? { ...r, isCompleted: !r.isCompleted } : r,
          ),
        };
      });
      queryClient.invalidateQueries({ queryKey: ["roadmap", "active"] });
    } finally {
      setCompleting((prev) => {
        const next = { ...prev };
        delete next[resourceId];
        return next;
      });
    }
  };

  const handleToggleSave = async (resourceId: string) => {
    try {
      await toggleSaveHubResource(resourceId);
      queryClient.setQueryData(["learn-hub", activeSubInterest], (old: typeof hubData) => {
        if (!old) return old;
        return {
          ...old,
          resources: old.resources.map((r) =>
            r.id === resourceId ? { ...r, isSaved: !r.isSaved } : r,
          ),
        };
      });
    } catch {
      // non-blocking
    }
  };

  // Navigations to AI Learning Mentor with prefilled context.
  //
  // The field is left out of the sentence when Radar does not know it. It used to fall back to
  // "Cybersecurity", so a learner whose hub had no skill set asked the mentor to explain their
  // topic "in Cybersecurity" — a question they never asked, answered confidently.
  const askMentorQuestion = (item: HubResourceItem) => {
    const field = hubData?.primarySkill?.trim();
    const prompt = field
      ? `I'm exploring "${item.title}" in ${field}. Can you explain the core concepts in simple terms and give a real-world example?`
      : `I'm exploring "${item.title}". Can you explain the core concepts in simple terms and give a real-world example?`;
    navigate(`/mentor?mode=chat&prompt=${encodeURIComponent(prompt)}`);
  };

  const triggerTestMe = (item: HubResourceItem) => {
    const topic = item.title;
    navigate(`/mentor?mode=quiz&topic=${encodeURIComponent(topic)}&stage=${encodeURIComponent(item.level)}`);
  };

  const triggerReviewWork = (item: HubResourceItem) => {
    const title = item.practiceExerciseTitle || item.title;
    const content = `Here is my work for "${item.practiceExerciseTitle || item.title}":\n\n[Paste code, config or analysis here]`;
    navigate(`/mentor?mode=review&title=${encodeURIComponent(title)}&content=${encodeURIComponent(content)}&type=Project Brief`);
  };

  const triggerAlternativeExplanation = (item: HubResourceItem) => {
    const prompt = `Can you give me an intuitive analogy and another explanation for "${item.title}"?`;
    navigate(`/mentor?mode=chat&prompt=${encodeURIComponent(prompt)}`);
  };

  // Resource Filtering by Intent and Selected Node
  const rawResources = hubData?.resources ?? [];
  const filteredResources = rawResources.filter((r) => {
    const matchesIntent = activeIntent === "all" || r.category === activeIntent;
    const matchesNode =
      !selectedNodeId || (r.connectedNodeIds && r.connectedNodeIds.includes(selectedNodeId));
    return matchesIntent && matchesNode;
  });

  return (
    <div className="r-page" style={{ maxWidth: 920 }}>
      {hubQuery.isError ? (
        <ErrorState title="Failed to load Learn Hub" description={errorMessage} onRetry={() => hubQuery.refetch()} />
      ) : hubQuery.isLoading ? (
        <>
          <div className="r-page-head">
            <div className="r-kicker">PERSONALIZED LEARN HUB</div>
          </div>
          <LoadingSkeleton variant="card" count={4} />
        </>
      ) : !hubData ? (
        <EmptyState icon="book" title="Learn Hub is empty" description="Radar is curating resources for your domain." />
      ) : (
        <>
          {/* Top Page Header & Navigation Breadcrumb */}
          <div className="r-page-head" style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span className="r-kicker" style={{ margin: 0 }}>
                    RADAR LEARN HUB · {hubData.primarySkill.toUpperCase()}
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "var(--cyan-deep)", background: "var(--cyan-light)", padding: "2px 8px", borderRadius: 99 }}>
                    STAGE: {hubData.currentStage.toUpperCase()}
                  </span>
                </div>
                <h1 className="r-page-title" style={{ fontSize: "1.85rem", margin: "4px 0" }}>
                  {hubData.primarySkill} Knowledge Hub
                </h1>
                <p style={{ fontSize: 13.5, color: "var(--text-muted)", margin: "4px 0 0 0", lineHeight: 1.5 }}>
                  Curated specifically for: <strong>{hubData.goal}</strong>.
                  Tutorials, podcasts, research papers, and labs linked directly to your Knowledge Graph.
                </p>
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button className="btn btn--sm" onClick={() => navigate("/learn")}>
                  <Icon name="explore" /> Learning Path
                </button>
                <button className="btn btn--sm" onClick={() => navigate("/mentor")}>
                  <Icon name="idea" /> AI Mentor
                </button>
                <button className="btn btn--primary btn--sm" onClick={() => navigate("/projects")}>
                  <Icon name="build" /> Projects
                </button>
              </div>
            </div>
          </div>

          {/* Sub-Interests Selection Chips */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 18 }}>
            <span style={{ fontSize: 11.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--text-faint)" }}>
              SUB-INTERESTS:
            </span>
            <button
              className={`r-chip ${activeSubInterest === "All Sub-Interests" ? "active" : ""}`}
              onClick={() => {
                setActiveSubInterest("All Sub-Interests");
                setSelectedNodeId(null);
              }}
            >
              All Topics ({hubData.resources.length})
            </button>
            {hubData.subInterests.map((sub) => (
              <button
                key={sub}
                className={`r-chip ${activeSubInterest === sub ? "active" : ""}`}
                onClick={() => {
                  setActiveSubInterest(sub);
                  setSelectedNodeId(null);
                }}
              >
                {sub}
              </button>
            ))}
          </div>

          {/* 10. "WHAT SHOULD I LEARN NEXT?" (Next Best Action Hero Banner) */}
          {hubData.nextAction && (
            <div className="hub-next-card">
              <div className="hub-next-card__kicker">
                <span><Icon name="goal" /></span> YOUR NEXT BEST LEARNING ACTION
              </div>
              <div className="hub-next-card__title">{hubData.nextAction.title}</div>
              <div className="hub-next-card__desc">{hubData.nextAction.description}</div>
              <div className="hub-next-card__meta">
                <span className="hub-next-card__pill"><Icon name="time" size={12} /> {hubData.nextAction.estimatedTime}</span>
                <span className="hub-next-card__pill"><Icon name="tag" /> {hubData.nextAction.subInterest}</span>
                <span className="hub-next-card__pill"><Icon name="trend" /> {hubData.nextAction.stage} Milestone</span>
                <button
                  className="btn btn--primary btn--sm"
                  style={{ background: "#fff", color: "var(--cyan-deep)", border: "none", fontWeight: 700 }}
                  onClick={() => {
                    const matchedRes = hubData.resources.find((r) => r.id === hubData.nextAction.resourceId) || hubData.resources[0];
                    if (matchedRes) {
                      const el = document.getElementById(`resource-${matchedRes.id}`);
                      if (el) el.scrollIntoView({ behavior: "smooth" });
                    }
                  }}
                >
                  Start Action Below ↓
                </button>
              </div>
            </div>
          )}

          {/* 7 & 8. PERSONALIZED KNOWLEDGE GRAPH VISUALIZER */}
          <div className="hub-graph-wrapper">
            <div className="hub-graph-head">
              <div className="hub-graph-title">
                <span><Icon name="remote" /></span> Personalised Knowledge Graph
                <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", marginLeft: 6 }}>
                  ({hubData.totalMasteredNodes} Mastered · {hubData.totalLearningNodes} Learning · {hubData.totalWeakNodes} Needs Practice)
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div className="hub-graph-legend">
                  <span><span className="hub-graph-dot hub-graph-dot--mastered" /> Mastered</span>
                  <span><span className="hub-graph-dot hub-graph-dot--learning" /> Learning</span>
                  <span><span className="hub-graph-dot hub-graph-dot--weak" /> Weak Area</span>
                  <span><span className="hub-graph-dot hub-graph-dot--next" /> Next Up</span>
                </div>
                <button
                  className="btn btn--text btn--sm"
                  style={{ fontSize: 11.5, padding: "2px 6px" }}
                  onClick={() => setShowGraph(!showGraph)}
                >
                  {showGraph ? "Hide Graph" : "Show Graph"}{" "}
                <Icon name={showGraph ? "collapse" : "expand"} size={13} />
                </button>
              </div>
            </div>

            {showGraph && (
              <>
                <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "0 0 12px 0" }}>
                  Visualizing connected flow: <strong>Goals &rarr; Skills &rarr; Sub-skills &rarr; Topics &rarr; Projects &rarr; Opportunities</strong>.
                  Click any node to filter resources to that exact concept.
                </p>

                <div className="hub-graph-nodes-grid">
                  {hubData.graphNodes.map((node) => {
                    const isSelected = selectedNodeId === node.id;
                    const statusClass =
                      node.status === "Mastered"
                        ? "mastered"
                        : node.status === "Learning"
                        ? "learning"
                        : node.status === "WeakArea"
                        ? "weak"
                        : "next";

                    return (
                      <div
                        key={node.id}
                        className={`hub-graph-node-card ${isSelected ? "active" : ""}`}
                        onClick={() => setSelectedNodeId(isSelected ? null : node.id)}
                      >
                        <div className="hub-graph-node-top">
                          <span className="hub-graph-category-tag">{node.category}</span>
                          <span className={`hub-graph-status-badge hub-graph-status-badge--${statusClass}`}>
                            {node.status === "WeakArea" ? "Weak Area" : node.status}
                          </span>
                        </div>
                        <div className="hub-graph-node-label">{node.label}</div>
                        <div className="hub-graph-node-summary">{node.summary}</div>
                        <div className="hub-graph-confidence">
                          <span>Mastery Confidence</span>
                          <span>{node.confidencePercent}%</span>
                        </div>
                        <div className="hub-graph-confidence-bar">
                          <div
                            className="hub-graph-confidence-fill"
                            style={{
                              width: `${node.confidencePercent}%`,
                              background:
                                node.status === "Mastered"
                                  ? "#10b981"
                                  : node.status === "WeakArea"
                                  ? "#f59e0b"
                                  : "var(--cyan)",
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {selectedNodeId && (
                  <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f0fbfb", padding: "6px 12px", borderRadius: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "var(--cyan-deep)" }}>
                      Filtering resources by node: <strong>{hubData.graphNodes.find((n) => n.id === selectedNodeId)?.label}</strong>
                    </span>
                    <button className="btn btn--text btn--sm" style={{ fontSize: 11 }} onClick={() => setSelectedNodeId(null)}>
                      Clear filter
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* 3. FIVE INTENT STREAM TABS */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", borderBottom: "1.5px solid var(--border)", paddingBottom: 10, marginBottom: 18 }}>
            <button
              className={`btn btn--sm ${activeIntent === "all" ? "btn--primary" : "btn--text"}`}
              onClick={() => setActiveIntent("all")}
            >
              <Icon name="star" /> All Streams ({hubData.resources.length})
            </button>
            {INTENT_STREAMS.map((st) => {
              const count = rawResources.filter((r) => r.category === st.id).length;
              return (
                <button
                  key={st.id}
                  className={`btn btn--sm ${activeIntent === st.id ? "btn--primary" : "btn--text"}`}
                  onClick={() => setActiveIntent(st.id)}
                  title={st.desc}
                >
                  <Icon name={st.icon} size={14} /> {st.label} ({count})
                </button>
              );
            })}
          </div>

          {/* 4 & 9. CURATED RESOURCE CARDS WITH FORMAT-SPECIFIC BREAKDOWN */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--text-faint)" }}>
                Curated Resources ({filteredResources.length}) · Ranked by Relevance & Utility
              </div>
            </div>

            {filteredResources.length === 0 ? (
              <EmptyState
                icon="search"
                title="No resources match this filter"
                description="Try clearing node selection or switching intent streams to view all resources."
              />
            ) : (
              filteredResources.map((res) => (
                <HubResourceCard
                  key={res.id}
                  item={res}
                  onToggleComplete={() => handleToggleComplete(res.id)}
                  onToggleSave={() => handleToggleSave(res.id)}
                  isCompleting={!!completing[res.id]}
                  onAskMentor={() => askMentorQuestion(res)}
                  onTestMe={() => triggerTestMe(res)}
                  onReviewWork={() => triggerReviewWork(res)}
                  onAnotherExplanation={() => triggerAlternativeExplanation(res)}
                />
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ── Multi-Format Resource Card ────────────────────────────────────────────────

interface HubResourceCardProps {
  item: HubResourceItem;
  onToggleComplete: () => void;
  onToggleSave: () => void;
  isCompleting: boolean;
  onAskMentor: () => void;
  onTestMe: () => void;
  onReviewWork: () => void;
  onAnotherExplanation: () => void;
}

function HubResourceCard({
  item,
  onToggleComplete,
  onToggleSave,
  isCompleting,
  onAskMentor,
  onTestMe,
  onReviewWork,
  onAnotherExplanation,
}: HubResourceCardProps) {
  const [showSteps, setShowSteps] = useState(false);

  const isVideo = item.format === "Video" || (item.mediaUrl && item.mediaUrl.includes("youtube.com"));
  const isPodcast = item.format === "AudioPodcast" || item.podcastBreakdown != null;
  const isPaper = item.format === "AcademicPaper" || item.paperBreakdown != null;
  const isProject = item.format === "ProjectGuide" || item.category === "Apply";

  return (
    <div id={`resource-${item.id}`} className={`learn-resource-card ${item.isCompleted ? "completed" : ""}`} style={{ marginBottom: 20 }}>
      {/* Top Meta Line: Format Badge, Level, Source, Duration */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
          <span
            className={`learn-seq-badge ${
              item.category === "Learn"
                ? "learn-seq-badge--start"
                : item.category === "Apply"
                ? "learn-seq-badge--practice"
                : item.category === "Research"
                ? "learn-seq-badge--capstone"
                : item.category === "StayCurrent"
                ? "learn-seq-badge--dev"
                : "learn-seq-badge--next"
            }`}
          >
            {item.category.toUpperCase()} · {item.format.toUpperCase()}
          </span>

          <span className="learn-resource-badge learn-resource-badge--tutorial">
            {item.level}
          </span>

          <span style={{ fontSize: 11.5, fontWeight: 700, color: "var(--cyan-deep)", background: "var(--cyan-light)", padding: "2px 8px", borderRadius: 99 }}>
            {item.subInterest}
          </span>

          <span className="learn-resource-meta">
            {item.authorOrChannel ? `${item.authorOrChannel} · ` : ""}{item.source}
          </span>
        </div>

        {item.durationOrReadTime && (
          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)" }}>
            <Icon name="time" size={12} /> {item.durationOrReadTime}
          </span>
        )}
      </div>

      {/* Title */}
      <h3 style={{ fontFamily: "var(--font-display)", fontSize: 16.5, fontWeight: 700, lineHeight: 1.4, margin: "0 0 10px 0" }}>
        {item.title}
      </h3>

      {/* 4. "WHY THIS RESOURCE?" Callout */}
      {item.whyThisResource && (
        <div className="learn-why-box">
          <div className="learn-why-box__title">
            <span><Icon name="goal" /></span> WHY THIS RESOURCE?
          </div>
          <div className="learn-why-box__text">
            {item.whyThisResource}
          </div>
        </div>
      )}

      {/* Media Players: Inline Video or Audio */}
      {isVideo && item.url && (
        <div style={{ margin: "14px 0" }}>
          <VideoEmbed url={item.url} title={item.title} />
        </div>
      )}

      {isPodcast && (
        <div style={{ margin: "14px 0" }}>
          {item.mediaUrl && <AudioEmbed url={item.mediaUrl} title={item.title} />}
          {!item.mediaUrl && item.url && (
            <a href={item.url} target="_blank" rel="noreferrer" className="btn btn--sm" style={{ textDecoration: "none" }}>
              <Icon name="podcast" /> Listen to Full Episode on {item.source} ↗
            </a>
          )}
        </div>
      )}

      {/* 9. FORMAT-SPECIFIC UNDERSTANDING */}

      {/* A. TUTORIAL & PROJECT FORMAT: What You'll Learn + Step-by-Step Breakdown */}
      {(item.category === "Learn" || isProject) && item.whatYouWillLearn && (
        <div className="learn-what-you-will-build" style={{ marginBottom: 12 }}>
          <strong style={{ color: "var(--cyan-deep)" }}>WHAT YOU WILL LEARN & BUILD:</strong> {item.whatYouWillLearn}
        </div>
      )}

      {(item.category === "Learn" || isProject) && item.stepByStepBreakdown && item.stepByStepBreakdown.length > 0 && (
        <div style={{ margin: "12px 0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--cyan-deep)" }}>
              Step-by-Step Hands-on Breakdown ({item.stepByStepBreakdown.length} Steps)
            </span>
            <button
              type="button"
              className="btn btn--text btn--sm"
              style={{ fontSize: 11.5, padding: "2px 6px", color: "var(--cyan-deep)" }}
              onClick={() => setShowSteps(!showSteps)}
            >
              {showSteps ? "Collapse steps" : "View step-by-step instructions"}{" "}
                      <Icon name={showSteps ? "collapse" : "expand"} size={13} />
            </button>
          </div>

          {showSteps && (
            <div className="learn-tutorial-steps">
              {item.stepByStepBreakdown.map((step) => (
                <div className="learn-step-item" key={step.stepNumber}>
                  <div className="learn-step-num">{step.stepNumber}</div>
                  <div style={{ flex: 1 }}>
                    <div className="learn-step-title">{step.title}</div>
                    <div className="learn-step-instruction">{step.instruction}</div>
                    {step.codeSnippetOrKeyPoint && (
                      <code style={{ display: "block", background: "#f1f5f9", padding: "4px 8px", borderRadius: 6, fontSize: 11, marginTop: 4 }}>
                        {step.codeSnippetOrKeyPoint}
                      </code>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* B. ACADEMIC PAPER 8-PART BREAKDOWN */}
      {isPaper && item.paperBreakdown && (
        <div className="hub-paper-box">
          <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".06em", color: "#4f46e5", marginBottom: 10 }}>
            <Icon name="paper" /> Academic Research Paper Breakdown (8-Part Analysis)
          </div>
          <div className="hub-paper-item">
            <div className="hub-paper-label">1. Introduction</div>
            <div className="hub-paper-val">{item.paperBreakdown.introduction}</div>
          </div>
          <div className="hub-paper-item">
            <div className="hub-paper-label">2. Problem Statement</div>
            <div className="hub-paper-val">{item.paperBreakdown.problem}</div>
          </div>
          <div className="hub-paper-item">
            <div className="hub-paper-label">3. Aim & Objectives</div>
            <div className="hub-paper-val">{item.paperBreakdown.aimAndObjectives}</div>
          </div>
          <div className="hub-paper-item">
            <div className="hub-paper-label">4. Methodology</div>
            <div className="hub-paper-val">{item.paperBreakdown.methodology}</div>
          </div>
          <div className="hub-paper-item">
            <div className="hub-paper-label">5. Key Arguments</div>
            <div className="hub-paper-val">{item.paperBreakdown.keyArguments}</div>
          </div>
          <div className="hub-paper-item">
            <div className="hub-paper-label">6. Empirical Findings</div>
            <div className="hub-paper-val">{item.paperBreakdown.findings}</div>
          </div>
          <div className="hub-paper-item">
            <div className="hub-paper-label">7. Academic Contribution</div>
            <div className="hub-paper-val">{item.paperBreakdown.contribution}</div>
          </div>
          <div className="hub-paper-item">
            <div className="hub-paper-label">8. Why It Matters for Practice</div>
            <div className="hub-paper-val">{item.paperBreakdown.whyItMatters}</div>
          </div>
        </div>
      )}

      {/* C. PODCAST BREAKDOWN */}
      {isPodcast && item.podcastBreakdown && (
        <div className="hub-podcast-box">
          <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".06em", color: "#9333ea", marginBottom: 10 }}>
            <Icon name="podcast" /> Podcast Key Insights & Takeaways
          </div>
          <div style={{ marginBottom: 10 }}>
            <div className="hub-podcast-label">KEY IDEAS</div>
            <ul className="hub-podcast-list">
              {item.podcastBreakdown.keyIdeas.map((idea, idx) => (
                <li key={idx}>{idea}</li>
              ))}
            </ul>
          </div>
          <div style={{ marginBottom: 10 }}>
            <div className="hub-podcast-label">IMPORTANT POINTS</div>
            <ul className="hub-podcast-list">
              {item.podcastBreakdown.importantPoints.map((pt, idx) => (
                <li key={idx}>{pt}</li>
              ))}
            </ul>
          </div>
          <div style={{ marginBottom: 10 }}>
            <div className="hub-podcast-label">TAKEAWAYS</div>
            <ul className="hub-podcast-list">
              {item.podcastBreakdown.takeaways.map((t, idx) => (
                <li key={idx}>{t}</li>
              ))}
            </ul>
          </div>
          <div>
            <div className="hub-podcast-label">NEXT MOVE</div>
            <div style={{ fontSize: 12.5, color: "#374151", lineHeight: 1.5 }}>
              {item.podcastBreakdown.nextMove}
            </div>
          </div>
        </div>
      )}

      {/* D. ARTICLE / STAY CURRENT 4-PART BREAKDOWN */}
      {(!isPaper && !isPodcast) && item.whatHappened && (
        <div className="learn-intelligence-box">
          <IntelBlock label="WHAT HAPPENED" value={item.whatHappened} />
          <IntelBlock label="WHY IT MATTERS" value={item.whyItMatters} />
          <IntelBlock label="NEXT MOVE" value={item.nextMove} preserveLineBreaks />
        </div>
      )}

      {/* Practical Practice Task Box */}
      {item.practiceExercise && (
        <div className="learn-practice-box">
          <div className="learn-practice-box__head">
            <div className="learn-practice-box__title">
              <span><Icon name="build" /></span> {item.practiceExerciseTitle || "PRACTICAL LAB EXERCISE"}
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#92400e" }}>
              Hands-on Lab
            </span>
          </div>
          <div className="learn-practice-box__desc">
            {item.practiceExercise}
          </div>
        </div>
      )}

      {/* AI Learning Mentor Action Bar */}
      <div className="learn-mentor-bar">
        <span className="learn-mentor-bar__label">AI MENTOR:</span>
        <button className="learn-mentor-btn" onClick={onAskMentor} title="Ask mentor to explain this concept simply">
          <Icon name="idea" /> Ask AI Mentor
        </button>
        <button className="learn-mentor-btn learn-mentor-btn--primary" onClick={onTestMe} title="Test your understanding with an interactive quiz">
          <Icon name="note" /> Test Me (Quiz)
        </button>
        <button className="learn-mentor-btn" onClick={onReviewWork} title="Submit your code or lab output for review">
          <Icon name="build" /> Review My Work
        </button>
        <button className="learn-mentor-btn" onClick={onAnotherExplanation} title="Get an alternative analogy">
          <Icon name="refresh" /> Another Explanation
        </button>
      </div>

      {/* Completion & Save Footer */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12, flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button
            className={`btn btn--sm ${item.isCompleted ? "btn--text" : "btn--primary"}`}
            onClick={onToggleComplete}
            disabled={isCompleting}
          >
            {isCompleting ? "Saving…" : item.isCompleted ? "Completed & Mastered" : "Mark as Completed"}
          </button>
          <button
            className={`btn btn--sm ${item.isSaved ? "btn--secondary" : "btn--text"}`}
            onClick={onToggleSave}
          >
            {item.isSaved ? "Saved in Library" : "Save Resource"}
          </button>
        </div>

        {item.isCompleted && (
          <span style={{ fontSize: 12, color: "#059669", fontWeight: 700 }}>
            Knowledge Graph confidence updated
          </span>
        )}
      </div>
    </div>
  );
}
