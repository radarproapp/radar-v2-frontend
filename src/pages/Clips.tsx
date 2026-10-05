import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ApiError, getTodaysClips, logEvent, saveClip } from "../lib/api";
import type { Clip } from "../lib/types";

// A different wash per clip so scrolling reads as a sequence of distinct cards, the way a
// social feed does, instead of one static panel.
const GRADIENTS = [
  "radial-gradient(120% 90% at 80% 0%, #12343b 0%, #0b1418 55%, #080b0e 100%)",
  "radial-gradient(120% 90% at 15% 10%, #241a34 0%, #120e1c 55%, #08070c 100%)",
  "radial-gradient(120% 90% at 85% 5%, #332312 0%, #1a130a 55%, #0b0906 100%)",
  "radial-gradient(120% 90% at 20% 0%, #12304f 0%, #0a1725 55%, #070b10 100%)",
  "radial-gradient(120% 90% at 80% 10%, #341322 0%, #1b0c14 55%, #0b0608 100%)",
];

export function Clips() {
  const clipsQuery = useQuery({ queryKey: ["clips", "today"], queryFn: getTodaysClips });
  const clips = clipsQuery.data ?? [];
  const [activeIndex, setActiveIndex] = useState(0);
  const [savedIds, setSavedIds] = useState<Record<string, boolean>>({});
  const feedRef = useRef<HTMLDivElement | null>(null);

  // Which slide is in view, so the progress segments and counter follow the scroll.
  useEffect(() => {
    const root = feedRef.current;
    if (!root || clips.length === 0) return;
    const slides = Array.from(root.querySelectorAll<HTMLElement>("[data-clip-index]"));
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const index = Number((entry.target as HTMLElement).dataset.clipIndex);
          if (!Number.isNaN(index)) setActiveIndex(index);
        });
      },
      { root, threshold: 0.6 },
    );
    slides.forEach((slide) => observer.observe(slide));
    return () => observer.disconnect();
  }, [clips.length]);

  const scrollToIndex = useCallback((index: number) => {
    const root = feedRef.current;
    if (!root) return;
    root.querySelector<HTMLElement>(`[data-clip-index="${index}"]`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowDown" || event.key === "PageDown") {
        event.preventDefault();
        scrollToIndex(Math.min(activeIndex + 1, clips.length - 1));
      } else if (event.key === "ArrowUp" || event.key === "PageUp") {
        event.preventDefault();
        scrollToIndex(Math.max(activeIndex - 1, 0));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeIndex, clips.length, scrollToIndex]);

  const save = async (clip: Clip) => {
    if (savedIds[clip.id]) return;
    setSavedIds((prev) => ({ ...prev, [clip.id]: true }));
    logEvent("ClipSaved", { clipId: clip.id, contentItemId: clip.contentItemId ?? undefined });
    try {
      await saveClip(clip.id);
    } catch {
      setSavedIds((prev) => {
        const next = { ...prev };
        delete next[clip.id];
        return next;
      });
    }
  };

  const errorMessage = clipsQuery.error instanceof ApiError ? clipsQuery.error.message : "Could not load clips.";

  const shell = (content: React.ReactNode) => (
    <div className="r-clips">
      <header className="r-clips__top">
        <Link to="/" className="r-clips__back" aria-label="Back">
          ←
        </Link>
        <span className="r-clips__title">Clips</span>
        {clips.length > 0 && <span className="r-clips__counter">{activeIndex + 1} / {clips.length}</span>}
        {clips.length > 0 && (
          <div className="r-clips__progress">
            {clips.map((_, index) => (
              <button
                key={index}
                className={index <= activeIndex ? "done" : ""}
                aria-label={`Go to clip ${index + 1}`}
                onClick={() => scrollToIndex(index)}
              />
            ))}
          </div>
        )}
      </header>
      {content}
    </div>
  );

  if (clipsQuery.isLoading) {
    return shell(
      <div className="r-clips__state">
        <div className="r-clips__spinner" />
      </div>,
    );
  }

  if (clipsQuery.isError) {
    return shell(
      <div className="r-clips__state">
        <div className="r-clips__state-title">Failed to load clips</div>
        <div className="r-clips__state-desc">{errorMessage}</div>
        <button className="btn btn--primary btn--sm" onClick={() => clipsQuery.refetch()}>Try again</button>
      </div>,
    );
  }

  if (clips.length === 0) {
    return shell(
      <div className="r-clips__state">
        <div className="r-clips__state-title">No clips today</div>
        <div className="r-clips__state-desc">Radar is preparing your daily signals. Check back tomorrow.</div>
        <Link className="btn btn--primary btn--sm" to="/">Go to Today</Link>
      </div>,
    );
  }

  return shell(
    <div className="r-clips__feed" ref={feedRef}>
      {clips.map((clip, index) => {
        const saved = !!savedIds[clip.id] || clip.isSaved;
        return (
          <section key={clip.id} className="r-clips__slide" data-clip-index={index} style={{ background: GRADIENTS[index % GRADIENTS.length] }}>
            <div className="r-clips__actions">
              <button className={`r-clips__action ${saved ? "saved" : ""}`} onClick={() => save(clip)} aria-label={saved ? "Saved" : "Save clip"}>
                <span className="r-clips__action-icon">{saved ? "✓" : "🔖"}</span>
                <span className="r-clips__action-label">{saved ? "Saved" : "Save"}</span>
              </button>
              {clip.contentItemId && (
                <Link className="r-clips__action" to={`/feed/${clip.contentItemId}`} aria-label="Read the brief">
                  <span className="r-clips__action-icon">↗</span>
                  <span className="r-clips__action-label">Read</span>
                </Link>
              )}
            </div>

            <div className="r-clips__body">
              <span className="r-clips__tag">{clip.tag}</span>
              <h2 className="r-clips__signal">{clip.signal}</h2>
              <div className="r-clips__why-label">Why it matters</div>
              <p className="r-clips__why">{clip.whyItMatters}</p>
              <div className="r-clips__source">{clip.source}</div>
            </div>

            <div className="r-clips__hint">
              {index < clips.length - 1 ? "Scroll for the next clip ↓" : "That's all for today"}
            </div>
          </section>
        );
      })}
    </div>,
  );
}
