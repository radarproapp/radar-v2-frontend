import { useMemo, useState } from "react";
import { IntelBlock } from "../components/IntelBlock";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { LoadingSkeleton } from "../components/LoadingSkeleton";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { VideoEmbed } from "../components/VideoEmbed";
import {
  ApiError,
  completeLesson,
  completeLearningResource,
  completeLearningExercise,
  setRoadmapStage,
  generateLearningPathway,
  getActiveRoadmap,
} from "../lib/api";
import type { GrowthRoadmap, LearningResource } from "../lib/types";

// The four stages are structural and always present; their *content* is not. These titles and
// goals used to be hardcoded here as Excel / SQL / Power BI / Python, so a cybersecurity learner
// was told their beginner stage was "Excel fundamentals, data cleaning, basic statistics" no
// matter what their roadmap actually said. The labels now come from the roadmap itself, with a
// domain-neutral fallback for the gap before one is generated.
const STAGE_KEYS = ["Beginner", "Intermediate", "Advanced", "Application"] as const;

const STAGE_FALLBACKS: Record<string, { subtitle: string; goal: string }> = {
  Beginner: { subtitle: "Foundations & Core Tools", goal: "Core concepts, vocabulary and the standard toolset" },
  Intermediate: { subtitle: "Applied Workflows", goal: "Realistic problems worked end to end" },
  Advanced: { subtitle: "Depth & Specialisation", goal: "Specialised techniques, scale and judgement" },
  Application: { subtitle: "Portfolio & Interview Prep", goal: "Evidence of capability, and the interview to prove it" },
};

/// Strips the redundant "Beginner: " prefix the roadmap templates put on module titles, so the
/// stage card doesn't read "Stage 01 Beginner / Beginner: Networking & Security Foundations".
function stripStagePrefix(title: string, key: string): string {
  const prefix = `${key}:`;
  return title.toLowerCase().startsWith(prefix.toLowerCase()) ? title.slice(prefix.length).trim() : title;
}

export function Learn() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [generating, setGenerating] = useState(false);
  const [selectedStageKey, setSelectedStageKey] = useState<string>("Beginner");
  const [openLessonId, setOpenLessonId] = useState<string | null>(null);
  const [openTutorialId, setOpenTutorialId] = useState<string | null>(null);
  const [resourceFilter, setResourceFilter] = useState<"all" | "tutorials" | "developments">("all");
  const [activeTab, setActiveTab] = useState<"guided" | "all-stages" | "catalog">("guided");
  const [completing, setCompleting] = useState<Record<string, boolean>>({});
  const [completingResource, setCompletingResource] = useState<Record<string, boolean>>({});
  const [completingExercise, setCompletingExercise] = useState<Record<string, boolean>>({});

  const roadmapQuery = useQuery({ queryKey: ["roadmap", "active"], queryFn: getActiveRoadmap, retry: false });
  const roadmap = roadmapQuery.data;

  // Stage labels follow the roadmap the user actually has, not a fixed curriculum.
  const stageDefinitions = useMemo(
    () =>
      STAGE_KEYS.map((key) => {
        const module = roadmap?.modules?.find((m) => m.level?.toLowerCase() === key.toLowerCase());
        const fallback = STAGE_FALLBACKS[key];
        return {
          key,
          label: `Stage ${String(STAGE_KEYS.indexOf(key) + 1).padStart(2, "0")}: ${key}`,
          subtitle: module?.title ? stripStagePrefix(module.title, key) : fallback.subtitle,
          goal: module?.stageGoal || fallback.goal,
        };
      }),
    [roadmap],
  );
  const errorMessage = roadmapQuery.error instanceof ApiError ? roadmapQuery.error.message : "Failed to load roadmap.";
  const notFound = roadmapQuery.error instanceof ApiError && roadmapQuery.error.status === 404;

  const handleGeneratePathway = async () => {
    setGenerating(true);
    try {
      const updated = await generateLearningPathway();
      queryClient.setQueryData(["roadmap", "active"], updated);
    } catch {
      // keep showing the existing roadmap rather than surfacing an error
    } finally {
      setGenerating(false);
    }
  };

  const handleSelectStage = async (stageKey: string) => {
    setSelectedStageKey(stageKey);
    if (roadmap) {
      try {
        await setRoadmapStage(roadmap.id, stageKey);
        queryClient.setQueryData<GrowthRoadmap>(["roadmap", "active"], (old) =>
          old ? { ...old, currentStage: stageKey } : old,
        );
      } catch {
        // non-blocking
      }
    }
  };

  const toggleTutorialSteps = (id: string) => {
    setOpenTutorialId((prev) => (prev === id ? null : id));
  };

  const markLessonComplete = async (moduleId: string, lessonId: string, isCompleted: boolean) => {
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
                  ? {
                      ...module,
                      lessons: module.lessons.map((lesson) =>
                        lesson.id === lessonId ? { ...lesson, isCompleted: true } : lesson,
                      ),
                    }
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
        const toggleItem = (r: LearningResource) => (r.id === resourceId ? { ...r, isCompleted: !r.isCompleted } : r);
        const completedIds = old.completedResourceIds ?? [];
        const isCurrentlyCompleted = completedIds.includes(resourceId);
        const updatedIds = isCurrentlyCompleted
          ? completedIds.filter((id) => id !== resourceId)
          : [...completedIds, resourceId];

        return {
          ...old,
          completedResourceIds: updatedIds,
          resources: (old.resources ?? []).map(toggleItem),
          modules: old.modules.map((m) => ({
            ...m,
            resources: (m.resources ?? []).map(toggleItem),
          })),
        };
      });
      queryClient.invalidateQueries({ queryKey: ["roadmap", "active"] });
    } finally {
      setCompletingResource((prev) => {
        const next = { ...prev };
        delete next[resourceId];
        return next;
      });
    }
  };

  const handleToggleExercise = async (resourceId: string) => {
    if (!roadmap) return;
    setCompletingExercise((prev) => ({ ...prev, [resourceId]: true }));
    try {
      await completeLearningExercise(roadmap.id, resourceId);
      queryClient.setQueryData<GrowthRoadmap>(["roadmap", "active"], (old) => {
        if (!old) return old;
        const toggleEx = (r: LearningResource) =>
          r.id === resourceId ? { ...r, isExerciseCompleted: !r.isExerciseCompleted } : r;
        const completedExIds = old.completedExerciseIds ?? [];
        const isDone = completedExIds.includes(resourceId);
        const updatedExIds = isDone
          ? completedExIds.filter((id) => id !== resourceId)
          : [...completedExIds, resourceId];

        return {
          ...old,
          completedExerciseIds: updatedExIds,
          resources: (old.resources ?? []).map(toggleEx),
          modules: old.modules.map((m) => ({
            ...m,
            resources: (m.resources ?? []).map(toggleEx),
          })),
        };
      });
      queryClient.invalidateQueries({ queryKey: ["roadmap", "active"] });
    } finally {
      setCompletingExercise((prev) => {
        const next = { ...prev };
        delete next[resourceId];
        return next;
      });
    }
  };

  // Navigations to AI Learning Mentor with full context prefilled
  const askMentorQuestion = (resource: LearningResource) => {
    const prompt = `I'm studying "${resource.title}". Can you explain the core concepts in simple, intuitive terms and give a real-world example?`;
    navigate(`/mentor?mode=chat&prompt=${encodeURIComponent(prompt)}`);
  };

  const triggerTestMe = (resource: LearningResource, stage: string) => {
    const topic = resource.quizTopic || resource.title;
    navigate(`/mentor?mode=quiz&topic=${encodeURIComponent(topic)}&stage=${encodeURIComponent(stage)}&roadmapId=${encodeURIComponent(roadmap?.id || "")}`);
  };

  const triggerReviewWork = (resource: LearningResource) => {
    const title = resource.practiceExerciseTitle || resource.title;
    const contentPlaceholder = `Here is my solution for "${resource.practiceExerciseTitle || resource.title}":\n\n[Paste your code, query or analysis here]`;
    navigate(`/mentor?mode=review&title=${encodeURIComponent(title)}&content=${encodeURIComponent(contentPlaceholder)}&type=Project Brief`);
  };

  const triggerAlternativeExplanation = (resource: LearningResource) => {
    const prompt = `I'm having trouble understanding "${resource.title}". Can you break it down with an intuitive analogy, step-by-step mental model, and another explanation?`;
    navigate(`/mentor?mode=chat&prompt=${encodeURIComponent(prompt)}`);
  };

  // Resources aggregation & filtering
  const allResources: LearningResource[] = roadmap
    ? roadmap.resources && roadmap.resources.length > 0
      ? roadmap.resources
      : roadmap.modules.flatMap((m) => m.resources ?? [])
    : [];

  const filterList = (items: LearningResource[]) => {
    return items.filter((r) => {
      if (resourceFilter === "tutorials") return r.type === "TutorialVideo" || r.isHowToTutorial;
      if (resourceFilter === "developments") return r.type === "NewDevelopmentVideo" || r.type === "BlogPost";
      return true;
    });
  };

  // Resources for the currently selected stage
  const currentStageResources = filterList(
    allResources
      .filter((r) => r.level.toLowerCase() === selectedStageKey.toLowerCase())
      .sort((a, b) => (a.order ?? 99) - (b.order ?? 99)),
  );

  const activeStageModule = roadmap?.modules.find(
    (m) => m.level?.toLowerCase() === selectedStageKey.toLowerCase(),
  );

  const currentStageProgress = roadmap?.stageMastery?.[selectedStageKey] ?? 0;
  const totalTutorials = allResources.filter((r) => r.type === "TutorialVideo" || r.isHowToTutorial).length;
  const totalDevelopments = allResources.filter((r) => r.type === "NewDevelopmentVideo" || r.type === "BlogPost").length;

  return (
    <div className="r-page" style={{ maxWidth: 900 }}>
      {roadmapQuery.isError && !notFound ? (
        <ErrorState title="Failed to load roadmap" description={errorMessage} onRetry={() => roadmapQuery.refetch()} />
      ) : roadmapQuery.isLoading ? (
        <>
          <div className="r-page-head">
            <div className="r-kicker">RADAR LEARNING PATH</div>
          </div>
          <LoadingSkeleton variant="card" count={3} />
        </>
      ) : !roadmap ? (
        <EmptyState
          icon="🗺️"
          title="No roadmap yet"
          description="Complete onboarding to get your personal growth roadmap and curated learning path from beginner to application."
        >
          <button className="btn btn--primary" onClick={() => navigate("/onboarding")}>
            Set up profile
          </button>
        </EmptyState>
      ) : (
        <>
          {/* Header */}
          <div className="r-page-head" style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
              <div>
                <div className="r-kicker" style={{ letterSpacing: ".08em" }}>
                  RADAR LEARNING PATH · BEGINNER → INTERMEDIATE → ADVANCED → APPLICATION
                </div>
                <h1 className="r-page-title" style={{ fontSize: "1.75rem", margin: "4px 0" }}>
                  {roadmap.title || `${roadmap.interest || roadmap.goal}: Complete Learning Journey`}
                </h1>
                <p style={{ fontSize: 13.5, color: "var(--text-muted)", margin: "4px 0 0 0" }}>
                  Designed specifically for your goal: <strong>{roadmap.goal || "Mastery"}</strong>.
                  Radar finds, filters, explains, teaches, tests and guides.
                </p>
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button className="btn btn--sm" onClick={handleGeneratePathway} disabled={generating}>
                  {generating ? "Building pathway…" : "Regenerate pathway"}
                </button>
                <button className="btn btn--sm" onClick={() => navigate("/mentor")}>
                  💡 AI Learning Mentor
                </button>
                <button className="btn btn--primary btn--sm" onClick={() => navigate("/projects")}>
                  🛠️ Project Studio
                </button>
              </div>
            </div>
          </div>

          {/* Core Principle & Distribution Pill */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 16 }}>
            <span className="learn-split-pill">
              <strong>80%</strong> How-To / Tutorial Content · <strong>20%</strong> Current Industry Knowledge
            </span>
            <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600 }}>
              Guided Ordering: &ldquo;Start with this&rdquo; → Practise → Test → Advance
            </span>
          </div>

          {/* Adaptive Recommendation / Weak Areas Alert */}
          {roadmap.adaptiveRecommendation && (
            <div className="learn-adaptive-card">
              <span className="learn-adaptive-card__icon">🎯</span>
              <div className="learn-adaptive-card__text">
                <strong>Radar Mentor Guidance:</strong> {roadmap.adaptiveRecommendation}
              </div>
            </div>
          )}

          {roadmap.weakAreas && roadmap.weakAreas.length > 0 && (
            <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "10px 14px", marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 16 }}>⚠️</span>
              <div style={{ fontSize: 12.5, color: "#991b1b" }}>
                <strong>Reinforcement Recommended:</strong> You scored below 75% on:{" "}
                {roadmap.weakAreas.map((w, idx) => (
                  <span key={w} style={{ textDecoration: "underline", fontWeight: 600 }}>
                    {w}{idx < (roadmap.weakAreas?.length ?? 0) - 1 ? ", " : ""}
                  </span>
                ))}
                . Review the tutorial breakdowns below and retry the quiz when ready.
              </div>
            </div>
          )}

          {/* 4-Stage Progression Navigation Grid */}
          <div className="learn-stage-grid">
            {stageDefinitions.map((stage, idx) => {
              const mastery = roadmap.stageMastery?.[stage.key] ?? 0;
              const isCurrent = (roadmap.currentStage || "Beginner").toLowerCase() === stage.key.toLowerCase();
              const isSelected = selectedStageKey.toLowerCase() === stage.key.toLowerCase();
              const isCompleted = mastery >= 80;

              return (
                <div
                  key={stage.key}
                  className={`learn-stage-pill ${isSelected ? "active" : ""}`}
                  onClick={() => handleSelectStage(stage.key)}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div className="learn-stage-pill__num">STAGE 0{idx + 1}</div>
                    {isCompleted ? (
                      <span style={{ fontSize: 11, fontWeight: 700, color: "#059669" }}>✓ Mastered</span>
                    ) : isCurrent ? (
                      <span style={{ fontSize: 9.5, fontWeight: 800, color: "var(--cyan)", background: "var(--cyan-light)", padding: "2px 6px", borderRadius: 99 }}>
                        CURRENT
                      </span>
                    ) : null}
                  </div>
                  <div className="learn-stage-pill__title">{stage.key}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.3, marginBottom: 8, height: 28, overflow: "hidden" }}>
                    {stage.subtitle}
                  </div>
                  <div className="learn-stage-pill__progress">
                    <span>Mastery</span>
                    <span>{mastery}%</span>
                  </div>
                  <div className="learn-stage-pill__bar">
                    <div className="learn-stage-pill__fill" style={{ width: `${mastery}%` }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Tab Selector */}
          <div style={{ display: "flex", gap: 8, borderBottom: "1.5px solid var(--border)", paddingBottom: 10, marginBottom: 18 }}>
            <button
              className={`btn btn--sm ${activeTab === "guided" ? "btn--primary" : "btn--text"}`}
              onClick={() => setActiveTab("guided")}
            >
              🎯 {selectedStageKey} Guided Path ({currentStageResources.length} items)
            </button>
            <button
              className={`btn btn--sm ${activeTab === "all-stages" ? "btn--primary" : "btn--text"}`}
              onClick={() => setActiveTab("all-stages")}
            >
              🗺️ Full 4-Stage Pathway
            </button>
            <button
              className={`btn btn--sm ${activeTab === "catalog" ? "btn--primary" : "btn--text"}`}
              onClick={() => setActiveTab("catalog")}
            >
              📚 All Curated Resources ({allResources.length})
            </button>
          </div>

          {/* Filter Bar: How-to Tutorials vs Latest Developments */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", background: "#f8fafb", padding: "10px 14px", borderRadius: 12, marginBottom: 20 }}>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--text-faint)", marginRight: 4 }}>
                Show:
              </span>
              <button
                className={`r-chip ${resourceFilter === "all" ? "active" : ""}`}
                style={{ fontSize: 11.5, padding: "3px 10px" }}
                onClick={() => setResourceFilter("all")}
              >
                All Resources
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

            <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600 }}>
              Stage Mastery: <strong>{currentStageProgress}%</strong>
            </div>
          </div>

          {/* TAB 1: GUIDED "START WITH THIS" ORDERED VIEW FOR ACTIVE STAGE */}
          {activeTab === "guided" && (
            <div>
              {/* Stage Goal Banner */}
              <div style={{ background: "#fff", border: "1.5px solid var(--border)", borderRadius: 14, padding: "16px 20px", marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 6 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span className="learn-seq-badge learn-seq-badge--start">ACTIVE STAGE</span>
                    <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.25rem", margin: 0 }}>
                      {selectedStageKey}: {activeStageModule?.title || stageDefinitions.find((s) => s.key === selectedStageKey)?.subtitle}
                    </h2>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "var(--cyan-deep)", background: "var(--cyan-light)", padding: "3px 10px", borderRadius: 99 }}>
                    {currentStageResources.length} ordered resources
                  </span>
                </div>
                <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "4px 0 12px 0", lineHeight: 1.5 }}>
                  {activeStageModule?.stageGoal || stageDefinitions.find((s) => s.key === selectedStageKey)?.goal}
                </p>

                {/* Curriculum Lessons for this stage */}
                {activeStageModule?.lessons && activeStageModule.lessons.length > 0 && (
                  <div style={{ borderTop: "1px solid var(--border)", paddingTop: 12 }}>
                    <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--text-faint)", marginBottom: 8 }}>
                      Stage Milestones & Topics
                    </div>
                    <ul className="learn-stage-lessons">
                      {activeStageModule.lessons.map((lesson) => {
                        const open = openLessonId === lesson.id;
                        return (
                          <li className="learn-lesson" key={lesson.id}>
                            <button
                              className="learn-lesson__row"
                              onClick={() => setOpenLessonId(open ? null : lesson.id)}
                              aria-expanded={open}
                            >
                              <span className={`learn-lesson__check ${lesson.isCompleted ? "done" : ""}`}>
                                {lesson.isCompleted ? "✓" : ""}
                              </span>
                              <span className="learn-lesson__title">{lesson.title}</span>
                              {lesson.estimatedTime && <span className="learn-lesson__time">⏱️ {lesson.estimatedTime}</span>}
                              <span className="learn-lesson__chev">{open ? "▾" : "▸"}</span>
                            </button>
                            {open && (
                              <div className="learn-lesson__body">
                                <p style={{ fontSize: 13, lineHeight: 1.6, margin: "0 0 8px 0" }}>
                                  {lesson.body || "Master this core topic through hands-on practice."}
                                </p>
                                {!lesson.isCompleted ? (
                                  <button
                                    className="btn btn--primary btn--sm"
                                    disabled={completing[lesson.id]}
                                    onClick={() => markLessonComplete(activeStageModule.id, lesson.id, lesson.isCompleted)}
                                  >
                                    {completing[lesson.id] ? "Saving…" : "Mark topic as complete ✓"}
                                  </button>
                                ) : (
                                  <span className="learn-lesson__completed-note">Completed ✓</span>
                                )}
                              </div>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </div>

              {/* The Ordered Resources ("Start with this" not a dump) */}
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".07em", color: "var(--cyan-deep)", marginBottom: 12 }}>
                  ORDERED LEARNING SEQUENCE · &ldquo;START WITH THIS&rdquo;
                </div>

                {currentStageResources.length === 0 ? (
                  <EmptyState
                    icon="🔍"
                    title="No resources found"
                    description="No resources match the selected filter in this stage. Try selecting 'All Resources'."
                  />
                ) : (
                  currentStageResources.map((res) => (
                    <ResourceCard
                      key={res.id}
                      resource={res}
                      isExpanded={openTutorialId === res.id}
                      onToggleExpand={() => toggleTutorialSteps(res.id)}
                      onToggleResourceComplete={() => handleToggleResource(res.id)}
                      onToggleExerciseComplete={() => handleToggleExercise(res.id)}
                      isCompletingResource={!!completingResource[res.id]}
                      isCompletingExercise={!!completingExercise[res.id]}
                      onAskMentor={() => askMentorQuestion(res)}
                      onTestMe={() => triggerTestMe(res, selectedStageKey)}
                      onReviewWork={() => triggerReviewWork(res)}
                      onAnotherExplanation={() => triggerAlternativeExplanation(res)}
                    />
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 2: FULL 4-STAGE PATHWAY OVERVIEW */}
          {activeTab === "all-stages" && (
            <div className="learn-modules">
              {stageDefinitions.map((def, stageIdx) => {
                const stageModule = roadmap.modules.find((m) => m.level?.toLowerCase() === def.key.toLowerCase()) || roadmap.modules[stageIdx];
                const stageRes = allResources.filter((r) => r.level.toLowerCase() === def.key.toLowerCase());
                const mastery = roadmap.stageMastery?.[def.key] ?? 0;
                const isSelected = selectedStageKey.toLowerCase() === def.key.toLowerCase();

                return (
                  <div className="learn-module-row" key={def.key}>
                    <div className={`learn-module-num ${mastery >= 80 ? "completed" : isSelected ? "active" : ""}`}>
                      <span>{mastery >= 80 ? "✓" : `0${stageIdx + 1}`}</span>
                    </div>

                    <div className={`learn-module-card ${isSelected ? "active" : ""}`}>
                      <div className="learn-module-top">
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div className="learn-module-title">{def.label}: {def.subtitle}</div>
                            <span className="learn-resource-badge learn-resource-badge--tutorial">
                              {def.key}
                            </span>
                          </div>
                          <div style={{ color: "var(--text-muted)", fontSize: 12.5, marginTop: 4 }}>
                            {stageModule?.stageGoal || def.goal}
                          </div>
                        </div>
                        {isSelected && <span className="learn-module-tag learn-module-tag--next">SELECTED STAGE</span>}
                      </div>

                      <div className="learn-module-counts">
                        <span className="learn-module-count">{stageModule?.lessons.length ?? 4} core curriculum lessons</span>
                        <span className="learn-module-count">🎬 {stageRes.length} curated resources</span>
                        <span className="learn-module-count">📈 {mastery}% mastery</span>
                      </div>

                      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginTop: 8 }}>
                        <button
                          className={isSelected ? "btn btn--primary btn--sm" : "btn btn--sm"}
                          onClick={() => {
                            handleSelectStage(def.key);
                            setActiveTab("guided");
                          }}
                        >
                          {isSelected ? "Open Guided Sequence →" : `Select ${def.key} Stage →`}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 3: COMPLETE CURATED RESOURCE CATALOG */}
          {activeTab === "catalog" && (
            <div>
              <div style={{ marginBottom: 14 }}>
                <h2 style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 700, margin: 0 }}>
                  Complete Curated Library ({filterList(allResources).length} Items)
                </h2>
                <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "4px 0 0 0" }}>
                  Curated across YouTube, official documentation, and expert technical blogs. 80% practical tutorials, 20% industry updates.
                </p>
              </div>

              {filterList(allResources).length === 0 ? (
                <EmptyState
                  icon="🔍"
                  title="No resources found"
                  description="No resources match your filter. Select 'All Resources' to view the entire library."
                />
              ) : (
                filterList(allResources).map((res) => (
                  <ResourceCard
                    key={res.id}
                    resource={res}
                    isExpanded={openTutorialId === res.id}
                    onToggleExpand={() => toggleTutorialSteps(res.id)}
                    onToggleResourceComplete={() => handleToggleResource(res.id)}
                    onToggleExerciseComplete={() => handleToggleExercise(res.id)}
                    isCompletingResource={!!completingResource[res.id]}
                    isCompletingExercise={!!completingExercise[res.id]}
                    onAskMentor={() => askMentorQuestion(res)}
                    onTestMe={() => triggerTestMe(res, res.level)}
                    onReviewWork={() => triggerReviewWork(res)}
                    onAnotherExplanation={() => triggerAlternativeExplanation(res)}
                  />
                ))
              )}
            </div>
          )}

          <div style={{ marginTop: 32, textAlign: "center", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 13, color: "var(--text-dim)" }}>
            Beginner → Intermediate → Advanced → Real-World Application
          </div>
        </>
      )}
    </div>
  );
}

// ── Resource Card Component with Guided Sequence & Mentor Actions ─────────────

interface ResourceCardProps {
  resource: LearningResource;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onToggleResourceComplete: () => void;
  onToggleExerciseComplete: () => void;
  isCompletingResource: boolean;
  isCompletingExercise: boolean;
  onAskMentor: () => void;
  onTestMe: () => void;
  onReviewWork: () => void;
  onAnotherExplanation: () => void;
}

function ResourceCard({
  resource,
  isExpanded,
  onToggleExpand,
  onToggleResourceComplete,
  onToggleExerciseComplete,
  isCompletingResource,
  isCompletingExercise,
  onAskMentor,
  onTestMe,
  onReviewWork,
  onAnotherExplanation,
}: ResourceCardProps) {
  const isTutorial = resource.type === "TutorialVideo" || resource.isHowToTutorial;
  const isDevelopment = resource.type === "NewDevelopmentVideo";
  const isBlog = resource.type === "BlogPost";

  const sequenceRole = resource.sequenceRole || (resource.order === 1 ? "Start here" : "Next");
  const isStart = sequenceRole.toLowerCase().includes("start");
  const isDev = resource.isNewDevelopment || isDevelopment || isBlog;

  return (
    <div className={`learn-resource-card ${resource.isCompleted ? "completed" : ""}`} style={{ marginBottom: 18 }}>
      {/* Sequence Header & Estimated Time */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
          {/* Order marker / Sequence Role */}
          <span
            className={`learn-seq-badge ${
              isStart
                ? "learn-seq-badge--start"
                : isDev
                ? "learn-seq-badge--dev"
                : resource.sequenceRole?.toLowerCase().includes("practice")
                ? "learn-seq-badge--practice"
                : resource.sequenceRole?.toLowerCase().includes("capstone")
                ? "learn-seq-badge--capstone"
                : "learn-seq-badge--next"
            }`}
          >
            {resource.order ? `${resource.order}. ` : ""}
            {sequenceRole}
          </span>

          <span className={`learn-resource-badge ${isTutorial ? "learn-resource-badge--tutorial" : isDevelopment ? "learn-resource-badge--development" : "learn-resource-badge--blog"}`}>
            {resource.level}
          </span>

          <span className="learn-resource-meta">
            {resource.channelOrAuthor ? `${resource.channelOrAuthor} · ` : ""}{resource.source}
          </span>
        </div>

        {(resource.estimatedTime || resource.duration) && (
          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)" }}>
            ⏱️ Estimated: {resource.estimatedTime || resource.duration}
          </span>
        )}
      </div>

      {/* Resource Title */}
      <h3 style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 700, lineHeight: 1.4, margin: "0 0 10px 0" }}>
        {resource.title}
      </h3>

      {/* 🎯 "Why am I learning this?" Connection to Goal */}
      {resource.whyAmILearningThis && (
        <div className="learn-why-box">
          <div className="learn-why-box__title">
            <span>🎯</span> WHY AM I LEARNING THIS?
          </div>
          <div className="learn-why-box__text">
            {resource.whyAmILearningThis}
          </div>
        </div>
      )}

      {/* Embedded Video or External Article Reader */}
      {(isTutorial || isDevelopment) && resource.url && (
        <div style={{ margin: "14px 0" }}>
          <VideoEmbed url={resource.url} title={resource.title} />
        </div>
      )}

      {isBlog && (
        <div style={{ margin: "12px 0" }}>
          <a
            href={resource.url}
            target="_blank"
            rel="noreferrer"
            className="btn btn--sm"
            style={{ display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none" }}
          >
            📖 Read Full Technical Analysis on {resource.source} ↗
          </a>
        </div>
      )}

      {/* FOR TUTORIAL VIDEOS (80%): What You Will Build / Learn */}
      {isTutorial && resource.whatYouWillBuild && (
        <div className="learn-what-you-will-build" style={{ marginBottom: 12 }}>
          <strong style={{ color: "var(--cyan-deep)" }}>WHAT YOU WILL BUILD / LEARN:</strong> {resource.whatYouWillBuild}
        </div>
      )}

      {/* FOR TUTORIAL VIDEOS (80%): Step-by-Step Breakdown */}
      {isTutorial && resource.stepByStepBreakdown && resource.stepByStepBreakdown.length > 0 && (
        <div style={{ margin: "14px 0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--cyan-deep)" }}>
              STEP-BY-STEP TUTORIAL BREAKDOWN ({resource.stepByStepBreakdown.length} STEPS)
            </span>
            <button
              type="button"
              className="btn btn--text btn--sm"
              style={{ fontSize: 11.5, padding: "2px 6px", color: "var(--cyan-deep)" }}
              onClick={onToggleExpand}
            >
              {isExpanded ? "Collapse steps ▴" : "View step-by-step instructions ▾"}
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

      {/* Detailed Intelligence Breakdown Box — suppressed entirely when there is nothing to say,
          rather than drawing an empty bordered box with labels and no content. */}
      {(resource.whatHappened || resource.whyItMatters || resource.nextMove) && (
      <div className="learn-intelligence-box">
        {isTutorial ? (
          <>
            <IntelBlock label="WHY THIS MATTERS FOR YOUR SKILL" value={resource.whyItMatters} />
            <IntelBlock label="NEXT MOVE & IMPLEMENTATION" value={resource.nextMove} preserveLineBreaks />
          </>
        ) : (
          <>
            <IntelBlock label="WHAT HAPPENED" value={resource.whatHappened} />
            <IntelBlock label="WHY IT MATTERS" value={resource.whyItMatters} />
            <IntelBlock label="NEXT MOVE" value={resource.nextMove} preserveLineBreaks />
          </>
        )}
      </div>
      )}

      {/* PRACTISE TASK (Dedicated Exercise Box) */}
      {resource.practiceExercise && (
        <div className="learn-practice-box">
          <div className="learn-practice-box__head">
            <div className="learn-practice-box__title">
              <span>🛠️</span> {resource.practiceExerciseTitle || "PRACTICAL EXERCISE"}
            </div>
            <button
              className={`btn btn--sm ${resource.isExerciseCompleted ? "btn--text" : "btn--secondary"}`}
              style={{ fontSize: 11.5, padding: "3px 10px" }}
              onClick={onToggleExerciseComplete}
              disabled={isCompletingExercise}
            >
              {isCompletingExercise
                ? "Saving…"
                : resource.isExerciseCompleted
                ? "✓ Exercise Completed"
                : "Mark Exercise Done"}
            </button>
          </div>
          <div className="learn-practice-box__desc">
            {resource.practiceExercise}
          </div>
        </div>
      )}

      {/* AI LEARNING MENTOR WORKFLOW: Watch/Read → Understand → Practise → Test → Apply */}
      <div className="learn-mentor-bar">
        <span className="learn-mentor-bar__label">AI MENTOR:</span>
        <button className="learn-mentor-btn" onClick={onAskMentor} title="Ask mentor to explain this topic simply">
          💡 Ask AI Mentor
        </button>
        <button className="learn-mentor-btn learn-mentor-btn--primary" onClick={onTestMe} title="Take an interactive test on this topic">
          📝 Test Me (Quiz)
        </button>
        <button className="learn-mentor-btn" onClick={onReviewWork} title="Submit your code or practice exercise for review">
          🛠️ Review My Work
        </button>
        <button className="learn-mentor-btn" onClick={onAnotherExplanation} title="Get an alternative explanation and analogy">
          🔄 Another Explanation
        </button>
      </div>

      {/* Footer completion toggle */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12, flexWrap: "wrap", gap: 8 }}>
        <button
          className={`btn btn--sm ${resource.isCompleted ? "btn--text" : "btn--primary"}`}
          onClick={onToggleResourceComplete}
          disabled={isCompletingResource}
        >
          {isCompletingResource
            ? "Saving…"
            : resource.isCompleted
            ? "✓ Resource Completed & Mastered"
            : isTutorial
            ? "Mark tutorial completed"
            : "Mark as read"}
        </button>
        {resource.isCompleted && (
          <span style={{ fontSize: 12, color: "#059669", fontWeight: 700 }}>
            Saved to your stage mastery progress ✓
          </span>
        )}
      </div>
    </div>
  );
}
