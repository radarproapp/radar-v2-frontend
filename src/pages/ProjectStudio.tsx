import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LoadingSkeleton } from "../components/LoadingSkeleton";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { ApiError, getProjectTemplates, getUserProjects, sendAskRadarChat, setProjectVisibility, startProject } from "../lib/api";
import type { StudioProject } from "../lib/types";

export function ProjectStudio() {
  const queryClient = useQueryClient();
  const templatesQuery = useQuery({ queryKey: ["projects", "templates"], queryFn: getProjectTemplates });
  const projectsQuery = useQuery({ queryKey: ["projects", "mine"], queryFn: getUserProjects });
  const [tipsByProject, setTipsByProject] = useState<Record<string, string>>({});
  const [tipsLoadingId, setTipsLoadingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const loading = templatesQuery.isLoading || projectsQuery.isLoading;
  const error = templatesQuery.error ?? projectsQuery.error;
  const errorMessage = error instanceof ApiError ? error.message : "Could not load projects.";
  const templates = templatesQuery.data ?? [];
  const userProjects = projectsQuery.data ?? [];

  const handleStart = async (templateId: string) => {
    try {
      const project = await startProject(templateId);
      queryClient.setQueryData<StudioProject[]>(["projects", "mine"], (old) => [...(old ?? []), project]);
    } catch {
      // silent, matches the original Blazor page's behaviour
    }
  };

  const askForTips = async (project: StudioProject) => {
    setTipsLoadingId(project.id);
    try {
      const response = await sendAskRadarChat(
        `Give me specific, practical tips on how to best demonstrate and showcase this project to recruiters or a portfolio audience: "${project.title}" — ${project.description}`,
        [],
      );
      setTipsByProject((prev) => ({ ...prev, [project.id]: response.content }));
    } finally {
      setTipsLoadingId(null);
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
        <h1 className="r-page-title">Project Studio</h1>
        <p className="r-page-sub">Practical projects that turn what you've learned into something you can show.</p>
      </div>

      {error ? (
        <ErrorState
          title="Failed to load projects"
          description={errorMessage}
          onRetry={() => {
            templatesQuery.refetch();
            projectsQuery.refetch();
          }}
        />
      ) : loading ? (
        <LoadingSkeleton variant="card" count={2} />
      ) : (
        <>
          {userProjects.length > 0 ? (
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".07em", textTransform: "uppercase", color: "var(--text-faint)", marginBottom: 10 }}>
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
                    <button className="btn btn--sm" onClick={() => askForTips(project)} disabled={tipsLoadingId === project.id}>
                      {tipsLoadingId === project.id ? "Asking Radar…" : "Ask Radar for tips"}
                    </button>
                    <button className="btn btn--sm" onClick={() => toggleVisibility(project)}>
                      {project.isPublic ? "Public ✓ — make private" : "Make public"}
                    </button>
                    {project.isPublic && (
                      <button className="btn btn--sm" onClick={() => copyShareLink(project.id)}>
                        {copiedId === project.id ? "Link copied ✓" : "Copy share link"}
                      </button>
                    )}
                  </div>

                  {tipsByProject[project.id] && (
                    <div style={{ marginTop: 12, background: "var(--cyan-light)", borderRadius: 12, padding: "13px 15px" }}>
                      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".07em", textTransform: "uppercase", color: "var(--cyan-deep)", marginBottom: 6 }}>
                        HOW TO SHOWCASE THIS
                      </div>
                      <div style={{ fontSize: 13, color: "#0d3d40", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{tipsByProject[project.id]}</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon="🚀" title="No projects yet" description="Start a project from a template below to practice what you've learned." compact />
          )}

          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".07em", textTransform: "uppercase", color: "var(--text-faint)", marginBottom: 10 }}>
            PROJECT TEMPLATES
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 10 }}>
            {templates.map((template) => (
              <div key={template.id} style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 14, padding: "18px 20px", display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                  <span
                    style={{
                      fontSize: 10.5,
                      fontWeight: 700,
                      letterSpacing: ".05em",
                      textTransform: "uppercase",
                      color: "var(--cyan-deep)",
                      background: "var(--cyan-light)",
                      borderRadius: 99,
                      padding: "4px 10px",
                    }}
                  >
                    {template.category}
                  </span>
                  <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600 }}>{template.estimatedTime}</span>
                </div>
                <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14.5, lineHeight: 1.4, marginBottom: 6 }}>{template.title}</div>
                <div style={{ fontSize: 12.5, color: "var(--text-dim)", lineHeight: 1.6, marginBottom: 12, flex: 1 }}>{template.description}</div>
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 12 }}>
                  {template.tags.map((tag) => (
                    <span key={tag} style={{ fontSize: 10.5, fontWeight: 600, background: "#f0f2f4", borderRadius: 99, padding: "3px 8px" }}>
                      {tag}
                    </span>
                  ))}
                </div>
                <button className="btn btn--primary btn--sm" onClick={() => handleStart(template.id)}>
                  Start project
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
