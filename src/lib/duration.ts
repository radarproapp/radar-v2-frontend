/// Reading and summing the human-written durations on roadmap lessons.
///
/// `estimatedTime` is free text written by whatever produced the lesson — a template, or the LLM.
/// In practice it arrives as "20 min", "1 hr", "45 minutes", "1h 30m" or "2 hours". A section
/// header that wants to read "10 / 27 · 3hr 12min" has to add those up, so they have to be parsed.
///
/// Anything unparseable returns null rather than 0. The difference matters: a section of six
/// lessons with no stated times should say nothing about duration, not claim it takes no time.

const UNIT_PATTERN = /(\d+(?:\.\d+)?)\s*(hours?|hrs?|h|minutes?|mins?|m)\b/gi;

function isHour(unit: string): boolean {
  return unit.startsWith("h");
}

/// Minutes in a single duration string, or null when there is no number and unit to read.
///
/// Handles compound forms ("1h 30m") by summing every unit it finds, so "1 hr 30 min" is 90 and
/// not 1. A bare number with no unit is rejected: "3" could be minutes, hours or lesson three.
export function parseMinutes(text: string | null | undefined): number | null {
  if (!text) return null;

  let total = 0;
  let found = false;

  for (const match of text.matchAll(UNIT_PATTERN)) {
    const value = Number.parseFloat(match[1]);
    if (!Number.isFinite(value)) continue;

    const unit = match[2].toLowerCase();
    total += isHour(unit) ? value * 60 : value;
    found = true;
  }

  return found ? Math.round(total) : null;
}

/// Sums a list of duration strings, ignoring the ones it cannot read.
///
/// Returns null only when nothing at all was readable, so a section where four of six lessons
/// state a time still shows the total of those four rather than going silent.
export function sumMinutes(texts: (string | null | undefined)[]): number | null {
  let total = 0;
  let found = false;

  for (const text of texts) {
    const minutes = parseMinutes(text);
    if (minutes === null) continue;
    total += minutes;
    found = true;
  }

  return found ? total : null;
}

/// Compact duration, in the shape course players use: "48min", "3hr 12min", "2hr".
export function formatDuration(minutes: number | null): string | null {
  if (minutes === null || minutes <= 0) return null;

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours === 0) return `${mins}min`;
  if (mins === 0) return `${hours}hr`;
  return `${hours}hr ${mins}min`;
}
