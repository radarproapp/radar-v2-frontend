import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { LoadingSkeleton } from "../components/LoadingSkeleton";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { ApiError, getNotes } from "../lib/api";
import { humanize } from "../lib/date";

function truncate(text: string, max: number): string {
  return text.length <= max ? text : text.slice(0, max) + "…";
}

export function Notebook() {
  const navigate = useNavigate();
  const notesQuery = useQuery({ queryKey: ["notes"], queryFn: getNotes });
  const notes = notesQuery.data ?? [];
  const errorMessage = notesQuery.error instanceof ApiError ? notesQuery.error.message : "Could not load notes.";

  return (
    <div className="r-page">
      <div className="r-page-head" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h1 className="r-page-title">Notebook</h1>
        <button className="btn btn--primary btn--sm" onClick={() => navigate("/notebook/new")}>
          + New note
        </button>
      </div>

      <p className="r-page-sub" style={{ marginBottom: 20 }}>
        Your own thinking, connected to what you have read and what you are learning.
      </p>

      {notesQuery.isError ? (
        <ErrorState title="Failed to load notes" description={errorMessage} onRetry={() => notesQuery.refetch()} />
      ) : notesQuery.isLoading ? (
        <LoadingSkeleton variant="feed" count={3} />
      ) : notes.length === 0 ? (
        <EmptyState icon="📓" title="No notes yet." description="Capture your thinking as you read and learn. Notes link back to the content that inspired them.">
          <button className="btn btn--primary btn--sm" onClick={() => navigate("/capture")}>
            Capture something
          </button>
        </EmptyState>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {notes.map((note) => (
            <div
              key={note.id}
              style={{ display: "block", background: "#fff", border: "1px solid rgba(20,24,31,.1)", borderRadius: 14, padding: "17px 19px", cursor: "pointer" }}
              onClick={() => navigate(`/notebook/${note.id}`)}
            >
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14.5, lineHeight: 1.4, marginBottom: 5 }}>{note.title}</div>
              <div style={{ fontSize: 12.5, color: "var(--text-dim)", lineHeight: 1.6, marginBottom: 10 }}>{truncate(note.body, 120)}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
                {note.linkedItemIds.length > 0 && (
                  <span style={{ fontSize: 11, fontWeight: 700, color: "var(--cyan-deep)", background: "var(--cyan-light)", borderRadius: 99, padding: "4px 10px" }}>
                    Linked to {note.linkedItemIds.length} item{note.linkedItemIds.length > 1 ? "s" : ""}
                  </span>
                )}
                {note.tags.slice(0, 3).map((tag) => (
                  <span key={tag} style={{ fontSize: 11, fontWeight: 600, background: "#f0f2f4", borderRadius: 99, padding: "4px 10px" }}>
                    #{tag}
                  </span>
                ))}
                <span style={{ fontSize: 11.5, color: "var(--text-faint)", fontWeight: 600, marginLeft: "auto" }}>Edited {humanize(note.editedAt)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
