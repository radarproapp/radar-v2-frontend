import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Icon } from "./Icon";
import { ErrorState } from "./ErrorState";
import { ApiError, activateRoadmap, getRoadmaps } from "../lib/api";
import type { GrowthRoadmap } from "../lib/types";

/// Every path this learner has built, and how far they got in each one.
///
/// Moving between paths was already possible, from a disclosure panel in the path header that
/// listed the other paths by title and section count. That is enough to switch and not enough to
/// choose: "Public health" and "Prompt engineering" look identical in that list, so somebody
/// coming back after a month had to switch into a path to find out whether it was the one they
/// had done the work in. The panel also listed only the *other* paths, so the fact that would
/// have anchored the rest — where they are now — was the one thing it never showed.
///
/// So that list grew up and moved here, and the panel kept the job it is good at: adding a
/// subject to the path you are on. There is one list of paths in Radar Learn, and it is this one.
///
/// Every number on a row is stored on the path document: the lesson ticks, the sections, the date
/// it was created. What is not stored is not shown — a roadmap carries no "finished on" date, so a
/// path with every lesson done says that and does not date it.

/// Counted from the lesson ticks rather than read from `progressPercent`, which the server also
/// folds resources and quiz results into. The open path already shows its lesson count in the
/// header; two different percentages for the same path on two tabs of one screen is worse than
/// whichever of them is less complete.
function progress(path: GrowthRoadmap) {
  const modules = path.modules ?? [];
  const lessons = modules.flatMap((m) => m.lessons ?? []);
  const done = lessons.filter((l) => l.isCompleted).length;

  return {
    sections: modules.length,
    total: lessons.length,
    done,
    percent: lessons.length === 0 ? 0 : Math.round((done / lessons.length) * 100),
  };
}

/// The day a path was started, when the document actually carries one.
///
/// `createdAt` has a server-side default, but the oldest stored paths predate it and deserialize
/// without the field — and `new Date(undefined)` is an Invalid Date, which renders as the literal
/// words "Invalid Date" on the row. A path whose start Radar does not know says nothing about it
/// rather than guessing from the first lesson or from the id.
function startedOn(createdAt: string | undefined): string | null {
  if (!createdAt) return null;

  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return null;

  return date.toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });
}

export function PathHistory({
  currentId,
  onResumed,
}: {
  /// The path the screen is on, when it managed to load one. Absent is normal, and is the case
  /// this tab is most useful in.
  currentId?: string | null;
  onResumed: () => void;
}) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  // The same cache entry the header panel invalidates, so adding a subject to the open path
  // already refreshes what this list says about it.
  const paths = useQuery({ queryKey: ["roadmaps", "all"], queryFn: getRoadmaps });

  const resume = useMutation({
    mutationFn: (roadmapId: string) => activateRoadmap(roadmapId),
    onSuccess: (updated) => {
      // Written and then refetched. The document this hands back is the one as stored; reading
      // /api/roadmaps/active rebuilds stale sections, personalises and attaches resources, and
      // persists that — so without the invalidate the learner lands on a path the server would
      // have rewritten the moment it was asked for.
      queryClient.setQueryData(["roadmap", "active"], updated);
      queryClient.invalidateQueries({ queryKey: ["roadmap", "active"] });
      queryClient.invalidateQueries({ queryKey: ["roadmaps", "all"] });

      // The home brief names the next lesson on the active path, so it would go on naming the
      // lesson from the path they just left.
      queryClient.invalidateQueries({ queryKey: ["home"] });

      setError(null);
      onResumed();
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : "Could not open that path."),
  });

  // Which row is the one they are on. The flag is on the stored document, but the id the screen
  // already holds is preferred: activating writes the new flag before clearing the old one, so
  // for an instant two documents claim to be active and the list would mark both.
  const isCurrent = (path: GrowthRoadmap) => (currentId ? path.id === currentId : path.isActive);

  if (paths.isLoading) {
    return <p className="path-history__note">Looking for the paths you have built…</p>;
  }

  if (paths.isError) {
    return (
      <ErrorState
        title="Could not load your paths"
        description={paths.error instanceof ApiError ? paths.error.message : "Please try again."}
        onRetry={() => paths.refetch()}
      />
    );
  }

  const all = paths.data ?? [];

  if (all.length === 0) {
    return (
      <p className="path-history__note">
        You have not built a path yet. The first one you build is listed here, with what you have
        finished in it.
      </p>
    );
  }

  return (
    <section className="path-history" aria-label="Path history">
      {/* The order is the one the server sends: newest first. Which is what a history is, and it
          also means the path somebody built this morning is not below four they abandoned. */}
      <p className="path-history__note">
        Every path you have built, newest first. Opening one puts you back at the first lesson you
        have not finished in it — nothing you have ticked is lost by moving between them.
      </p>

      <div className="path-history__list">
        {all.map((path) => {
          const { sections, total, done, percent } = progress(path);
          const current = isCurrent(path);
          const began = startedOn(path.createdAt);
          const opening = resume.isPending && resume.variables === path.id;

          return (
            <article key={path.id} className={`path-history__item ${current ? "current" : ""}`}>
              <div className="path-history__head">
                {/* A heading per row rather than a styled span: with no page title in this view,
                    these are what a screen reader can jump between to find a path by name. */}
                <h2 className="path-history__name">{path.title || path.interest}</h2>

                {current && <span className="path-history__badge">The path you are on</span>}

                {/* Said as what it is — every lesson ticked — and not as a date, because the
                    document holds no record of when the last one was ticked. */}
                {total > 0 && done === total && (
                  <span className="path-history__badge done">
                    <Icon name="done" size={11} /> Every lesson done
                  </span>
                )}
              </div>

              <div className="path-history__meta">
                <span>
                  {sections} {sections === 1 ? "section" : "sections"}
                </span>

                {total > 0 && (
                  <>
                    <span className="path-dot" />
                    <span>
                      {done} of {total} {total === 1 ? "lesson" : "lessons"}
                    </span>
                  </>
                )}

                {path.level && (
                  <>
                    <span className="path-dot" />
                    <span>{path.level}</span>
                  </>
                )}

                {began && (
                  <>
                    <span className="path-dot" />
                    <span>Started {began}</span>
                  </>
                )}
              </div>

              {/* No track for a path with no lessons in it. An empty bar reads as "none of it
                  done", when what is true is that there is nothing in it to do. */}
              {total > 0 ? (
                <div className="path-history__progress">
                  <div className="path-history__track">
                    <div className="path-history__fill" style={{ width: `${percent}%` }} />
                  </div>
                  <span className="path-history__percent">{percent}%</span>
                </div>
              ) : (
                <p className="path-history__thin">Radar could not write lessons for this path.</p>
              )}

              <div className="path-history__actions">
                {current ? (
                  <button className="btn btn--text btn--sm" onClick={onResumed}>
                    Back to this path <Icon name="next" size={13} />
                  </button>
                ) : (
                  <button
                    className="btn btn--primary btn--sm"
                    onClick={() => resume.mutate(path.id)}
                    disabled={resume.isPending}
                  >
                    {opening ? "Opening…" : done > 0 ? "Resume this path" : "Open this path"}
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {error && (
        <div role="alert" className="path-history__error">
          {error}
        </div>
      )}
    </section>
  );
}
