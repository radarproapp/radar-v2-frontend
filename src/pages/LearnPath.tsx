import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Icon } from "../components/Icon";
import { PathResources } from "../components/PathResources";
import { GuidanceCards } from "../components/GuidanceCards";
import { LoadingSkeleton } from "../components/LoadingSkeleton";
import { ErrorState } from "../components/ErrorState";
import { ApiError, completeLesson, getActiveRoadmap } from "../lib/api";
import { formatDuration, sumMinutes } from "../lib/duration";
import type { GrowthRoadmap, RoadmapLesson, RoadmapModule } from "../lib/types";

/// The learning journey, in the shape a course player has: one lesson open, and the whole path
/// listed beside it.
///
/// The data was always this shape — modules holding ordered lessons, each with a duration and a
/// completion flag — but the old page showed it as four stage cards behind three tabs, surfacing
/// exactly one module per stage. Anything a learner added beyond the first four modules was
/// invisible. Here every section is listed, every lesson is checkable, and the position in the
/// path is the first thing on screen.

interface Selection {
  moduleId: string;
  lessonId: string;
}

/// Module titles arrive carrying their own stage ("Beginner: Foundations of X"), which reads as
/// "Section 1 · Beginner: Beginner: Foundations" once the section header adds its own label.
function stripStagePrefix(title: string): string {
  const match = /^(beginner|intermediate|advanced|application)\s*:\s*/i.exec(title);
  return match ? title.slice(match[0].length).trim() : title;
}

function lessonCounts(module: RoadmapModule) {
  const lessons = module.lessons ?? [];
  const done = lessons.filter((l) => l.isCompleted).length;
  const duration = formatDuration(sumMinutes(lessons.map((l) => l.estimatedTime)));
  return { total: lessons.length, done, duration };
}

export function LearnPath() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const roadmapQuery = useQuery({ queryKey: ["roadmap", "active"], queryFn: getActiveRoadmap, retry: false });
  const roadmap = roadmapQuery.data;

  // Null means "wherever the path says I am". Storing the learner's choice separately from the
  // resume point lets both be derived during render instead of synchronised by an effect, which
  // is what caused the first render to show the top of the path before jumping.
  const [chosen, setChosen] = useState<Selection | null>(null);
  const [opened, setOpened] = useState<Set<string> | null>(null);
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [saveError, setSaveError] = useState<string | null>(null);

  const modules = useMemo(
    () => (roadmap?.modules ?? []).toSorted((a, b) => a.order - b.order),
    [roadmap],
  );

  /// Where the learner actually is: the first lesson they have not finished. Opening at the top of
  /// a path they are halfway through would make them scroll to find their place.
  const resumePoint = useMemo<Selection | null>(() => {
    for (const module of modules) {
      const next = (module.lessons ?? []).toSorted((a, b) => a.order - b.order).find((l) => !l.isCompleted);
      if (next) return { moduleId: module.id, lessonId: next.id };
    }

    const first = modules[0]?.lessons?.[0];
    return first ? { moduleId: modules[0].id, lessonId: first.id } : null;
  }, [modules]);

  // The learner's choice if they have made one, otherwise where the path says they are. The
  // section holding it opens by default.
  const selection = chosen ?? resumePoint;
  const expanded = opened ?? new Set(selection ? [selection.moduleId] : []);

  const totals = useMemo(() => {
    const lessons = modules.flatMap((m) => m.lessons ?? []);
    const done = lessons.filter((l) => l.isCompleted).length;
    return {
      total: lessons.length,
      done,
      duration: formatDuration(sumMinutes(lessons.map((l) => l.estimatedTime))),
      // Counted from lessons rather than read from progressPercent, which the server also folds
      // resources and quizzes into. On a page that shows these checkboxes, the number beside them
      // has to be the one they add up to.
      percent: lessons.length === 0 ? 0 : Math.round((done / lessons.length) * 100),
    };
  }, [modules]);

  const activeModule = modules.find((m) => m.id === selection?.moduleId);
  const firstModule = modules[0];
  const fallbackResources = useMemo(
    () => (firstModule?.resources ?? roadmap?.resources ?? []).slice(0, 6),
    [firstModule, roadmap],
  );
  const activeLesson = activeModule?.lessons?.find((l) => l.id === selection?.lessonId);

  /// The resources attached to the stage this lesson sits in. Not a catalogue — the Hub is the
  /// catalogue — just what to actually use for this section.
  const lessonResources = useMemo(() => {
    if (!activeModule) return [];
    const own = activeModule.resources ?? [];
    if (own.length > 0) return own.slice(0, 4);

    const level = activeModule.level?.toLowerCase();
    if (!level) return [];

    return (roadmap?.resources ?? []).filter((r) => r.level?.toLowerCase() === level).slice(0, 4);
  }, [activeModule, roadmap]);

  const toggleSection = (moduleId: string) => {
    const next = new Set(expanded);
    if (next.has(moduleId)) next.delete(moduleId);
    else next.add(moduleId);
    setOpened(next);
  };

  const markComplete = async (moduleId: string, lesson: RoadmapLesson) => {
    if (!roadmap || lesson.isCompleted) return;

    setSaving((prev) => ({ ...prev, [lesson.id]: true }));
    setSaveError(null);

    try {
      await completeLesson(roadmap.id, moduleId, lesson.id);

      // Pin the view to this lesson. Without it the resume point moves on, and because a learner
      // who has not navigated has no choice recorded, the open lesson would change underneath
      // them — the one moment they need to see that the tick registered.
      setChosen({ moduleId, lessonId: lesson.id });

      queryClient.setQueryData<GrowthRoadmap>(["roadmap", "active"], (old) =>
        old
          ? {
              ...old,
              modules: old.modules.map((m) =>
                m.id === moduleId
                  ? { ...m, lessons: m.lessons.map((l) => (l.id === lesson.id ? { ...l, isCompleted: true } : l)) }
                  : m,
              ),
            }
          : old,
      );
    } catch (e) {
      // Said out loud. A checkbox that silently fails to save is worse than one that refuses:
      // the learner walks away believing the progress was recorded.
      setSaveError(e instanceof ApiError ? e.message : "Could not save that. Your progress was not recorded.");
    } finally {
      setSaving((prev) => ({ ...prev, [lesson.id]: false }));
    }
  };

  /// The lesson after this one, across section boundaries.
  const nextLesson = useMemo<Selection | null>(() => {
    if (!selection) return null;

    const flat = modules.flatMap((m) =>
      (m.lessons ?? []).toSorted((a, b) => a.order - b.order).map((l) => ({ moduleId: m.id, lessonId: l.id })),
    );
    const index = flat.findIndex((e) => e.lessonId === selection.lessonId);
    return index >= 0 && index + 1 < flat.length ? flat[index + 1] : null;
  }, [modules, selection]);

  const goTo = (target: Selection) => {
    setChosen(target);
    setOpened(new Set(expanded).add(target.moduleId));
    setSaveError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const notFound = roadmapQuery.error instanceof ApiError && roadmapQuery.error.status === 404;

  if (roadmapQuery.isLoading) {
    return (
      <div className="r-page" style={{ maxWidth: 1180 }}>
        <LoadingSkeleton variant="card" count={3} />
      </div>
    );
  }

  if (roadmapQuery.isError && !notFound) {
    return (
      <div className="r-page" style={{ maxWidth: 1180 }}>
        <ErrorState
          title="Could not load your path"
          description={roadmapQuery.error instanceof ApiError ? roadmapQuery.error.message : "Please try again."}
          onRetry={() => roadmapQuery.refetch()}
        />
      </div>
    );
  }

  // Empty, and left that way until the learner says what they want.
  //
  // This used to generate a four-stage pathway from the profile on first sight, so a Computer
  // Science student arrived at a full curriculum nobody had asked them about. An empty path with
  // one clear thing to do is not a worse first impression than a full one that guessed wrong — it
  // is the only honest one, because at this point Radar genuinely does not know.
  if (!roadmap || modules.length === 0) {
    return (
      <div className="r-page path-blank">
        <div className="path-blank__icon">
          <Icon name="explore" size={26} />
        </div>
        <h1 className="path-blank__title">Your path is empty</h1>
        <p className="path-blank__text">
          Tell Radar what you want to learn and it builds the first section. Three questions, then
          you are reading.
        </p>
        <button className="btn btn--primary" onClick={() => navigate("/learn/build")}>
          Build your path
        </button>
        <button className="path-blank__alt" onClick={() => navigate("/ask?mode=upload")}>
          Or start from a document you already have
        </button>

        {/* The two actions above are already on screen, so those cards would be a second copy. */}
        <GuidanceCards exclude={["one-subject", "own-material"]} heading="What else Radar does" />
      </div>
    );
  }

  return (
    <div className="r-page" style={{ maxWidth: 1180 }}>
      {/* Your position in the path, before anything else. */}
      <div className="path-head">
        <div style={{ minWidth: 0 }}>
          <h1 className="path-head__title">{roadmap.title || roadmap.interest}</h1>
          <div className="path-head__meta">
            {modules.length} {modules.length === 1 ? "section" : "sections"}
            <span className="path-dot" />
            {totals.total} {totals.total === 1 ? "lesson" : "lessons"}
            {totals.duration && (
              <>
                <span className="path-dot" />
                {totals.duration} total
              </>
            )}
          </div>
        </div>

        <div className="path-progress">
          <div className="path-progress__row">
            <span className="path-progress__label">Your progress</span>
            <span className="path-progress__value">
              {totals.done} of {totals.total} · {totals.percent}%
            </span>
          </div>
          <div className="path-progress__track">
            <div className="path-progress__fill" style={{ width: `${totals.percent}%` }} />
          </div>
        </div>
      </div>

      <div className="path-grid">
        {/* ── The lesson ──────────────────────────────────────────── */}
        <div className="path-lesson">
          {activeLesson && activeModule ? (
            <>
              <div className="path-lesson__crumb">
                Section {activeModule.order || modules.indexOf(activeModule) + 1} ·{" "}
                {stripStagePrefix(activeModule.title)}
              </div>
              <h2 className="path-lesson__title">{activeLesson.title}</h2>

              <div className="path-lesson__meta">
                {activeLesson.estimatedTime && (
                  <span className="path-lesson__chip">
                    <Icon name="time" size={12} /> {activeLesson.estimatedTime}
                  </span>
                )}
                {activeModule.level && <span className="path-lesson__chip">{activeModule.level}</span>}
                {activeLesson.isCompleted && (
                  <span className="path-lesson__chip done">
                    <Icon name="done" size={12} /> Completed
                  </span>
                )}
              </div>

              {activeLesson.body ? (
                <div className="path-lesson__body">
                  {activeLesson.body.split(/\n\n+/).map((para, i) => (
                    <p key={i}>{para}</p>
                  ))}
                </div>
              ) : (
                // No invented prose. The lesson has a title and a place in the sequence; what to
                // do with it comes from the resources, which are real.
                <p className="path-lesson__nobody">
                  This section has no written lesson — work through the resources below, then mark it done.
                </p>
              )}

              <PathResources resources={lessonResources} />

              {saveError && (
                <div role="alert" className="path-lesson__error">
                  {saveError}
                </div>
              )}

              <div className="path-lesson__actions">
                {!activeLesson.isCompleted ? (
                  <button
                    className="btn btn--primary"
                    disabled={saving[activeLesson.id]}
                    onClick={() => markComplete(activeModule.id, activeLesson)}
                  >
                    {saving[activeLesson.id] ? "Saving…" : "Mark as complete"}
                  </button>
                ) : (
                  <span className="path-lesson__completed">
                    <Icon name="done" size={15} /> Done
                  </span>
                )}

                {nextLesson && (
                  <button className="btn btn--text" onClick={() => goTo(nextLesson)}>
                    Next lesson <Icon name="next" size={13} />
                  </button>
                )}
              </div>
            </>
          ) : firstModule ? (
            // A section exists but has no lessons: Radar could not write them, and said so rather
            // than filling the space with "Introduction to X". The curated resources are real, so
            // they are what the learner gets.
            <>
              <div className="path-lesson__crumb">Section 1</div>
              <h2 className="path-lesson__title">{stripStagePrefix(firstModule.title)}</h2>
              <p className="path-lesson__nobody">
                Radar could not write lessons for this section — rather than filling it with
                generic headings, here is the material it found. You can rebuild the section with
                a sharper answer about what you want to be able to do.
              </p>

              <PathResources resources={fallbackResources} />

              <div className="path-lesson__actions">
                <button className="btn btn--primary" onClick={() => navigate("/learn/build")}>
                  Build another section
                </button>
              </div>
            </>
          ) : null}
        </div>

        {/* ── The path ────────────────────────────────────────────── */}
        <aside className="path-content" aria-label="Path content">
          <div className="path-content__head">Path content</div>

          {modules.map((module, index) => {
            const { total, done, duration } = lessonCounts(module);
            const open = expanded.has(module.id);
            const lessons = (module.lessons ?? []).toSorted((a, b) => a.order - b.order);

            return (
              <section key={module.id} className="path-section">
                <button
                  className="path-section__head"
                  onClick={() => toggleSection(module.id)}
                  aria-expanded={open}
                >
                  <Icon name={open ? "collapse" : "expand"} size={14} />
                  <span className="path-section__text">
                    <span className="path-section__title">
                      Section {index + 1}: {stripStagePrefix(module.title)}
                    </span>
                    <span className="path-section__meta">
                      {done} / {total}
                      {duration && ` · ${duration}`}
                    </span>
                  </span>
                </button>

                {open && (
                  <ul className="path-lessons">
                    {lessons.length === 0 && (
                      <li className="path-lessons__empty">Lessons could not be written — see the resources.</li>
                    )}

                    {lessons.map((lesson) => (
                      <li key={lesson.id}>
                        <div className={`path-item ${lesson.id === selection?.lessonId ? "current" : ""}`}>
                          {/* A real checkbox: it is the control that records progress, and it has
                              to be reachable and toggleable without opening the lesson first. */}
                          <input
                            type="checkbox"
                            className="path-item__check"
                            checked={lesson.isCompleted}
                            disabled={lesson.isCompleted || saving[lesson.id]}
                            onChange={() => markComplete(module.id, lesson)}
                            aria-label={`Mark "${lesson.title}" as complete`}
                          />
                          <button
                            className="path-item__open"
                            onClick={() => goTo({ moduleId: module.id, lessonId: lesson.id })}
                          >
                            <span className="path-item__title">{lesson.title}</span>
                            {lesson.estimatedTime && (
                              <span className="path-item__time">{lesson.estimatedTime}</span>
                            )}
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            );
          })}

          <button className="path-content__add" onClick={() => navigate("/learn/build")}>
            <Icon name="add" size={14} /> Add a section
          </button>
        </aside>
      </div>
    </div>
  );
}
