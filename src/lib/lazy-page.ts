import { lazy, type ComponentType } from "react";

/// Loading a page's code, across a deploy.
///
/// Vite puts a content hash in every chunk filename, so each deploy writes new ones and the old
/// ones stop being served. A browser that loaded index.html before the deploy still holds the
/// old filenames, so the moment somebody navigates to a route whose code has not been fetched
/// yet, it asks for a file that is no longer there. Nothing is wrong with their account, their
/// connection or the new build - they are simply holding yesterday's map.
///
/// Reported from production as a crash screen reading "Failed to fetch dynamically imported
/// module: https://www.radarproapp.com/assets/LearnPath-DHvFAcaE.js", which is developer text in
/// front of a user, on a failure that fixes itself.
///
/// So: try again once in case it was the network, then reload the page, which fetches the
/// current index.html and with it the current filenames. The reload is allowed once per session,
/// because a reload loop is worse than an error screen - if the fresh HTML still cannot load the
/// chunk, something is actually broken and the boundary should say so in words.

/// Set the moment a reload is triggered, so a second failure is known to be a real one.
const RELOADED = "radar:reloaded-for-stale-build";

/// How long to wait before the one retry. Long enough for a blip, short enough not to look hung.
const BeforeRetrying = 350;

/// What a browser says when the file is not there any more.
///
/// Each engine words it differently, and the only thing they share is that none of them says
/// anything a user should read. Chrome and Firefox: "Failed to fetch dynamically imported
/// module". Safari: "Importing a module script failed". Webpack-era bundlers: "ChunkLoadError".
const STALE_BUILD = [
  "failed to fetch dynamically imported module",
  "error loading dynamically imported module",
  "importing a module script failed",
  "chunkloaderror",
  "loading chunk",
  "unable to preload css",
];

/// Whether this is a page that has moved rather than a page that is broken.
export function isStaleBuild(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? "");
  const lowered = message.toLowerCase();

  return STALE_BUILD.some((phrase) => lowered.includes(phrase));
}

/// Whether a reload has already been spent this session.
///
/// sessionStorage rather than a module variable: the reload wipes the module, so a variable
/// would be back to false on the other side and the next failure would reload again, forever.
export function hasReloadedForStaleBuild(): boolean {
  try {
    return window.sessionStorage.getItem(RELOADED) === "1";
  } catch {
    // Private mode, or storage disabled. Treat it as spent rather than risk the loop.
    return true;
  }
}

function spendTheReload(): void {
  try {
    window.sessionStorage.setItem(RELOADED, "1");
  } catch {
    // Nothing to do. The catch above returns true when it cannot read, so the loop is still
    // bounded - this session simply never gets its automatic reload.
  }
}

/// Clears the mark once a page has loaded successfully, so a later deploy gets its own reload.
export function clearStaleBuildReload(): void {
  try {
    window.sessionStorage.removeItem(RELOADED);
  } catch {
    // Storage is unavailable; there is nothing to clear.
  }
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/// A lazily-loaded page that survives a deploy.
///
/// Used in place of React's `lazy` for every route. The signature is the same, so a route reads
/// no differently for being resilient.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function lazyPage<T extends ComponentType<any>>(
  load: () => Promise<{ default: T }>,
) {
  return lazy(async () => {
    try {
      const loaded = await load();
      clearStaleBuildReload();
      return loaded;
    } catch (first) {
      if (!isStaleBuild(first)) throw first;

      // Once, in case it was the connection rather than the deploy.
      try {
        await wait(BeforeRetrying);
        const loaded = await load();
        clearStaleBuildReload();
        return loaded;
      } catch (second) {
        if (!isStaleBuild(second) || hasReloadedForStaleBuild()) throw second;

        spendTheReload();
        window.location.reload();

        // The reload is not instant, and returning would render a page from the old build in
        // the meantime. Nothing ever settles this, which leaves the Suspense fallback on screen
        // until the navigation happens - which is what somebody waiting for a page expects to
        // see, rather than an error that is about to disappear.
        return new Promise<{ default: T }>(() => {});
      }
    }
  });
}
