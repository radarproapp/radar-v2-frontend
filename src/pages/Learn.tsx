import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { LoadingSkeleton } from "../components/LoadingSkeleton";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { VideoEmbed } from "../components/VideoEmbed";
import { ApiError, completeLesson, completeLearningResource, generateLearningPathway, getActiveRoadmap } from "../lib/api";
import type { GrowthRoadmap, LearningResource } from "../lib/types";

export function Learn() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [generating, setGenerating] = useState(false);
  const [expandedStage, setExpandedStage] = useState<number | null>(0);
  const [openLessonId, setOpenLessonId] = useState<string | null>(null);
  const [openTutorialId, setOpenTutorialId] = useState<string | null>(null);
  const [resourceFilter, setResourceFilter] = useState<"all" | "tutorials" | "developments">("all");
  const [levelFilter, setLevelFilter] = useState<"all" | "Beginner" | "Intermediate" | "Advanced">("all");
  const [activeTab, setActiveTab] = useState<"pathway" | "resources">("pathway");
  const [completing, setCompleting] = useState<Record<string, boolean>>({});
  const [completingResource, setCompletingResource] = useState<Record<string, boolean>>({});

  const handleGeneratePathway = async () => {
    setGenerating(true);
    try {
      const roadmap = await generateLearningPathway();
      queryClient.setQueryData(["roadmap", "active"], roadmap);
    } catch {
      // keep showing the existing roadmap rather than surfacing a dead end
    } finally {
      setGenerating(false);
    }
  };

  const roadmapQuery = useQuery({ queryKey: ["roadmap", "active"], queryFn: getActiveRoadmap, retry: false });
  const roadmap = roadmapQuery.data;
  const errorMessage = roadmapQuery.error instanceof ApiError ? roadmapQuery.error.message : "Failed to load roadmap.";
  const notFound = roadmapQuery.error instanceof ApiError && roadmapQuery.error.status === 404;

  const toggleStage = (index: number) => {
    setExpandedStage((current) => (current === index ? null : index));
    setOpenLessonId(null);
  };

  const startStage = (index: number) => {
    setExpandedStage(index);
    setOpenLessonId(null);
  };

  const toggleTutorialSteps = (id: string) => {
    setOpenTutorialId((prev) => (prev === id ? null : id));
  };

  const markComplete = async (moduleId: string, lessonId: string, isCompleted: boolean) => {
    if (!roadmap || isCompleted) return;
    setCompleting((prev) => ({ ...prev, [lessonId]: true }));
    try {
      await completeLesson(roadmap.id, moduleId, lessonId);
      queryClient.setQueryData<GrowthRoadmap>(["roadmap", "active"], (old) =>
        old
          ? {
              ...old,
              modules: old.modules.map((module) =>
                module.id === moduleId
                  ? { ...module, lessons: module.lessons.map((lesson) => (lesson.id === lessonId ? { ...lesson, isCompleted: true } : lesson)) }
                  : module,
              ),
            }
          : old,
      );
      queryClient.invalidateQueries({ queryKey: ["roadmap", "active"] });
    } finally {
      setCompleting((prev) => {
        const next = { ...prev };
        delete next[lessonId];
        return next;
      });
    }
  };

  const handleToggleResource = async (resourceId: string) => {
    if (!roadmap) return;
    setCompletingResource((prev) => ({ ...prev, [resourceId]: true }));
    try {
      await completeLearningResource(roadmap.id, resourceId);
      queryClient.setQueryData<GrowthRoadmap>(["roadmap", "active"], (old) => {
        if (!old) return old;
        const updateList = (list: LearningResource[] | undefined) =>
          (list ?? []).map((r) => (r.id === resourceId ? { ...r, isCompleted: !r.isCompleted } : r));

        return {
          ...old,
          resources: updateList(old.resources),
          modules: old.modules.map((m) => ({
            ...m,
            resources: updateList(m.resources),
          })),
        };
      });
    } finally {
      setCompletingResource((prev) => {
        const next = { ...prev };
        delete next[resourceId];
        return next;
      });
    }
  };

  const estimatedWeeks = 12;
  const stages = [
    ["01", "Know the Basics", "Build the foundation and prerequisites you need to get started.", "Beginner"],
    ["02", "Build Your Skills", "Turn knowledge into practical skills through step-by-step building.", "Intermediate"],
    ["03", "Build Your Depth", "Go deeper. Master system design, advanced patterns, and architecture.", "Advanced"],
    ["04", "Put It to Work", "Take what you have learned and apply it to real-world production cases.", "Advanced"],
  ] as const;

  // Aggregate all resources across the roadmap
  const allRoadmapResources: LearningResource[] = roadmap
    ? (roadmap.resources && roadmap.resources.length > 0
        ? roadmap.resources
        : roadmap.modules.flatMap((m) => m.resources ?? []))
    : [];

  // Filter resources based on user selection
  const filterResources = (items: LearningResource[]) => {
    return items.filter((r) => {
      const matchesType =
        resourceFilter === "all" ||
        (resourceFilter === "tutorials" && r.type === "TutorialVideo") ||
        (resourceFilter === "developments" && (r.type === "NewDevelopmentVideo" || r.type === "BlogPost"));
      const matchesLevel =
        levelFilter === "all" || r.level.toLowerCase() === levelFilter.toLowerCase();
      return matchesType && matchesLevel;
    });
  };

  const filteredAllResources = filterResources(allRoadmapResources);
  const totalTutorials = allRoadmapResources.filter((r) => r.type === "TutorialVideo").length;
  const totalDevelopments = allRoadmapResources.filter((r) => r.type === "NewDevelopmentVideo" || r.type === "BlogPost").length;

  return (
    <div className="r-page" style={{ maxWidth: 880 }}>
      {roadmapQuery.isError && !notFound ? (
        <ErrorState title="Failed to load roadmap" description={errorMessage} onRetry={() => roadmapQuery.refetch()} />
      ) : roadmapQuery.isLoading ? (
        <>
          <div className="r-page-head">
            <div className="r-kicker">SUGGESTED LEARNING PATHWAY</div>
          </div>
          <LoadingSkeleton variant="card" count={3} />
        </>
      ) : !roadmap ? (
        <EmptyState icon="🗺️" title="No roadmap yet" description="Complete onboarding to get your personal growth roadmap and curated learning resources.">
          <button className="btn btn--primary" onClick={() => navigate("/onboarding")}>
            Set up profile
          </button>
        </EmptyState>
      ) : (
        <>
          {/* Header */}
          <div className="r-page-head" style={{ marginBottom: 18 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
              <div>
                <div className="r-kicker">RADAR LEARNING PATHWAY · BEGINNER TO ADVANCED</div>
                <h1 className="r-page-title">{roadmap.title || `${roadmap.interest || roadmap.goal}: Complete Learning Path`}</h1>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button className="btn btn--sm" onClick={handleGeneratePathway} disabled={generating}>
                  {generating ? "Building your pathway…" : "Build a personalised pathway"}
                </button>
                <button className="btn btn--sm" onClick={() => navigate("/learn/hub")}>
                  Learn Hub
                </button>
                <button className="btn btn--primary btn--sm" onClick={() => navigate("/projects")}>
                  Start New Project
                </button>
                <button className="btn btn--sm" onClick={() => navigate("/progress")}>
                  Progress
                </button>
              </div>
            </div>
          </div>

          {/* Subtitle & Distribution Pill */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 14 }}>
            <span className="learn-split-pill">
              <strong>80%</strong> How-To Video Tutorials · <strong>20%</strong> Latest Info & Blogs
            </span>
            <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600 }}>
              Beginner → Intermediate → Advanced · {estimatedWeeks} weeks estimated
            </span>
          </div>

          <p className="learn-roadmap-desc" style={{ marginBottom: 18 }}>
            {roadmap.interest ? `Structured for ${roadmap.interest}. ` : "A structured progression from fundamentals to real-world deployment. "}
            {roadmap.modules.filter((m) => !m.isCompleted).length} modules remaining · 4 progressive stages · Hand-picked video & text resources.
          </p>

          {/* Progress Bar */}
          {roadmap.progressPercent > 0 && (
            <div style={{ marginBottom: "1.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, color: "var(--text-muted)", marginBottom: 4 }}>
                <span>Roadmap mastery</span>
                <span>{roadmap.progressPercent}% complete</span>
              </div>
              <div style={{ height: 6, background: "var(--bg-hover)", borderRadius: 99, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${roadmap.progressPercent}%`, background: "var(--cyan)", borderRadius: 99, transition: "width .4s var(--ease)" }} />
              </div>
            </div>
          )}

          {/* Tab Selector: Stage Progression vs All Video & Blog Resources */}
          <div style={{ display: "flex", gap: 8, borderBottom: "1.5px solid var(--border)", paddingBottom: 10, marginBottom: 20 }}>
            <button
              className={`btn btn--sm ${activeTab === "pathway" ? "btn--primary" : "btn--text"}`}
              onClick={() => setActiveTab("pathway")}
            >
              🗺️ Learning Pathway Stages
            </button>
            <button
              className={`btn btn--sm ${activeTab === "resources" ? "btn--primary" : "btn--text"}`}
              onClick={() => setActiveTab("resources")}
            >
              🎬 Video & Blog Resources ({allRoadmapResources.length})
            </button>
          </div>

          {/* Resource Filter Bar (Visible in both views) */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", background: "#f8fafb", padding: "10px 14px", borderRadius: 12, marginBottom: 20 }}>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--text-faint)", marginRight: 4 }}>Resource:</span>
              <button
                className={`r-chip ${resourceFilter === "all" ? "active" : ""}`}
                style={{ fontSize: 11.5, padding: "3px 10px" }}
                onClick={() => setResourceFilter("all")}
              >
                All ({allRoadmapResources.length})
              </button>
              <button
                className={`r-chip ${resourceFilter === "tutorials" ? "active" : ""}`}
                style={{ fontSize: 11.5, padding: "3px 10px" }}
                onClick={() => setResourceFilter("tutorials")}
              >
                🛠️ How-To Tutorials (80%) ({totalTutorials})
              </button>
              <button
                className={`r-chip ${resourceFilter === "developments" ? "active" : ""}`}
                style={{ fontSize: 11.5, padding: "3px 10px" }}
                onClick={() => setResourceFilter("developments")}
              >
                ⚡ Latest Info & Blogs (20%) ({totalDevelopments})
              </button>
            </div>

            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--text-faint)", marginRight: 4 }}>Level:</span>
              {(["all", "Beginner", "Intermediate", "Advanced"] as const).map((lvl) => (
                <button
                  key={lvl}
                  className={`r-chip ${levelFilter === lvl ? "active" : ""}`}
                  style={{ fontSize: 11.5, padding: "3px 9px" }}
                  onClick={() => setLevelFilter(lvl)}
                >
                  {lvl === "all" ? "All Levels" : lvl}
                </button>
              ))}
            </div>
          </div>

          {/* TAB 1: Stage by Stage Learning Path */}
          {activeTab === "pathway" && (
            <div className="learn-modules">
              {stages.map(([number, title, description, stageLevel], stageIndex) => {
                const start = Math.floor((roadmap.modules.length * stageIndex) / stages.length);
                const end = Math.floor((roadmap.modules.length * (stageIndex + 1)) / stages.length);
                const stageModules = roadmap.modules.slice(start, Math.max(end, start + 1));
                const isNext = stageModules.some((module) => !module.isCompleted && !module.isLocked);
                const stageComplete = stageModules.length > 0 && stageModules.every((module) => module.isCompleted);
                const isOpen = expandedStage === stageIndex;

                // Extract and filter stage resources
                const stageRawResources = stageModules.flatMap((m) => m.resources ?? []);
                const fallbackResources = allRoadmapResources.filter(
                  (r) => r.level.toLowerCase() === stageLevel.toLowerCase()
                );
                const stageResources = filterResources(
                  stageRawResources.length > 0 ? stageRawResources : fallbackResources
                );

                return (
                  <div className="learn-module-row" key={number}>
                    <div className={`learn-module-num ${stageComplete ? "completed" : isNext ? "active" : ""}`}>
                      <span>{stageComplete ? "✓" : number}</span>
                    </div>

                    <div className={`learn-module-card ${isNext ? "active" : ""}`}>
                      <div className="learn-module-top">
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div className="learn-module-title">{title}</div>
                            <span className="learn-resource-badge learn-resource-badge--tutorial">
                              {stageLevel}
                            </span>
                          </div>
                          <div style={{ color: "var(--text-muted)", fontSize: 12.5, marginTop: 4 }}>{description}</div>
                        </div>
                        {isNext && <span className="learn-module-tag learn-module-tag--next">CURRENT FOCUS</span>}
                      </div>

                      <div className="learn-module-counts">
                        <span className="learn-module-count">{stageModules.reduce((sum, module) => sum + module.lessons.length, 0)} curriculum lessons</span>
                        <span className="learn-module-count">🎬 {stageResources.length} curated resources</span>
                        <span className="learn-module-count">{stageModules.length} core modules</span>
                      </div>

                      <div style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 12 }}>
                        {stageModules.map((module) => module.title).join(" · ")}
                      </div>

                      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: isOpen ? 14 : 0 }}>
                        <button
                          className={isNext ? "btn btn--primary btn--sm" : "btn btn--sm"}
                          onClick={() => (isNext ? startStage(stageIndex) : toggleStage(stageIndex))}
                          aria-expanded={isOpen}
                        >
                          {isOpen ? "Hide stage details ▴" : isNext ? "Start stage & explore resources ▾" : "Explore stage resources ▾"}
                        </button>
                        {isOpen && (
                          <button className="btn btn--text btn--sm" onClick={() => toggleStage(stageIndex)}>
                            Close
                          </button>
                        )}
                      </div>

                      {/* Expanded Stage View: Curriculum Lessons + Rich Curated Video & Blog Resources */}
                      {isOpen && (
                        <div className="learn-stage-preview">
                          {/* Module Lessons List */}
                          <div style={{ marginBottom: 18 }}>
                            <div style={{ fontSize: 11.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--cyan)", marginBottom: 10 }}>
                              Curriculum Modules & Lessons
                            </div>
                            {stageModules.map((module) => (
                              <div className="learn-stage-module" key={module.id} style={{ marginBottom: 10 }}>
                                <div className="learn-stage-module__head">
                                  <span className="learn-stage-module__title">{module.title}</span>
                                  {module.isCompleted ? (
                                    <span className="learn-stage-module__done">✓ Complete</span>
                                  ) : module.isLocked ? (
                                    <span className="learn-stage-module__lock">Locked</span>
                                  ) : null}
                                </div>
                                {module.description && <div className="learn-stage-module__desc">{module.description}</div>}
                                <ul className="learn-stage-lessons">
                                  {module.lessons.map((lesson) => {
                                    const open = openLessonId === lesson.id;
                                    return (
                                      <li className="learn-lesson" key={lesson.id}>
                                        <button className="learn-lesson__row" onClick={() => setOpenLessonId(open ? null : lesson.id)} aria-expanded={open}>
                                          <span className={`learn-lesson__check ${lesson.isCompleted ? "done" : ""}`}>{lesson.isCompleted ? "✓" : ""}</span>
                                          <span className="learn-lesson__title">{lesson.title}</span>
                                          {lesson.estimatedTime && <span className="learn-lesson__time">{lesson.estimatedTime}</span>}
                                          <span className="learn-lesson__chev">{open ? "▾" : "▸"}</span>
                                        </button>
                                        {open && (
                                          <div className="learn-lesson__body">
                                            {lesson.body ? <p style={{ fontSize: 13, lineHeight: 1.6 }}>{lesson.body}</p> : <p className="learn-lesson__muted">Hands-on lesson practice module.</p>}
                                            {isNext && !lesson.isCompleted ? (
                                              <button
                                                className="btn btn--primary btn--sm"
                                                disabled={completing[lesson.id]}
                                                onClick={() => markComplete(module.id, lesson.id, lesson.isCompleted)}
                                              >
                                                {completing[lesson.id] ? "Saving…" : "Mark as complete"}
                                              </button>
                                            ) : lesson.isCompleted ? (
                                              <span className="learn-lesson__completed-note">Completed</span>
                                            ) : null}
                                          </div>
                                        )}
                                      </li>
                                    );
                                  })}
                                </ul>
                              </div>
                            ))}
                          </div>

                          {/* Curated 80/20 Video & Blog Resources */}
                          <div className="learn-resources-section">
                            <div className="learn-resources-header">
                              <div>
                                <div className="learn-resources-title">
                                  Stage Resources: Useful How-To Videos & Skill Developments
                                </div>
                                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                                  80% step-by-step how-to tutorials · 20% latest updates & blog posts
                                </div>
                              </div>
                              <span className="learn-resource-badge learn-resource-badge--tutorial">
                                {stageResources.length} items
                              </span>
                            </div>

                            {stageResources.length === 0 ? (
                              <div style={{ fontSize: 13, color: "var(--text-faint)", fontStyle: "italic", padding: "12px 0" }}>
                                No resources match the current filter. Try selecting "All Resources".
                              </div>
                            ) : (
                              stageResources.map((res) => (
                                <ResourceItemCard
                                  key={res.id}
                                  resource={res}
                                  isExpanded={openTutorialId === res.id}
                                  onToggleExpand={() => toggleTutorialSteps(res.id)}
                                  onToggleComplete={() => handleToggleResource(res.id)}
                                  isCompleting={!!completingResource[res.id]}
                                />
                              ))
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 2: Direct All Resources Explorer */}
          {activeTab === "resources" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div>
                  <h2 style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 700, margin: 0 }}>
                    Curated Learning Library ({filteredAllResources.length})
                  </h2>
                  <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "4px 0 0 0" }}>
                    Ordered from Beginner to Advanced. Step-by-step tutorial videos and high-signal skill intelligence.
                  </p>
                </div>
              </div>

              {filteredAllResources.length === 0 ? (
                <EmptyState
                  icon="🔍"
                  title="No resources found"
                  description="No resources match your active filter. Select 'All' to view the entire library."
                />
              ) : (
                filteredAllResources.map((res) => (
                  <ResourceItemCard
                    key={res.id}
                    resource={res}
                    isExpanded={openTutorialId === res.id}
                    onToggleExpand={() => toggleTutorialSteps(res.id)}
                    onToggleComplete={() => handleToggleResource(res.id)}
                    isCompleting={!!completingResource[res.id]}
                  />
                ))
              )}
            </div>
          )}

          <div style={{ marginTop: 28, textAlign: "center", fontFamily: "var(--font-display)", fontWeight: 700, color: "var(--text-dim)" }}>
            Know the Basics → Build Your Skills → Build Your Depth → Put It to Work
          </div>
        </>
      )}
    </div>
  );
}

// ── Resource Item Component ──────────────────────────────────────────────────

interface ResourceItemCardProps {
  resource: LearningResource;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onToggleComplete: () => void;
  isCompleting: boolean;
}

function ResourceItemCard({ resource, isExpanded, onToggleExpand, onToggleComplete, isCompleting }: ResourceItemCardProps) {
  const isTutorial = resource.type === "TutorialVideo" || resource.isHowToTutorial;
  const isDevelopment = resource.type === "NewDevelopmentVideo";
  const isBlog = resource.type === "BlogPost";

  return (
    <div className={`learn-resource-card ${resource.isCompleted ? "completed" : ""}`}>
      {/* Top Meta Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
          {isTutorial ? (
            <span className="learn-resource-badge learn-resource-badge--tutorial">🛠️ HOW-TO TUTORIAL · {resource.level}</span>
          ) : isDevelopment ? (
            <span className="learn-resource-badge learn-resource-badge--development">⚡ LATEST DEVELOPMENT · {resource.level}</span>
          ) : (
            <span className="learn-resource-badge learn-resource-badge--blog">📝 BLOG ESSAY · {resource.level}</span>
          )}
          <span className="learn-resource-meta">
            {resource.channelOrAuthor ? `${resource.channelOrAuthor} · ` : ""}{resource.source}
          </span>
        </div>
        {resource.duration && (
          <span style={{ fontSize: 11.5, fontWeight: 600, color: "var(--text-muted)" }}>
            ⏱️ {resource.duration}
          </span>
        )}
      </div>

      {/* Title */}
      <h3 style={{ fontFamily: "var(--font-display)", fontSize: 15.5, fontWeight: 700, lineHeight: 1.4, margin: "0 0 10px 0" }}>
        {resource.title}
      </h3>

      {/* Embedded Video (Click-to-Play via VideoEmbed) or Read Link */}
      {(isTutorial || isDevelopment) && resource.url && (
        <div style={{ marginBottom: 14 }}>
          <VideoEmbed url={resource.url} title={resource.title} />
        </div>
      )}

      {isBlog && (
        <div style={{ marginBottom: 12 }}>
          <a
            href={resource.url}
            target="_blank"
            rel="noreferrer"
            className="btn btn--sm"
            style={{ display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none" }}
          >
            📖 Read Full Essay on {resource.source} ↗
          </a>
        </div>
      )}

      {/* FOR TUTORIAL VIDEOS (80%): What You Will Build Box */}
      {isTutorial && resource.whatYouWillBuild && (
        <div className="learn-what-you-will-build">
          <strong style={{ color: "var(--cyan-deep)" }}>WHAT YOU WILL BUILD / LEARN:</strong> {resource.whatYouWillBuild}
        </div>
      )}

      {/* FOR TUTORIAL VIDEOS (80%): Simple, Step-by-Step and Detailed Format */}
      {isTutorial && resource.stepByStepBreakdown && resource.stepByStepBreakdown.length > 0 && (
        <div style={{ margin: "12px 0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--cyan)" }}>
              Step-by-Step Tutorial Breakdown ({resource.stepByStepBreakdown.length} Steps)
            </span>
            <button
              type="button"
              className="btn btn--text btn--sm"
              style={{ fontSize: 11.5, padding: "2px 6px", color: "var(--cyan)" }}
              onClick={onToggleExpand}
            >
              {isExpanded ? "Hide steps ▴" : "Show detailed steps ▾"}
            </button>
          </div>

          {isExpanded && (
            <div className="learn-tutorial-steps">
              {resource.stepByStepBreakdown.map((step) => (
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

      {/* Intelligence breakdown box */}
      <div className="learn-intelligence-box">
        {/* For Tutorials: Why it matters, Edge, Next Move */}
        {isTutorial && (
          <>
            <div>
              <div className="learn-intelligence-label">WHY THIS TUTORIAL MATTERS</div>
              <div className="learn-intelligence-text">{resource.whyItMatters}</div>
            </div>
            <div>
              <div className="learn-intelligence-label">YOUR APPLIED EDGE</div>
              <div className="learn-intelligence-text">{resource.yourEdge}</div>
            </div>
            <div>
              <div className="learn-intelligence-label">NEXT MOVE & PRACTICE PROJECT</div>
              <div className="learn-intelligence-text" style={{ whiteSpace: "pre-line" }}>{resource.nextMove}</div>
            </div>
          </>
        )}

        {/* For Latest Developments & Blog Posts (20%): 4-Part Intelligence Format */}
        {!isTutorial && (
          <>
            <div>
              <div className="learn-intelligence-label">WHAT HAPPENED</div>
              <div className="learn-intelligence-text">{resource.whatHappened}</div>
            </div>
            <div>
              <div className="learn-intelligence-label">WHY IT MATTERS</div>
              <div className="learn-intelligence-text">{resource.whyItMatters}</div>
            </div>
            <div>
              <div className="learn-intelligence-label">YOUR EDGE</div>
              <div className="learn-intelligence-text">{resource.yourEdge}</div>
            </div>
            <div>
              <div className="learn-intelligence-label">YOUR NEXT MOVE</div>
              <div className="learn-intelligence-text" style={{ whiteSpace: "pre-line" }}>{resource.nextMove}</div>
            </div>
          </>
        )}
      </div>

      {/* Action footer */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12, flexWrap: "wrap", gap: 8 }}>
        <button
          className={`btn btn--sm ${resource.isCompleted ? "btn--text" : "btn--primary"}`}
          onClick={onToggleComplete}
          disabled={isCompleting}
        >
          {isCompleting ? "Saving…" : resource.isCompleted ? "✓ Completed & Mastered" : isTutorial ? "Mark tutorial completed" : "Mark as read"}
        </button>
        {resource.isCompleted && (
          <span style={{ fontSize: 11.5, color: "#1f9d63", fontWeight: 700 }}>
            Saved to your skill progress ✓
          </span>
        )}
      </div>
    </div>
  );
}
