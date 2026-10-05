export type ParsedVideo =
  | { kind: "youtube"; id: string; embedUrl: string; posterUrl: string }
  | { kind: "vimeo"; id: string; embedUrl: string }
  | { kind: "file"; src: string };

/// Turns a stored content URL into something playable. Returns null when the URL is not a
/// recognisable video source (the caller then falls back to a normal link).
export function parseVideoUrl(raw: string | null | undefined): ParsedVideo | null {
  if (!raw) return null;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^www\./, "");
  const youtube = (id: string): ParsedVideo => ({
    kind: "youtube",
    id,
    embedUrl: `https://www.youtube-nocookie.com/embed/${id}?rel=0&autoplay=1`,
    posterUrl: `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
  });

  if (host === "youtu.be") {
    const id = url.pathname.split("/").filter(Boolean)[0];
    return id ? youtube(id) : null;
  }
  if (host.endsWith("youtube.com")) {
    const path = url.pathname.split("/").filter(Boolean);
    const id =
      url.searchParams.get("v") ??
      (path[0] === "shorts" || path[0] === "embed" || path[0] === "live" ? path[1] : null);
    return id ? youtube(id) : null;
  }
  if (host.endsWith("vimeo.com")) {
    const id = url.pathname.split("/").filter(Boolean)[0];
    return id ? { kind: "vimeo", id, embedUrl: `https://player.vimeo.com/video/${id}?autoplay=1` } : null;
  }
  if (/\.(mp4|webm|ogg|ogv|mov|m4v)$/i.test(url.pathname)) {
    return { kind: "file", src: raw };
  }
  return null;
}
