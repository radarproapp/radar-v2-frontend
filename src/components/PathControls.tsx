import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Icon } from "./Icon";
import { ApiError, activateRoadmap, addPathSection, getRoadmaps } from "../lib/api";
import type { GrowthRoadmap } from "../lib/types";

/// Changing and editing a path, from the screen the path is on.
///
/// It used to mean going to Settings, editing the interests a path is derived from, and
/// generating a new one — so the paths somebody had already built were unreachable from the
/// screen that shows them, and moving between two subjects meant starting over each time.
///
/// Two things, which are the two things people actually want: move to another path they already
/// have, and add a subject to the one they are on. Both are one press from the path itself.
///
/// What it does not do is pick a subject for anybody. The box is empty and nothing happens until
/// somebody types into it — the same rule as everywhere else in Radar.

const LEVELS = ["Beginner", "Intermediate", "Advanced"];

export function PathControls({ current }: { current: GrowthRoadmap }) {
  const queryClient = useQueryClient();

  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [level, setLevel] = useState(current.level || "Beginner");
  const [error, setError] = useState<string | null>(null);

  /// Only fetched once the panel is opened. Most visits to a path are to read it.
  const paths = useQuery({
    queryKey: ["roadmaps", "all"],
    queryFn: getRoadmaps,
    enabled: open,
  });

  const refresh = (updated: GrowthRoadmap) => {
    queryClient.setQueryData(["roadmap", "active"], updated);
    queryClient.invalidateQueries({ queryKey: ["roadmaps", "all"] });
    setError(null);
    setOpen(false);
  };

  const switchTo = useMutation({
    mutationFn: (roadmapId: string) => activateRoadmap(roadmapId),
    onSuccess: refresh,
    onError: (e) =>
      setError(e instanceof ApiError ? e.message : "Could not switch to that path."),
  });

  const addSubject = useMutation({
    mutationFn: () => addPathSection(subject.trim(), level),
    onSuccess: (updated) => {
      setSubject("");
      refresh(updated);
    },
    onError: (e) =>
      setError(e instanceof ApiError ? e.message : "Could not add that to your path."),
  });

  const others = (paths.data ?? []).filter((p) => p.id !== current.id);
  const busy = switchTo.isPending || addSubject.isPending;

  return (
    <div className="path-controls">
      <button
        className="btn btn--text btn--sm"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <Icon name={open ? "collapse" : "settings"} size={13} /> Change or edit this path
      </button>

      {open && (
        <div className="path-controls__panel">
          {/* Add a subject to the path you are on. */}
          <div className="path-controls__section">
            <div className="path-controls__label">Add a subject to this path</div>

            <div className="path-controls__row">
              <input
                className="r-input"
                placeholder="What do you want to learn next?"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                disabled={busy}
              />

              <select
                className="r-input path-controls__level"
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                aria-label="Level"
                disabled={busy}
              >
                {LEVELS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>

              <button
                className="btn btn--primary btn--sm"
                onClick={() => addSubject.mutate()}
                disabled={busy || subject.trim().length < 2}
              >
                {addSubject.isPending ? "Building…" : "Add"}
              </button>
            </div>

            <p className="path-controls__note">
              Radar builds a section on what you type. It does not choose a subject for you.
            </p>
          </div>

          {/* Move to another path you already have. */}
          <div className="path-controls__section">
            <div className="path-controls__label">Switch to another path</div>

            {paths.isLoading ? (
              <p className="path-controls__note">Looking…</p>
            ) : others.length === 0 ? (
              <p className="path-controls__note">
                This is your only path. Adding a subject above builds on it.
              </p>
            ) : (
              <div className="path-controls__paths">
                {others.map((path) => (
                  <button
                    key={path.id}
                    className="path-controls__path"
                    onClick={() => switchTo.mutate(path.id)}
                    disabled={busy}
                  >
                    <span className="path-controls__path-name">
                      {path.title || path.interest}
                    </span>
                    <span className="path-controls__path-meta">
                      {path.modules?.length ?? 0}{" "}
                      {(path.modules?.length ?? 0) === 1 ? "section" : "sections"}
                      {path.level ? ` · ${path.level}` : ""}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {error && (
            <div role="alert" className="path-controls__error">
              {error}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
