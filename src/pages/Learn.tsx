import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { LoadingSkeleton } from "../components/LoadingSkeleton";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { ApiError, getActiveRoadmap } from "../lib/api";

export function Learn() {
  const navigate = useNavigate();
  const roadmapQuery = useQuery({ queryKey: ["roadmap", "active"], queryFn: getActiveRoadmap, retry: false });
  const roadmap = roadmapQuery.data;
  const errorMessage = roadmapQuery.error instanceof ApiError ? roadmapQuery.error.message : "Failed to load roadmap.";
  const notFound = roadmapQuery.error instanceof ApiError && roadmapQuery.error.status === 404;

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
              <div style={{ display: "flex", gap: 8 }}>
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
               return <div className="learn-module-row" key={number}>
                 <div className={`learn-module-num ${stageModules.every((module) => module.isCompleted) ? "completed" : isNext ? "active" : ""}`}><span>{stageModules.every((module) => module.isCompleted) ? "✓" : number}</span></div>
                 <div className={`learn-module-card ${isNext ? "active" : ""}`}>
                   <div className="learn-module-top"><div><div className="learn-module-title">{title}</div><div style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 4 }}>{description}</div></div>{isNext && <span className="learn-module-tag learn-module-tag--next">UP NEXT</span>}</div>
                   <div className="learn-module-counts"><span className="learn-module-count">{stageModules.reduce((sum, module) => sum + module.lessons.length, 0)} lessons</span><span className="learn-module-count">6 articles</span><span className="learn-module-count">2 podcasts</span><span className="learn-module-count">4 videos</span><span className="learn-module-count">3 papers</span><span className="learn-module-count">1 project</span></div>
                   <div style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 10 }}>{stageModules.map((module) => module.title).join(" · ")}</div>
                   {isNext ? <button className="btn btn--primary btn--sm">Start stage</button> : <button className="btn btn--sm">Preview</button>}
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
