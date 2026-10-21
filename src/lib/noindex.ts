/// Whether a build should ask search engines to stay away.
///
/// Staging is a near-identical copy of production. Left crawlable it competes with the real site
/// for the same queries, and someone searching for Radar can land on it without noticing — the
/// banner says STAGING, but people do not read banners they did not expect.
///
/// Until now the only thing keeping staging out of search results was Vercel's Deployment
/// Protection, which is a login wall. That is a fine default, but it also blocks the testers we
/// actually want, so the moment it comes off the site is open to crawlers too.
///
/// Two independent signals, because each fails differently:
///   - VERCEL_ENV comes from the platform and cannot be wrong, but is absent off Vercel.
///   - VITE_ENVIRONMENT is ours and travels with the build, but comes from a file that can be
///     stale or missing.
///
/// Either one saying "not production" is enough. Neither saying anything means a plain build with
/// no environment configured, which is what `npm run build` has always done — so it keeps today's
/// behaviour rather than silently de-indexing a self-hosted production deploy.
export function shouldBlockIndexing(
  vercelEnv: string | undefined,
  declaredEnv: string | undefined,
): boolean {
  if (vercelEnv && vercelEnv !== 'production') return true
  if (declaredEnv && declaredEnv !== 'production') return true
  return false
}

/// Served at /robots.txt. `noindex` in robots.txt is not honoured by Google — only `Disallow` is,
/// and only as a crawl instruction — so the meta tag in the HTML does the real work. This stops
/// the crawl before it starts.
export const DISALLOW_ALL = 'User-agent: *\nDisallow: /\n'

export const NOINDEX_META = '<meta name="robots" content="noindex, nofollow" />'
