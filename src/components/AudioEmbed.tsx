interface AudioEmbedProps {
  url: string | null | undefined;
  title: string;
}

/// Inline podcast player. Renders nothing when the episode has no audio enclosure, so callers can
/// drop it in unconditionally for podcast-typed items.
export function AudioEmbed({ url, title }: AudioEmbedProps) {
  if (!url) return null;
  return (
    <div className="audio-embed" onClick={(e) => e.stopPropagation()}>
      <div className="audio-embed__label">▶ {title}</div>
      <audio className="audio-embed__player" controls preload="metadata" src={url}>
        Your browser does not support audio playback.
      </audio>
    </div>
  );
}
