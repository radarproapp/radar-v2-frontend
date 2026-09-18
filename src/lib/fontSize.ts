// Per-device text size preference. Uses CSS zoom rather than a root font-size override because
// most of app.css sets font sizes in raw px (not rem), so scaling the root font-size alone
// wouldn't touch them — zoom scales the whole rendered page uniformly instead.
const STORAGE_KEY = "radar_font_scale";

export type FontScaleId = "sm" | "md" | "lg" | "xl";

export const FONT_SCALES: { id: FontScaleId; label: string; value: number }[] = [
  { id: "sm", label: "Small", value: 0.9 },
  { id: "md", label: "Default", value: 1 },
  { id: "lg", label: "Large", value: 1.15 },
  { id: "xl", label: "Extra large", value: 1.3 },
];

export function getFontScale(): FontScaleId {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && FONT_SCALES.some((s) => s.id === stored)) return stored as FontScaleId;
  } catch {
    // localStorage unavailable (private mode, etc.) — fall through to default
  }
  return "md";
}

export function applyFontScale(id: FontScaleId): void {
  const scale = FONT_SCALES.find((s) => s.id === id)?.value ?? 1;
  document.body.style.zoom = String(scale);
}

export function setFontScale(id: FontScaleId): void {
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // ignore — the scale just won't persist across reloads
  }
  applyFontScale(id);
}
