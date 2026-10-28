import { useCallback, useEffect, useRef, useState } from "react";
import { parseVideoUrl } from "../lib/video";
import { recordPlayback } from "../lib/api";
import {
  loadYouTubeApi,
  YT_ENDED,
  YT_PAUSED,
  YT_PLAYING,
  type YouTubePlayer,
} from "../lib/youtube-player";
import { clockFor } from "../lib/duration";
import { Icon } from "./Icon";
import type { PlaybackProgress } from "../lib/types";

/// A video that remembers where you stopped.
///
/// The audio player has done this since playback was recorded at all; video had not, because a
/// plain embed iframe cannot be asked for its position. I had described that as needing "the
/// IFrame API and a chunk of third-party script" and left it — but the IFrame API is YouTube's
/// documented way to do exactly this, so the gap was mine rather than the platform's.
///
/// Heartbeats work the way the audio player's do: a delta of seconds that actually elapsed while
/// playing, never a running total, so the server's clamp keeps "time watched" meaning watched.
/// A tab left open on a paused video and a seek to the end both add nothing.
///
/// Only YouTube. Vimeo needs its own SDK and a file needs none, so those keep the plain embed —
/// a player that claims to resume and does not is worse than one that never offered.

interface VideoPlayerProps {
  contentItemId: string;
  url: string | null | undefined;
  title: string;
  initial?: PlaybackProgress | null;
}

/// Matches PlaybackService.HeartbeatSeconds. The server clamps to twice this, so the two have to
/// agree or honest playback is discarded.
const HEARTBEAT_SECONDS = 10;

export function VideoPlayer({ contentItemId, url, title, initial }: VideoPlayerProps) {
  const mount = useRef<HTMLDivElement>(null);
  const player = useRef<YouTubePlayer | null>(null);
  const lastReportedAt = useRef<number | null>(null);

  const [playing, setPlaying] = useState(false);
  const [started, setStarted] = useState(false);
  const [failed, setFailed] = useState(false);

  const source = parseVideoUrl(url);
  const resumeFrom = initial?.positionSeconds ?? 0;

  const report = useCallback(
    (position: number, duration: number, delta: number) => {
      void recordPlayback(contentItemId, {
        positionSeconds: position,
        durationSeconds: duration,
        playedDeltaSeconds: delta,
      }).catch(() => {});
    },
    [contentItemId],
  );

  const flush = useCallback(() => {
    const api = player.current;
    if (!api) return;

    try {
      const now = api.getCurrentTime();
      const previous = lastReportedAt.current;
      const delta =
        previous === null ? 0 : Math.max(0, Math.min(now - previous, HEARTBEAT_SECONDS * 1.5));

      lastReportedAt.current = now;
      report(now, api.getDuration(), delta);
    } catch {
      // The player can be gone mid-teardown. Losing the last ten seconds of history is not worth
      // an error on the page.
    }
  }, [report]);

  // Built only once the user asks, so a page of videos does not create a player per row.
  const start = async () => {
    if (!source || source.kind !== "youtube" || !mount.current) return;

    setStarted(true);

    try {
      const api = await loadYouTubeApi();

      player.current = new api.Player(mount.current, {
        // The API replaces the element it is given, so the new iframe does not inherit the class
        // that was sizing it. Without these it renders at the default 300x150 inside a container
        // expecting it to fill — which is how swapping the plain embed for this player stopped
        // videos displaying at all.
        width: "100%",
        height: "100%",
        videoId: source.id,
        playerVars: {
          rel: 0,
          autoplay: 1,
          // Resume handled here rather than with a start= param, because that would also reset
          // the position every time React re-rendered the embed.
          start: Math.floor(resumeFrom),
        },
        events: {
          onReady: (event) => {
            lastReportedAt.current = event.target.getCurrentTime();
          },
          onStateChange: (event) => {
            if (event.data === YT_PLAYING) {
              lastReportedAt.current = event.target.getCurrentTime();
              setPlaying(true);
              return;
            }

            if (event.data === YT_PAUSED || event.data === YT_ENDED) {
              setPlaying(false);
              flush();
            }
          },
        },
      });
    } catch {
      // The API did not load — an extension, a blocked domain, a flaky network. The plain embed
      // below still plays; it just will not remember the position, and saying so beats a blank
      // rectangle.
      setFailed(true);
    }
  };

  useEffect(() => {
    if (!playing) return;

    const tick = window.setInterval(() => {
      const api = player.current;
      if (!api) return;

      try {
        const now = api.getCurrentTime();
        const previous = lastReportedAt.current ?? now;

        // Forward movement only, and only as much as the clock allows: seeking forward produces a
        // jump the server would otherwise be asked to believe.
        const delta = Math.max(0, Math.min(now - previous, HEARTBEAT_SECONDS * 1.5));
        lastReportedAt.current = now;

        report(now, api.getDuration(), delta);
      } catch {
        // Ignored; the next tick will either work or the player is gone.
      }
    }, HEARTBEAT_SECONDS * 1000);

    return () => window.clearInterval(tick);
  }, [playing, report]);

  // A last report on unmount, so navigating away mid-video keeps the position.
  useEffect(
    () => () => {
      flush();
      try {
        player.current?.destroy();
      } catch {
        // Already gone.
      }
      player.current = null;
    },
    [flush],
  );

  if (!source) {
    if (!url) return null;

    return (
      <a className="video-embed video-embed--link" href={url} target="_blank" rel="noreferrer noopener">
        <Icon name="play" size={13} /> Watch on the source site
      </a>
    );
  }

  // Anything that is not YouTube keeps the plain embed: a player that claims to resume and cannot
  // is worse than one that never offered.
  if (source.kind !== "youtube" || failed) {
    return (
      <div className="video-embed video-embed--frame">
        <iframe
          className="video-embed__media"
          src={source.kind === "file" ? undefined : source.embedUrl}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          loading="lazy"
        />
      </div>
    );
  }

  if (!started) {
    return (
      <div className="video-player">
        <button className="video-embed video-embed--poster" onClick={start} aria-label={`Play ${title}`}>
          <img src={source.posterUrl} alt="" loading="lazy" />
          <span className="video-embed__play" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="26" height="26">
              <path fill="currentColor" d="M8 5v14l11-7z" />
            </svg>
          </span>
          <span className="video-embed__badge">YouTube</span>
        </button>

        {/* Said before pressing play, so the offer is visible rather than a surprise. */}
        {resumeFrom > 5 && (
          <div className="video-player__resume">
            <Icon name="time" size={13} /> Picks up at {clockFor(resumeFrom)}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="video-player">
      <div className="video-embed video-embed--frame">
        {/* The sizing lives on the wrapper, because the API replaces the node inside it and the
            replacement carries none of its classes. */}
        <div className="video-embed__media">
          <div ref={mount} />
        </div>
      </div>
    </div>
  );
}
