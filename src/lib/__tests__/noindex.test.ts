import { describe, expect, it } from 'vitest'
import { shouldBlockIndexing } from '../noindex'

describe('shouldBlockIndexing', () => {
  it('leaves production alone', () => {
    expect(shouldBlockIndexing('production', 'production')).toBe(false)
  })

  it('blocks a Vercel preview even when the build calls itself production', () => {
    // The exact misconfiguration the environment banner shouts about: a staging-branch preview
    // with no Preview variables falls back to .env.production. The platform signal overrides it.
    expect(shouldBlockIndexing('preview', 'production')).toBe(true)
  })

  it('blocks a staging build off Vercel, where VERCEL_ENV is absent', () => {
    expect(shouldBlockIndexing(undefined, 'staging')).toBe(true)
    expect(shouldBlockIndexing('', 'staging')).toBe(true)
  })

  it('blocks custom environments, which Vercel also reports as preview', () => {
    expect(shouldBlockIndexing('preview', 'staging')).toBe(true)
  })

  it('does not de-index a plain build with nothing configured', () => {
    // `npm run build` with no environment has always produced an indexable site. Changing that
    // silently would cost production traffic with no visible symptom.
    expect(shouldBlockIndexing(undefined, undefined)).toBe(false)
    expect(shouldBlockIndexing('', '')).toBe(false)
  })
})
