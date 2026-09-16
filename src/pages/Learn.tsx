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

  const estimatedWeeks = (roadmap?.modules.filter((m) => !m.isCompleted).length ?? 0) * 3;

  return (
    <div className="r-page">
      {roadmapQuery.isError && !notFound ? (
        <ErrorState title="Failed to load roadmap" description={errorMessage} onRetry={() => roadmapQuery.refetch()} />
      ) : roadmapQuery.isLoading ? (
        <>
          <div className="r-page-head">
            <div className="r-kicker">PERSONAL GROWTH ROADMAP</div>
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
                <div className="r-kicker">PERSONAL GROWTH ROADMAP</div>
                <h1 className="r-page-title">{roadmap.goal}</h1>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn btn--sm" onClick={() => navigate("/learn/hub")}>
                  Learn Hub
                </button>
                <button className="btn btn--sm" onClick={() => navigate("/projects")}>
                  Project Studio
                </button>
                <button className="btn btn--sm" onClick={() => navigate("/progress")}>
                  Progress
                </button>
              </div>
            </div>
          </div>

          <p className="learn-roadmap-desc">
            A structured journey, not a content dump. {roadmap.modules.filter((m) => !m.isCompleted).length} modules left of{" "}
            {roadmap.modules.length} · about {estimatedWeeks} weeks.
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
            {roadmap.modules.map((module, i) => {
              const isFirst = i === 0;
              const isActive = !module.isCompleted && !module.isLocked && (isFirst || roadmap.modules[i - 1].isCompleted);
              const numClass = module.isCompleted ? "completed" : isActive ? "active" : "";
              const cardClass = isActive ? "active" : "";

              return (
                <div className="learn-module-row" key={module.id}>
                  <div className={`learn-module-num ${numClass}`}>
                    <span>{module.isCompleted ? "✓" : i + 1}</span>
                  </div>
                  <div className={`learn-module-card ${cardClass}`}>
                    <div className="learn-module-top">
                      <div className="learn-module-title">{module.title}</div>
                      {isActive && <span className="learn-module-tag learn-module-tag--next">UP NEXT</span>}
                    </div>

                    <div className="learn-module-counts">
                      <span className="learn-module-count">{module.lessons.length} lessons</span>
                      <span className="learn-module-count">6 articles</span>
                      <span className="learn-module-count">2 podcasts</span>
                      <span className="learn-module-count">4 videos</span>
                      <span className="learn-module-count">3 papers</span>
                      <span className="learn-module-count">1 project</span>
                    </div>

                    {isActive ? (
                      <button className="btn btn--primary btn--sm">Start module</button>
                    ) : !module.isLocked ? (
                      <button className="btn btn--sm">Preview</button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
