import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "./Icon";
import { recordPlayback } from "../lib/api";
import { clockFor, secondsFromTimestamp } from "../lib/duration";
import type { ChapterBreakdown, PlaybackProgress } from "../lib/types";

/// A podcast and video player, rather than a wrapped `<audio controls>`.
///
/// What was here: 21 lines around a bare browser audio element, and a poster that swapped itself
/// for a YouTube iframe. No resume, no speed, no skip, no chapters, and — the part that mattered
/// most — nothing recorded. Closing the tab lost your place, and there was no answer to "how much
/// of this did you listen to", which is the material a listening history is made of.
///
/// Heartbeats send a *delta*, never a running total: the seconds that actually elapsed while
/// playing since the last report. The server clamps each one, so a tab left open on a paused
/// episode and a scrub to the end both add nothing. That is what lets the graph say "4h 12m
/// listened" and mean it.
///
/// Only for audio. A YouTube iframe will not report its position to us without the IFrame API and
/// a chunk of third-party script, and guessing at progress from wall-clock time would feed the
/// graph numbers nobody measured — so video keeps the embed and is counted as started, not timed.

interface MediaPlayerProps {
  contentItemId: string;
  url: string | null | undefined;
  title: string;
  chapters?: ChapterBreakdown[];
  initial?: PlaybackProgress | null;
}

/// Matches PlaybackService.HeartbeatSeconds. The server clamps to twice this, so the two have to
/// agree or honest playback gets thrown away.
const HEARTBEAT_SECONDS = 10;

const SPEEDS = [1, 1.25, 1.5, 1.75, 2] as const;

export function MediaPlayer({ contentItemId, url, title, chapters = [], initial }: MediaPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);

  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(initial?.positionSeconds ?? 0);
  const [duration, setDuration] = useState(initial?.durationSeconds ?? 0);
  const [speed, setSpeed] = useState<number>(1);
  const [resumedFrom] = useState(initial?.positionSeconds ?? 0);

  // Where the last heartbeat left off, so the next delta is the gap between them rather than a
  // total. A ref because the interval must read the current value without being torn down and
  // rebuilt on every tick.
  const lastReportedAt = useRef<number | null>(null);

  const report = useCallback(
    (positionSeconds: number, durationSeconds: number, delta: number) => {
      // Fire and forget. A dropped heartbeat costs ten seconds of history; blocking playback on
      // it, or surfacing an error over the player, costs more than that.
      void recordPlayback(contentItemId, {
        positionSeconds,
        durationSeconds,
        playedDeltaSeconds: delta,
      }).catch(() => {});
    },
    [contentItemId],
  );

  // Open where they left off. Applied once metadata has loaded, because setting currentTime
  // before that is silently discarded by every browser.
  const applyResume = () => {
    const el = audioRef.current;
    if (!el || resumedFrom <= 0) return;

    // Not within a few seconds of the end: resuming a finished episode at 99% means pressing
    // play and hearing the outro.
    if (el.duration && resumedFrom >= el.duration - 5) return;

    el.currentTime = resumedFrom;
    setPosition(resumedFrom);
  };

  useEffect(() => {
    if (!playing) return;

    const tick = window.setInterval(() => {
      const el = audioRef.current;
      if (!el || el.paused) return;

      const now = el.currentTime;
      const previous = lastReportedAt.current ?? now;

      // Only forward movement counts, and only as much as the clock allows. Scrubbing forward
      // produces a jump the server would otherwise be asked to believe.
      const delta = Math.max(0, Math.min(now - previous, HEARTBEAT_SECONDS * 1.5));
      lastReportedAt.current = now;

      report(now, el.duration || duration, delta);
    }, HEARTBEAT_SECONDS * 1000);

    return () => window.clearInterval(tick);
  }, [playing, duration, report]);

  // A final report on pause and on unmount, so the last partial interval is not lost — which is
  // most of a short listen.
  const flush = useCallback(() => {
    const el = audioRef.current;
    if (!el) return;

    const previous = lastReportedAt.current;
    const delta = previous === null ? 0 : Math.max(0, Math.min(el.currentTime - previous, HEARTBEAT_SECONDS * 1.5));
    lastReportedAt.current = el.currentTime;

    report(el.currentTime, el.duration || duration, delta);
  }, [duration, report]);

  useEffect(() => flush, [flush]);

  if (!url) return null;

  const skip = (seconds: number) => {
    const el = audioRef.current;
    if (!el) return;

    el.currentTime = Math.max(0, Math.min(el.currentTime + seconds, el.duration || Infinity));
    setPosition(el.currentTime);
  };

  const toggle = () => {
    const el = audioRef.current;
    if (!el) return;

    if (el.paused) {
      void el.play();
    } else {
      el.pause();
      flush();
    }
  };

  const seekTo = (seconds: number) => {
    const el = audioRef.current;
    if (!el) return;

    el.currentTime = seconds;
    setPosition(seconds);
    lastReportedAt.current = seconds;
  };

  const progressPercent = duration > 0 ? Math.min(100, (position / duration) * 100) : 0;

  return (
    <div className="player" onClick={(e) => e.stopPropagation()}>
      <audio
        ref={audioRef}
        src={url}
        preload="metadata"
        onLoadedMetadata={(e) => {
          setDuration(e.currentTarget.duration || 0);
          applyResume();
        }}
        onTimeUpdate={(e) => setPosition(e.currentTarget.currentTime)}
        onPlay={() => {
          lastReportedAt.current = audioRef.current?.currentTime ?? 0;
          setPlaying(true);
        }}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false);
          flush();
        }}
      >
        Your browser does not support audio playback.
      </audio>

      {resumedFrom > 0 && position <= resumedFrom + 1 && (
        <div className="player__resumed">Picking up at {clockFor(resumedFrom)}</div>
      )}

      <div
        className="player__scrub"
        role="slider"
        tabIndex={0}
        aria-label="Seek"
        aria-valuemin={0}
        aria-valuemax={Math.round(duration)}
        aria-valuenow={Math.round(position)}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") skip(-15);
          if (e.key === "ArrowRight") skip(15);
        }}
        onClick={(e) => {
          if (duration <= 0) return;
          const box = e.currentTarget.getBoundingClientRect();
          seekTo(((e.clientX - box.left) / box.width) * duration);
        }}
      >
        <div className="player__scrub-fill" style={{ width: `${progressPercent}%` }} />
      </div>

      <div className="player__row">
        <button className="player__skip" onClick={() => skip(-15)} aria-label="Back 15 seconds">
          <Icon name="refresh" size={15} />
          <span>15</span>
        </button>

        <button className="player__play" onClick={toggle} aria-label={playing ? "Pause" : `Play ${title}`}>
          {playing ? (
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
              <path fill="currentColor" d="M6 5h4v14H6zM14 5h4v14h-4z" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
              <path fill="currentColor" d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>

        <button className="player__skip" onClick={() => skip(30)} aria-label="Forward 30 seconds">
          <Icon name="refresh" size={15} />
          <span>30</span>
        </button>

        <span className="player__clock">
          {clockFor(position)}
          {duration > 0 && ` / ${clockFor(duration)}`}
        </span>

        {/* Speed matters more on a forty-minute interview than anywhere else in the product. */}
        <button
          className="player__speed"
          onClick={() => {
            const next = SPEEDS[(SPEEDS.indexOf(speed as (typeof SPEEDS)[number]) + 1) % SPEEDS.length];
            setSpeed(next);
            if (audioRef.current) audioRef.current.playbackRate = next;
          }}
          aria-label="Playback speed"
        >
          {speed}×
        </button>
      </div>

      {/* Chapters, when the episode declared them. Not generated: a made-up chapter list is a
          claim about where the content changes. */}
      {chapters.length > 0 && (
        <div className="player__chapters">
          <div className="player__chapters-label">Chapters</div>
          {chapters.map((chapter, i) => {
            // The timestamp is a serialised TimeSpan from a feed somebody else wrote, so it is
            // not always one. An unparseable chapter is shown and not clickable, rather than
            // seeking silently to the start.
            const at = secondsFromTimestamp(chapter.timestamp);

            return (
              <button
                key={`${chapter.title}-${i}`}
                className="player__chapter"
                onClick={() => at != null && seekTo(at)}
                disabled={at == null}
                title={chapter.summary ?? undefined}
              >
                <span className="player__chapter-time">{at != null ? clockFor(at) : "—"}</span>
                <span className="player__chapter-title">{chapter.title}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
