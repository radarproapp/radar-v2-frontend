import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { ApiError, getPublicProject } from "../lib/api";

export function ProjectShowcase() {
  const { projectId } = useParams<{ projectId: string }>();
  const query = useQuery({
    queryKey: ["projects", "public", projectId],
    queryFn: () => getPublicProject(projectId!),
    enabled: !!projectId,
    retry: false,
  });

  return (
    <div style={{ minHeight: "100dvh", background: "var(--bg)", display: "flex", flexDirection: "column", alignItems: "center", padding: "48px 20px" }}>
      <div style={{ width: "100%", maxWidth: 640 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 32 }}>
          <div style={{ width: 28, height: 28, background: "var(--navy)", color: "var(--cyan-bright)", borderRadius: "50%", display: "grid", placeItems: "center", fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "0.8rem" }}>
            R
          </div>
          <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 16 }}>Radar</span>
        </div>

        {query.isLoading ? (
          <div className="r-spinner" />
        ) : query.isError ? (
          <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 16, padding: 32, textAlign: "center" }}>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 18, marginBottom: 8 }}>Project not found</div>
            <p style={{ fontSize: 13.5, color: "var(--text-dim)" }}>
              {query.error instanceof ApiError && query.error.status === 404
                ? "This project isn't public, or the link is no longer valid."
                : "Something went wrong loading this project."}
            </p>
          </div>
        ) : query.data ? (
          <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 16, padding: 32 }}>
            {query.data.isCompleted && (
              <span style={{ fontSize: 11, fontWeight: 700, color: "var(--lime)", background: "rgba(46,168,96,0.1)", borderRadius: 99, padding: "4px 10px" }}>
                Completed
              </span>
            )}
            <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.6rem", marginTop: 12, marginBottom: 12 }}>{query.data.title}</h1>
            <p style={{ fontSize: 14.5, color: "var(--text-dim)", lineHeight: 1.7 }}>{query.data.description}</p>
          </div>
        ) : null}

        <div style={{ textAlign: "center", marginTop: 28, fontSize: 12.5, color: "var(--text-muted)" }}>
          Built and showcased with{" "}
          <a href="/" style={{ color: "var(--cyan)", fontWeight: 700 }}>
            Radar
          </a>
        </div>
      </div>
    </div>
  );
}
