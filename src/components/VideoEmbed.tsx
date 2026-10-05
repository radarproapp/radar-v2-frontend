import { useState } from "react";
import { parseVideoUrl } from "../lib/video";

interface VideoEmbedProps {
  url: string | null | undefined;
  title: string;
}

/// Click-to-play video. The poster keeps the list light — no iframe is loaded until the
/// user actually starts a clip — and playing happens inline rather than bouncing to the
/// source site. Renders nothing playable (a plain link) when the URL isn't a video.
export function VideoEmbed({ url, title }: VideoEmbedProps) {
  const source = parseVideoUrl(url);
  const [playing, setPlaying] = useState(false);

  if (!source) {
    if (!url) return null;
    return (
      <a className="video-embed video-embed--link" href={url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>
        ▶ Watch on the source site
      </a>
    );
  }

  if (source.kind === "file") {
    return (
      <div className="video-embed" onClick={(e) => e.stopPropagation()}>
        <video className="video-embed__media" controls preload="metadata" playsInline>
          <source src={source.src} />
        </video>
      </div>
    );
  }

  if (!playing) {
    return (
      <button
        type="button"
        className="video-embed video-embed--poster"
        onClick={(e) => {
          e.stopPropagation();
          setPlaying(true);
        }}
        aria-label={`Play ${title}`}
      >
        {source.kind === "youtube" && <img src={source.posterUrl} alt="" loading="lazy" />}
        <span className="video-embed__play" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="26" height="26">
            <path fill="currentColor" d="M8 5v14l11-7z" />
          </svg>
        </span>
        <span className="video-embed__badge">{source.kind === "youtube" ? "YouTube" : "Vimeo"}</span>
      </button>
    );
  }

  return (
    <div className="video-embed video-embed--frame" onClick={(e) => e.stopPropagation()}>
      <iframe
        className="video-embed__media"
        src={source.embedUrl}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        loading="lazy"
      />
    </div>
  );
}
