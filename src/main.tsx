import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/app.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary.tsx'
import { applyFontScale, getFontScale } from './lib/fontSize.ts'

applyFontScale(getFontScale())

// PWA caching was retired: the cache-first service worker pinned returning users to
// old bundles across deploys. Stop registering it, and clean up any worker/caches a
// previous build installed so every load fetches the current bundle. Clients whose
// old bundle never runs this still recover via the self-destructing /sw.js.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  navigator.serviceWorker
    .getRegistrations()
    .then((registrations) => registrations.forEach((registration) => registration.unregister()))
    .catch(() => {})
  if ('caches' in window) {
    caches
      .keys()
      .then((keys) => keys.forEach((key) => caches.delete(key)))
      .catch(() => {})
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
