/// Loading YouTube's IFrame Player API, once per page.
///
/// A plain `<iframe src="/embed/...">` cannot be asked where it is, so closing the tab lost your
/// place in a video while podcasts resumed correctly. I had written that off as needing "a chunk
/// of third-party script" — but the IFrame API *is* YouTube's documented way to do this, so the
/// honest position is that it needed the supported API and I had not reached for it.
///
/// Loaded on demand rather than in index.html: most sessions never open a video, and a script tag
/// everybody pays for to serve the ones who do is the wrong trade.

/// The subset of the player we use. Hand-written rather than pulled from @types/youtube, which
/// would add a dependency for six method signatures.
export interface YouTubePlayer {
  getCurrentTime(): number;
  getDuration(): number;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  getPlayerState(): number;
  destroy(): void;
}

/// YouTube's own state numbers. Named because `1` means nothing at a call site.
export const YT_PLAYING = 1;
export const YT_PAUSED = 2;
export const YT_ENDED = 0;

interface YouTubeApi {
  Player: new (
    element: HTMLElement | string,
    options: {
      videoId: string;
      /// The iframe the API creates replaces the node it was given and carries none of its
      /// classes, so its size has to be stated here rather than left to CSS.
      width?: string | number;
      height?: string | number;
      playerVars?: Record<string, string | number>;
      events?: {
        onReady?: (event: { target: YouTubePlayer }) => void;
        onStateChange?: (event: { data: number; target: YouTubePlayer }) => void;
      };
    },
  ) => YouTubePlayer;
}

declare global {
  interface Window {
    YT?: YouTubeApi;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let loading: Promise<YouTubeApi> | null = null;

/// Resolves once the API is usable. Safe to call from several players at once.
///
/// The promise is cached, so the second video on a page does not insert a second script tag or
/// wait for a callback that already fired.
export function loadYouTubeApi(): Promise<YouTubeApi> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (loading) return loading;

  loading = new Promise<YouTubeApi>((resolve, reject) => {
    // YouTube calls this global when the script finishes. It is the only handshake the API
    // offers, so it has to be set before the script is appended.
    window.onYouTubeIframeAPIReady = () => {
      if (window.YT?.Player) resolve(window.YT);
      else reject(new Error("YouTube IFrame API loaded without a Player."));
    };

    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    script.async = true;
    script.onerror = () => {
      // Reset so a later attempt can retry rather than waiting on a dead promise forever.
      loading = null;
      reject(new Error("Could not load the YouTube IFrame API."));
    };

    document.head.appendChild(script);
  });

  return loading;
}
