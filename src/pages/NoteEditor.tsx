import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { createNote, getNote, updateNote } from "../lib/api";
import { humanize } from "../lib/date";
import type { Note } from "../lib/types";

// The original Blazor NoteEditor only mutated its local `_note` object on input — it never
// called UpdateNoteAsync, so every edit was silently lost on navigation. It also had no branch
// for NoteId == "new" (GetNoteByIdAsync("new") returns null forever, so /notebook/new just spun).
// Both fixed here: debounced autosave, and "new" creates a real note then swaps the URL.
export function NoteEditor() {
  const { noteId = "" } = useParams<{ noteId: string }>();
  const navigate = useNavigate();
  const [note, setNote] = useState<Note | null>(null);
  const skipNextSave = useRef(true);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    skipNextSave.current = true;

    if (noteId === "new") {
      createNote("New note", "").then((created) => {
        if (!cancelled) navigate(`/notebook/${created.id}`, { replace: true });
      });
      return () => {
        cancelled = true;
      };
    }

    getNote(noteId).then((loaded) => {
      if (!cancelled) setNote(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, [noteId, navigate]);

  useEffect(() => {
    if (!note) return;
    if (skipNextSave.current) {
      skipNextSave.current = false;
      return;
    }
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      updateNote(note.id, note.title, note.body, note.tags);
    }, 700);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note?.title, note?.body]);

  return (
    <div className="note-editor-shell">
      <div className="note-editor-header">
        <Link to="/notebook" style={{ fontSize: 18, color: "var(--text)" }}>
          ←
        </Link>
        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-faint)", flex: 1 }}>
          {note ? `Edited ${humanize(note.editedAt)}` : ""}
        </span>
        <button className="btn btn--tonal btn--sm" onClick={() => navigate("/ask")}>
          Ask Radar
        </button>
      </div>

      {note ? (
        <div style={{ flex: 1, width: "100%", maxWidth: 680, margin: "0 auto", padding: "clamp(20px,3.5vw,32px) clamp(18px,4vw,40px) 40px" }}>
          <input
            type="text"
            value={note.title}
            onChange={(e) => setNote({ ...note, title: e.target.value })}
            className="note-editor-title-input"
          />

          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 22 }}>
            {note.tags.map((tag) => (
              <span className="note-tag" key={tag}>
                #{tag}
              </span>
            ))}
          </div>

          <textarea value={note.body} onChange={(e) => setNote({ ...note, body: e.target.value })} className="note-editor-body" />

          {note.linkedItemIds.length > 0 && (
            <div className="note-radar-noticed">
              <div className="note-radar-noticed-label">RADAR NOTICED</div>
              <p style={{ fontSize: 13.5, color: "#374151", lineHeight: 1.7, marginBottom: 13 }}>
                Your closing question is partly answered by a paper in your saved library.
              </p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Link className="btn btn--primary btn--sm" to="/">
                  Open the paper
                </Link>
                <button className="btn btn--sm">Link to this note</button>
              </div>
            </div>
          )}

          <div style={{ marginTop: 20, fontSize: 12, color: "var(--text-faint)", lineHeight: 1.65 }}>
            {note.linkedItemIds.length > 0 && <span>Linked: {note.linkedItemIds.map((id) => `Item ${id}`).join(" · ")}</span>}
          </div>
        </div>
      ) : (
        <div className="r-empty">
          <div className="r-spinner" />
        </div>
      )}
    </div>
  );
}
