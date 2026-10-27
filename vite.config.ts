import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import { DISALLOW_ALL, NOINDEX_META, shouldBlockIndexing } from './src/lib/noindex.js'

/// Keeps non-production builds out of search results.
///
/// Emits both a robots.txt and a meta tag, because they do different jobs: Disallow stops a
/// well-behaved crawler fetching the page, while the meta tag is what actually drops a URL that
/// was already discovered some other way (a shared link, a backlink). Neither alone is enough.
function blockIndexingOutsideProduction(blocked: boolean): Plugin {
  return {
    name: 'radar:block-indexing-outside-production',
    apply: 'build',

    transformIndexHtml(html) {
      if (!blocked) return html
      return html.replace('</head>', `  ${NOINDEX_META}\n  </head>`)
    },

    generateBundle() {
      if (!blocked) return
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: DISALLOW_ALL })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Vercel's own build variables are not VITE_-prefixed, so Vite does not expose them to the app.
  // Forwarding them matters for one specific failure: a preview built from the staging branch
  // without Preview variables set falls back to the committed .env.production, so it points at the
  // production API and reports itself as production. Nothing in the UI would say otherwise.
  //
  // VERCEL_ENV comes from the platform rather than from a file, so it cannot be wrong in that way,
  // and it lets the banner catch the mismatch.
  const vercelEnv = process.env.VERCEL_ENV ?? ''
  const branch = process.env.VERCEL_GIT_COMMIT_REF ?? ''

  // Vercel environment variables are already in process.env; loadEnv adds the committed .env
  // files for the mode being built, which is how a local `build:staging` is recognised.
  const declaredEnv =
    process.env.VITE_ENVIRONMENT ?? loadEnv(mode, process.cwd(), 'VITE_').VITE_ENVIRONMENT ?? ''

  return {
    plugins: [react(), blockIndexingOutsideProduction(shouldBlockIndexing(vercelEnv, declaredEnv))],

    define: {
      'import.meta.env.VITE_VERCEL_ENV': JSON.stringify(vercelEnv),
      'import.meta.env.VITE_GIT_BRANCH': JSON.stringify(branch),
    },

    // Render tests need a DOM. Until this was here there were none, across 38 pages — which is
    // how a player with no transport controls and a profile page of nine hardcoded zeros both
    // sat behind a passing suite.
    //
    // Only the files that need it pay for jsdom: the lib tests are pure functions and starting a
    // DOM for them would slow the suite for nothing.
    test: {
      environmentMatchGlobs: [
        ['**/__tests__/*.render.test.tsx', 'jsdom'],
      ],
      setupFiles: ['./src/test/setup.ts'],
    },
  }
})
