import { useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LoadingSkeleton } from "../components/LoadingSkeleton";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { ApiError, createNote, deleteNote, getNotes, updateNote } from "../lib/api";
import { humanize } from "../lib/date";
import type { Note, NoteChecklistItem } from "../lib/types";

/// Notes, modelled on Google Keep.
///
/// The old page was a list of titles linking to a separate editor, which is why it read as "I
/// don't understand the note feature": writing a note took two navigations and, once written,
/// there was nothing to do with it. Keep's design solves exactly that — you type into the box at
/// the top, notes are cards you can see at a glance, and everything else (pin, colour, tick a box)
/// happens in place without leaving the page.

/// Named colours rather than raw hex, so the palette stays consistent and a stored value can never
/// become unreadable against a future background.
const COLORS: { name: string; value: string | null; swatch: string }[] = [
  { name: "Default", value: null, swatch: "#ffffff" },
  { name: "Sand", value: "sand", swatch: "#fff8e1" },
  { name: "Mint", value: "mint", swatch: "#e0f4ea" },
  { name: "Sky", value: "sky", swatch: "#e3f1fb" },
  { name: "Blush", value: "blush", swatch: "#fdeaea" },
  { name: "Lilac", value: "lilac", swatch: "#f0eafb" },
];

function colorOf(note: Note): string {
  return COLORS.find((c) => c.value === (note.color ?? null))?.swatch ?? "#ffffff";
}

export function Notebook() {
  const queryClient = useQueryClient();
  const [showArchived, setShowArchived] = useState(false);
  const [search, setSearch] = useState("");

  const notesQuery = useQuery({
    queryKey: ["notes", showArchived],
    queryFn: () => getNotes(showArchived),
  });

  // `?? []` would allocate a new array on every render, so the filter memo below would never
  // actually hit. Depending on the query data directly keeps the identity stable between renders.
  const notes = useMemo(() => notesQuery.data ?? [], [notesQuery.data]);
  const errorMessage = notesQuery.error instanceof ApiError ? notesQuery.error.message : "Could not load notes.";
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["notes"] });

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return notes;
    return notes.filter(
      (n) =>
        n.title.toLowerCase().includes(term) ||
        n.body.toLowerCase().includes(term) ||
        n.checklist.some((i) => i.text.toLowerCase().includes(term)),
    );
  }, [notes, search]);

  const pinned = visible.filter((n) => n.isPinned);
  const others = visible.filter((n) => !n.isPinned);

  return (
    <div className="r-page">
      <div className="r-page-head">
        <h1 className="r-page-title">Notes</h1>
        <p className="r-page-sub">Anything you want to keep. Type it, tick it, pin what matters.</p>
      </div>

      <QuickAdd onCreated={refresh} />

      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 18, flexWrap: "wrap" }}>
        <input
          className="r-input"
          placeholder="Search your notes…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: "1 1 220px" }}
        />
        <button
          className={`r-chip ${showArchived ? "active" : ""}`}
          onClick={() => setShowArchived((v) => !v)}
        >
          {showArchived ? "Showing archived" : "Show archived"}
        </button>
      </div>

      {notesQuery.isError ? (
        <ErrorState title="Failed to load notes" description={errorMessage} onRetry={() => notesQuery.refetch()} />
      ) : notesQuery.isLoading ? (
        <LoadingSkeleton variant="card" count={3} />
      ) : visible.length === 0 ? (
        <EmptyState
          icon="📝"
          title={search ? "Nothing matches that." : "No notes yet."}
          description={
            search
              ? "Try a different word."
              : "Write anything you want to come back to — a thought, a link, a list of things to study."
          }
        />
      ) : (
        <>
          {pinned.length > 0 && (
            <>
              <div className="r-note-section-label">PINNED</div>
              <NoteGrid notes={pinned} onChanged={refresh} />
            </>
          )}
          {others.length > 0 && (
            <>
              {pinned.length > 0 && <div className="r-note-section-label">OTHERS</div>}
              <NoteGrid notes={others} onChanged={refresh} />
            </>
          )}
        </>
      )}
    </div>
  );
}

/// The box at the top. Collapsed it is one line; clicking it expands into a title and body, the
/// way Keep does, so writing a note never costs a page change.
function QuickAdd({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (saving) return;
    if (!title.trim() && !body.trim()) {
      setOpen(false);
      return;
    }
    setSaving(true);
    try {
      await createNote(title.trim(), body.trim());
      setTitle("");
      setBody("");
      setOpen(false);
      onCreated();
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <button className="r-note-quickadd" onClick={() => setOpen(true)}>
        Take a note…
      </button>
    );
  }

  return (
    <div className="r-note-card" style={{ marginBottom: 18 }}>
      <input
        className="r-note-title-input"
        placeholder="Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        autoFocus
      />
      <textarea
        className="r-note-body-input"
        placeholder="Take a note…"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
      />
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <button className="btn btn--ghost btn--sm" onClick={() => setOpen(false)}>
          Close
        </button>
        <button className="btn btn--primary btn--sm" onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Done"}
        </button>
      </div>
    </div>
  );
}

function NoteGrid({ notes, onChanged }: { notes: Note[]; onChanged: () => void }) {
  return (
    <div className="r-note-grid">
      {notes.map((note) => (
        <NoteCard key={note.id} note={note} onChanged={onChanged} />
      ))}
    </div>
  );
}

function NoteCard({ note, onChanged }: { note: Note; onChanged: () => void }) {
  const [title, setTitle] = useState(note.title);
  const [body, setBody] = useState(note.body);
  const [checklist, setChecklist] = useState<NoteChecklistItem[]>(note.checklist ?? []);
  const [showColors, setShowColors] = useState(false);
  const saveTimer = useRef<number | null>(null);

  /// Debounced autosave. Keep never asks you to press save, and a note you have to remember to
  /// save is a note you lose.
  const queueSave = (patch: Parameters<typeof updateNote>[1]) => {
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      updateNote(note.id, patch).catch(() => {});
    }, 600);
  };

  const patchNow = async (patch: Parameters<typeof updateNote>[1]) => {
    await updateNote(note.id, patch);
    onChanged();
  };

  const toggleItem = (id: string) => {
    const next = checklist.map((i) => (i.id === id ? { ...i, isChecked: !i.isChecked } : i));
    setChecklist(next);
    queueSave({ checklist: next });
  };

  const addItem = () => {
    const next = [...checklist, { id: crypto.randomUUID(), text: "", isChecked: false }];
    setChecklist(next);
  };

  const editItem = (id: string, text: string) => {
    const next = checklist.map((i) => (i.id === id ? { ...i, text } : i));
    setChecklist(next);
    queueSave({ checklist: next });
  };

  const done = checklist.filter((i) => i.isChecked).length;

  return (
    <div className="r-note-card" style={{ background: colorOf(note) }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
        <input
          className="r-note-title-input"
          placeholder="Title"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            queueSave({ title: e.target.value });
          }}
        />
        <button
          className="r-note-icon-btn"
          title={note.isPinned ? "Unpin" : "Pin"}
          onClick={() => patchNow({ isPinned: !note.isPinned })}
        >
          {note.isPinned ? "📌" : "📍"}
        </button>
      </div>

      <textarea
        className="r-note-body-input"
        placeholder="Take a note…"
        value={body}
        onChange={(e) => {
          setBody(e.target.value);
          queueSave({ body: e.target.value });
        }}
        rows={3}
      />

      {checklist.length > 0 && (
        <div style={{ marginBottom: 8 }}>
          {checklist.map((item) => (
            <div key={item.id} className="r-note-check-row">
              <input type="checkbox" checked={item.isChecked} onChange={() => toggleItem(item.id)} />
              <input
                className="r-note-check-input"
                value={item.text}
                placeholder="List item"
                onChange={(e) => editItem(item.id, e.target.value)}
                style={{ textDecoration: item.isChecked ? "line-through" : "none" }}
              />
            </div>
          ))}
          <div className="r-note-check-count">
            {done} of {checklist.length} done
          </div>
        </div>
      )}

      <div className="r-note-actions">
        <button className="r-note-icon-btn" title="Add list item" onClick={addItem}>
          ☑
        </button>
        <button className="r-note-icon-btn" title="Colour" onClick={() => setShowColors((v) => !v)}>
          🎨
        </button>
        <button
          className="r-note-icon-btn"
          title={note.isArchived ? "Unarchive" : "Archive"}
          onClick={() => patchNow({ isArchived: !note.isArchived })}
        >
          {note.isArchived ? "📤" : "📥"}
        </button>
        <button
          className="r-note-icon-btn"
          title="Delete"
          onClick={async () => {
            await deleteNote(note.id);
            onChanged();
          }}
        >
          🗑
        </button>
        <span className="r-note-edited">{humanize(note.editedAt)}</span>
      </div>

      {showColors && (
        <div className="r-note-colors">
          {COLORS.map((c) => (
            <button
              key={c.name}
              title={c.name}
              className="r-note-swatch"
              style={{ background: c.swatch, outline: (note.color ?? null) === c.value ? "2px solid var(--cyan)" : "none" }}
              onClick={async () => {
                setShowColors(false);
                await patchNow({ color: c.value ?? "" });
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
