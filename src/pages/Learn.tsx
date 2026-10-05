import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { LoadingSkeleton } from "../components/LoadingSkeleton";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { ApiError, completeLesson, generateLearningPathway, getActiveRoadmap } from "../lib/api";
import type { GrowthRoadmap } from "../lib/types";

export function Learn() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [generating, setGenerating] = useState(false);
  const [expandedStage, setExpandedStage] = useState<number | null>(null);
  const [openLessonId, setOpenLessonId] = useState<string | null>(null);
  const [completing, setCompleting] = useState<Record<string, boolean>>({});

  // Replaces the active roadmap with a pathway built from the profile, so the current one stays
  // on screen until the new one arrives (and survives a failure).
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
    } catch {
      // leave the lesson as-is; the user can retry
    } finally {
      setCompleting((prev) => {
        const next = { ...prev };
        delete next[lessonId];
        return next;
      });
    }
  };

  const estimatedWeeks = 12;
  const stages = [
    ["01", "Know the Basics", "Build the foundation you need to get started."],
    ["02", "Build Your Skills", "Turn knowledge into practical skills you can use."],
    ["03", "Build Your Depth", "Go deeper. Understand how the ideas, tools and problems connect."],
    ["04", "Put It to Work", "Take what you have learned and use it on real problems."],
  ] as const;

  return (
    <div className="r-page">
      {roadmapQuery.isError && !notFound ? (
        <ErrorState title="Failed to load roadmap" description={errorMessage} onRetry={() => roadmapQuery.refetch()} />
      ) : roadmapQuery.isLoading ? (
        <>
          <div className="r-page-head">
              <div className="r-kicker">TODAY'S FOCUS</div>
          </div>
          <LoadingSkeleton variant="card" count={3} />
        </>
      ) : !roadmap ? (
        <EmptyState icon="🗺️" title="No roadmap yet" description="Complete onboarding to get your personal growth roadmap.">
          <button className="btn btn--primary" onClick={() => navigate("/onboarding")}>
            Set up profile
          </button>
        </EmptyState>
      ) : (
        <>
          <div className="r-page-head">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
              <div>
                <div className="r-kicker">TODAY'S FOCUS</div>
                <h1 className="r-page-title">{roadmap.goal}</h1>
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

          <p className="learn-roadmap-desc">
             {roadmap.interest ? `Built around ${roadmap.interest}. ` : "A structured journey, not a content dump. "}{roadmap.modules.filter((m) => !m.isCompleted).length} modules left of{" "}
             {roadmap.modules.length} · 4 stages · {estimatedWeeks} weeks.
          </p>

          {roadmap.progressPercent > 0 && (
            <div style={{ marginBottom: "1.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, color: "var(--text-muted)", marginBottom: 4 }}>
                <span>Roadmap progress</span>
                <span>{roadmap.progressPercent}%</span>
              </div>
              <div style={{ height: 5, background: "var(--bg-hover)", borderRadius: 99, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${roadmap.progressPercent}%`, background: "var(--cyan)", borderRadius: 99, transition: "width .4s var(--ease)" }} />
              </div>
            </div>
          )}

           <div className="learn-modules">
             {stages.map(([number, title, description], stageIndex) => {
               const start = Math.floor((roadmap.modules.length * stageIndex) / stages.length);
               const end = Math.floor((roadmap.modules.length * (stageIndex + 1)) / stages.length);
               const stageModules = roadmap.modules.slice(start, Math.max(end, start + 1));
               const isNext = stageModules.some((module) => !module.isCompleted && !module.isLocked);
               const stageComplete = stageModules.length > 0 && stageModules.every((module) => module.isCompleted);
               const isOpen = expandedStage === stageIndex;
               return <div className="learn-module-row" key={number}>
                 <div className={`learn-module-num ${stageComplete ? "completed" : isNext ? "active" : ""}`}><span>{stageComplete ? "✓" : number}</span></div>
                 <div className={`learn-module-card ${isNext ? "active" : ""}`}>
                   <div className="learn-module-top"><div><div className="learn-module-title">{title}</div><div style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 4 }}>{description}</div></div>{isNext && <span className="learn-module-tag learn-module-tag--next">UP NEXT</span>}</div>
                   <div className="learn-module-counts"><span className="learn-module-count">{stageModules.reduce((sum, module) => sum + module.lessons.length, 0)} lessons</span><span className="learn-module-count">{stageModules.length} modules</span></div>
                   <div style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 10 }}>{stageModules.map((module) => module.title).join(" · ")}</div>
                   <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                     <button
                       className={isNext ? "btn btn--primary btn--sm" : "btn btn--sm"}
                       onClick={() => (isNext ? startStage(stageIndex) : toggleStage(stageIndex))}
                       aria-expanded={isOpen}
                     >
                       {isNext ? (isOpen ? "Hide stage" : "Start stage") : isOpen ? "Hide preview" : "Preview"}
                     </button>
                     {isOpen && (
                       <button className="btn btn--text btn--sm" onClick={() => toggleStage(stageIndex)}>
                         Close
                       </button>
                     )}
                   </div>

                   {isOpen && (
                     <div className="learn-stage-preview">
                       {stageModules.length === 0 ? (
                         <div className="learn-stage-empty">No modules in this stage yet.</div>
                       ) : (
                         stageModules.map((module) => (
                           <div className="learn-stage-module" key={module.id}>
                             <div className="learn-stage-module__head">
                               <span className="learn-stage-module__title">{module.title}</span>
                               {module.isCompleted ? (
                                 <span className="learn-stage-module__done">✓ Complete</span>
                               ) : module.isLocked ? (
                                 <span className="learn-stage-module__lock">Locked</span>
                               ) : null}
                             </div>
                             {module.description && <div className="learn-stage-module__desc">{module.description}</div>}
                             {module.lessons.length === 0 ? (
                               <div className="learn-stage-empty">No lessons yet.</div>
                             ) : (
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
                                           {lesson.body ? <p>{lesson.body}</p> : <p className="learn-lesson__muted">No notes for this lesson yet.</p>}
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
                             )}
                           </div>
                         ))
                       )}
                     </div>
                   )}
                 </div>
               </div>;
             })}
           </div>
           <div style={{ marginTop: 24, textAlign: "center", fontFamily: "var(--font-display)", fontWeight: 700, color: "var(--text-dim)" }}>Know → Build → Deepen → Apply</div>
        </>
      )}
    </div>
  );
}
