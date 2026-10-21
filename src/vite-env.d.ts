/// <reference types="vite/client" />

// Forwarded from Vercel's build environment in vite.config.ts. Not VITE_-prefixed at source, so
// Vite does not expose them without the explicit define.
interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_ENVIRONMENT?: string;
  readonly VITE_VERCEL_ENV?: string;
  readonly VITE_GIT_BRANCH?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
