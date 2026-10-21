import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],

  // Vercel's own build variables are not VITE_-prefixed, so Vite does not expose them to the app.
  // Forwarding them matters for one specific failure: a preview built from the staging branch
  // without Preview variables set falls back to the committed .env.production, so it points at the
  // production API and reports itself as production. Nothing in the UI would say otherwise.
  //
  // VERCEL_ENV comes from the platform rather than from a file, so it cannot be wrong in that way,
  // and it lets the banner catch the mismatch.
  define: {
    'import.meta.env.VITE_VERCEL_ENV': JSON.stringify(process.env.VERCEL_ENV ?? ''),
    'import.meta.env.VITE_GIT_BRANCH': JSON.stringify(process.env.VERCEL_GIT_COMMIT_REF ?? ''),
  },
})
