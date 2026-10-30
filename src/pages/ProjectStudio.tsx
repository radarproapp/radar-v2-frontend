import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LoadingSkeleton } from "../components/LoadingSkeleton";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { ApiError, createProject, generateProjectPlan, getSuggestedProjects, getUserProjects, sendAskRadarChat, setProjectVisibility, startSuggestedProject } from "../lib/api";
import { ProjectSubmissionPanel } from "../components/ProjectSubmission";
import type { StudioProject } from "../lib/types";

export function ProjectStudio() {
  const queryClient = useQueryClient();
  const suggestedQuery = useQuery({ queryKey: ["projects", "suggested"], queryFn: getSuggestedProjects });
  const projectsQuery = useQuery({ queryKey: ["projects", "mine"], queryFn: getUserProjects });
  const [tipsByProject, setTipsByProject] = useState<Record<string, string>>({});
  const [tipsLoadingId, setTipsLoadingId] = useState<string | null>(null);
  const [planLoadingId, setPlanLoadingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Starting your own project, rather than only the six templates. The endpoint has always
  // existed; nothing in the UI reached it.
  const [showNewProject, setShowNewProject] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const submitNewProject = async () => {
    if (newTitle.trim().length < 2 || newDescription.trim().length < 2 || creating) return;
    setCreating(true);
    setCreateError(null);
    try {
      await createProject(newTitle.trim(), newDescription.trim(), "Custom");
      setNewTitle("");
      setNewDescription("");
      setShowNewProject(false);
      queryClient.invalidateQueries({ queryKey: ["projects", "mine"] });
    } catch (err) {
      setCreateError(err instanceof ApiError ? err.message : "Could not create that project.");
    }
    setCreating(false);
  };

  const loading = suggestedQuery.isLoading || projectsQuery.isLoading;
  const error = suggestedQuery.error ?? projectsQuery.error;
  const errorMessage = error instanceof ApiError ? error.message : "Could not load projects.";
  const suggested = suggestedQuery.data ?? [];
  const userProjects = projectsQuery.data ?? [];

  const handleStart = async (projectId: string) => {
    try {
      const project = await startSuggestedProject(projectId);
      queryClient.setQueryData<StudioProject[]>(["projects", "mine"], (old) => [...(old ?? []), project]);
    } catch {
      // silent, matches the original Blazor page's behaviour
    }
  };

  const askForTips = async (project: StudioProject) => {
    setTipsLoadingId(project.id);
    try {
      const response = await sendAskRadarChat(
        // How to do the work, which is what this was asked for.
        //
        // It asked how to "demonstrate and showcase this project to recruiters or a portfolio
        // audience" - advice about presenting a thing that has not been built yet, offered to
        // somebody sitting in front of an empty project. The standards it will be judged against
        // are named, so the guidance can point at them rather than at a job interview.
        `I am working on a project called "${project.title}". The goal: ${project.description}

` +
          "Tell me how to actually do it. Where to start, what order to work in, what the hard " +
          "parts usually are, and how I will know each part is done. Be specific to this project " +
          "rather than general advice, and keep it to things I can act on today.",
        [],
      );
      setTipsByProject((prev) => ({ ...prev, [project.id]: response.content }));
    } finally {
      setTipsLoadingId(null);
    }
  };

  const handleGeneratePlan = async (project: StudioProject) => {
    setPlanLoadingId(project.id);
    try {
      const updated = await generateProjectPlan(project.id);
      queryClient.setQueryData<StudioProject[]>(["projects", "mine"], (old) =>
        old?.map((p) => (p.id === project.id ? updated : p)),
      );
    } catch {
      // silent, matches the original Blazor page's behaviour
    } finally {
      setPlanLoadingId(null);
    }
  };

  const toggleVisibility = async (project: StudioProject) => {
    const nextPublic = !project.isPublic;
    queryClient.setQueryData<StudioProject[]>(["projects", "mine"], (old) =>
      old?.map((p) => (p.id === project.id ? { ...p, isPublic: nextPublic } : p)),
    );
    try {
      await setProjectVisibility(project.id, nextPublic);
    } catch {
      queryClient.setQueryData<StudioProject[]>(["projects", "mine"], (old) =>
        old?.map((p) => (p.id === project.id ? { ...p, isPublic: !nextPublic } : p)),
      );
    }
  };

  const copyShareLink = (projectId: string) => {
    const url = `${window.location.origin}/showcase/${projectId}`;
    navigator.clipboard?.writeText(url).then(() => {
      setCopiedId(projectId);
      setTimeout(() => setCopiedId((id) => (id === projectId ? null : id)), 2000);
    });
  };

  return (
    <div className="r-page" style={{ maxWidth: 780 }}>
      <div className="r-page-head">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <h1 className="r-page-title">Project Studio</h1>
          <button className="btn btn--primary" onClick={() => document.getElementById("project-templates")?.scrollIntoView({ behavior: "smooth" })}>Start New Project</button>
        </div>
        <p className="r-page-sub">Practical projects that turn what you've learned into something you can show.</p>
      </div>

      {error ? (
        <ErrorState
          title="Failed to load projects"
          description={errorMessage}
          onRetry={() => {
            suggestedQuery.refetch();
            projectsQuery.refetch();
          }}
        />
      ) : loading ? (
        <LoadingSkeleton variant="card" count={2} />
      ) : (
        <>
          <div style={{ marginBottom: 18 }}>
            {!showNewProject ? (
              <button className="btn btn--primary btn--sm" onClick={() => setShowNewProject(true)}>
                + Start your own project
              </button>
            ) : (
              <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 14, padding: 16 }}>
                <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14, marginBottom: 10 }}>
                  Start your own project
                </div>
                <input
                  className="r-input"
                  placeholder="What are you building?"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  style={{ marginBottom: 8 }}
                />
                <textarea
                  className="r-input"
                  placeholder="What will it show when it is done?"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  rows={3}
                  style={{ marginBottom: 10, resize: "vertical" }}
                />
                {createError && (
                  <div style={{ fontSize: 12.5, color: "var(--red)", marginBottom: 8 }}>{createError}</div>
                )}
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    className="btn btn--primary btn--sm"
                    onClick={submitNewProject}
                    disabled={creating || newTitle.trim().length < 2 || newDescription.trim().length < 2}
                  >
                    {creating ? "Creating…" : "Create project"}
                  </button>
                  <button className="btn btn--ghost btn--sm" onClick={() => setShowNewProject(false)}>
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {userProjects.length > 0 ? (
            <div style={{ marginBottom: 24 }}>
           <div id="project-templates" style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".07em", textTransform: "uppercase", color: "var(--text-faint)", marginBottom: 10 }}>
                YOUR PROJECTS
              </div>
              {userProjects.map((project) => (
                <div key={project.id} style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 14, padding: "16px 18px", marginBottom: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                    <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14 }}>{project.title}</div>
                    {project.isCompleted ? (
                      <span style={{ fontSize: 11, fontWeight: 700, color: "var(--lime)", background: "rgba(46,168,96,0.1)", borderRadius: 99, padding: "4px 10px" }}>
                        Completed
                      </span>
                    ) : (
                      <span style={{ fontSize: 11, fontWeight: 700, color: "var(--cyan)", background: "var(--cyan-light)", borderRadius: 99, padding: "4px 10px" }}>
                        In progress
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 12.5, color: "var(--text-dim)", marginTop: 4 }}>{project.description}</div>

                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
                    {!project.plan && (
                      <button className="btn btn--sm" onClick={() => handleGeneratePlan(project)} disabled={planLoadingId === project.id}>
                        {planLoadingId === project.id ? "Building your plan…" : "Generate plan"}
                      </button>
                    )}
                    <button className="btn btn--sm" onClick={() => askForTips(project)} disabled={tipsLoadingId === project.id}>
                      {tipsLoadingId === project.id ? "Asking Radar…" : "Ask Radar how to do it"}
                    </button>
                    <button className="btn btn--sm" onClick={() => toggleVisibility(project)}>
                      {project.isPublic ? "Public — make private" : "Make public"}
                    </button>
                    {project.isPublic && (
                      <button className="btn btn--sm" onClick={() => copyShareLink(project.id)}>
                        {copiedId === project.id ? "Link copied " : "Copy share link"}
                      </button>
                    )}
                  </div>

                  {project.plan && (
                    <div style={{ marginTop: 12, borderTop: "1px solid var(--border)", paddingTop: 12 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".07em", textTransform: "uppercase", color: "var(--text-faint)", marginBottom: 6 }}>
                        YOUR PLAN
                      </div>
                      {project.plan.summary && (
                        <div style={{ fontSize: 13, color: "var(--text-dim)", lineHeight: 1.6, marginBottom: 10 }}>{project.plan.summary}</div>
                      )}

                      {project.plan.milestones.map((milestone, i) => (
                        <div key={`${project.id}-${i}`} style={{ display: "flex", gap: 10, marginBottom: 10 }}>
                          <div
                            style={{
                              flex: "0 0 22px",
                              height: 22,
                              borderRadius: 99,
                              background: "var(--cyan-light)",
                              color: "var(--cyan-deep)",
                              fontSize: 11.5,
                              fontWeight: 700,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            {i + 1}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
                              <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 13 }}>{milestone.title}</span>
                              {milestone.estimatedTime && (
                                <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600 }}>{milestone.estimatedTime}</span>
                              )}
                            </div>
                            {milestone.outcome && (
                              <div style={{ fontSize: 12.5, color: "var(--text-dim)", marginTop: 2 }}>{milestone.outcome}</div>
                            )}
                            {milestone.steps.length > 0 && (
                              <ul style={{ margin: "6px 0 0", paddingLeft: 16, fontSize: 12.5, color: "var(--text-dim)", lineHeight: 1.6 }}>
                                {milestone.steps.map((step) => (
                                  <li key={step}>{step}</li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </div>
                      ))}

                      {project.plan.deliverables.length > 0 && (
                        <div style={{ marginTop: 4 }}>
                          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".07em", textTransform: "uppercase", color: "var(--text-faint)", marginBottom: 5 }}>
                            YOU'LL END UP WITH
                          </div>
                          <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                            {project.plan.deliverables.map((deliverable) => (
                              <span key={deliverable} style={{ fontSize: 10.5, fontWeight: 600, background: "#f0f2f4", borderRadius: 99, padding: "3px 8px" }}>
                                {deliverable}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {project.plan.successCriteria && (
                        <div style={{ fontSize: 12.5, color: "var(--text-muted)", marginTop: 10, fontStyle: "italic" }}>
                          Done when: {project.plan.successCriteria}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Handing it in, and the mark. The whole assessment existed on the server
                      and nowhere a learner could reach it, so a project could be started and
                      never submitted. */}
                  <ProjectSubmissionPanel project={project} />

                  {tipsByProject[project.id] && (
                    <div style={{ marginTop: 12, background: "var(--cyan-light)", borderRadius: 12, padding: "13px 15px" }}>
                      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".07em", textTransform: "uppercase", color: "var(--cyan-deep)", marginBottom: 6 }}>
                        HOW TO WORK ON THIS
                      </div>
                      <div style={{ fontSize: 13, color: "#0d3d40", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{tipsByProject[project.id]}</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon="launch" title="No projects yet" description="Start a project from a template below to practice what you've learned." compact />
          )}

          {/* What to build next, taken from this learner's own path.
              This was a grid of six templates served to everyone - Product Case Study, Marketing
              Campaign, Research Proposal, Literature Review, Business Model Canvas, Portfolio
              Project - so somebody studying mathematics was offered a Business Model Canvas. A
              fixed list shown to everybody is a catalogue, not a suggestion. */}
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".07em", textTransform: "uppercase", color: "var(--text-faint)", marginBottom: 10 }}>
            SUGGESTED FOR YOUR PATH
          </div>

          {suggested.length === 0 ? (
            <EmptyState
              icon="launch"
              title="Nothing suggested yet"
              description="Radar suggests projects from the stage you are on. Start a learning path and they will appear here."
              compact
            />
          ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 10 }}>
            {suggested.map((project) => (
              <div key={project.id} style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 14, padding: "18px 20px", display: "flex", flexDirection: "column" }}>
                {project.estimatedTime ? (
                  <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, marginBottom: 8 }}>
                    {project.estimatedTime}
                  </div>
                ) : null}

                <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14.5, lineHeight: 1.4, marginBottom: 6 }}>{project.title}</div>

                {/* What they will have at the end, rather than a category label. */}
                <div style={{ fontSize: 12.5, color: "var(--text-dim)", lineHeight: 1.6, marginBottom: 10, flex: 1 }}>{project.deliverable}</div>

                {/* Why it is worth the hours. The old cards carried tags instead, which say what
                    a project is filed under and nothing about why to build it. */}
                {project.whyItProvesCapability ? (
                  <div style={{ fontSize: 12, color: "var(--action)", lineHeight: 1.55, marginBottom: 12 }}>
                    {project.whyItProvesCapability}
                  </div>
                ) : null}

                <button className="btn btn--primary btn--sm" onClick={() => handleStart(project.id)}>
                  Start this project
                </button>
              </div>
            ))}
          </div>
          )}
        </>
      )}
    </div>
  );
}
