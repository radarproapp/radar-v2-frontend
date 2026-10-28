# Radar brand assets

Extracted from the V1 PWA repo (`Mickercode/radar-pwa`), `public/assets/`.

| File | What it is | Source size |
| --- | --- | --- |
| `radar-mark.png` | The R mark alone, on navy | 400 × 400 |
| `radar-wordmark.png` | `R | Radar` lockup, on navy | 800 × 400 |
| `radar-lockup.png` | Small centred wordmark, on navy | 400 × 400 |

Converted from JPEG to PNG. A logo is flat brand colour against a flat background, which is the
case JPEG handles worst — it rings at the edges of the mark. Nothing was resampled, so these are
the originals at their original resolution.

## The app icons

`/favicon.png`, `/icon-192.png`, `/icon-512.png` and `/apple-touch-icon.png` are generated from
`radar-mark.png`, which is the square asset.

V1 pointed its `apple-touch-icon` at the 800 × 400 wordmark. Apple expects a square and crops or
letterboxes anything else, so that icon arrived clipped. Regenerating from the mark fixes it.

## What is missing, and why it matters

**These are dark-background logos.** The wordmark text is light grey, drawn to sit on the navy.
Keying the navy out of the JPEGs was tried and produced two unusable files: a white fringe from
JPEG artefacts around the mark, and a wordmark that is near-invisible on a light page.

So there is no transparent or light-background version here, and one cannot be made honestly from
these files. It needs the original vector — an SVG or the design source — from whoever drew it.
Until then, use these only where the background is the brand navy.

That is why the marketing navigation still draws its own `R` in CSS rather than using
`radar-wordmark.png`: the nav is light, and dropping a navy rectangle into it would look worse
than the approximation it replaces.
