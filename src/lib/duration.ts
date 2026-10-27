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

/// Seconds from a chapter timestamp, or null when it is not one.
///
/// Chapters arrive as a serialised TimeSpan — "00:14:32", sometimes "14:32", occasionally
/// something else entirely because the value came from an RSS feed somebody else wrote. Null
/// rather than zero for anything unparseable: a chapter that silently seeks to the start is worse
/// than one that is visibly not clickable.
export function secondsFromTimestamp(timestamp: string | null | undefined): number | null {
  if (!timestamp) return null;

  const parts = timestamp.trim().split(":");
  if (parts.length < 2 || parts.length > 3) return null;

  const numbers = parts.map((part) => Number(part));
  if (numbers.some((n) => !Number.isFinite(n) || n < 0)) return null;

  const [hours, minutes, seconds] = numbers.length === 3 ? numbers : [0, numbers[0], numbers[1]];

  // Minutes and seconds past 59 mean the string was not a timestamp — a duration in minutes, a
  // byte offset, a year. Better to leave the chapter unclickable than to seek somewhere arbitrary.
  if (minutes > 59 || seconds > 59) return null;

  return hours * 3600 + minutes * 60 + seconds;
}

/// Seconds as the length of time a person would say out loud.
///
/// "4h 12m", "38m", "45s". Not "0h 38m", and not "252 minutes": the graph headline is read at a
/// glance and a unit nobody uses conversationally makes it slower to read, not more precise.
export function hoursAndMinutes(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0m";

  const total = Math.round(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);

  if (hours > 0) return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  if (minutes > 0) return `${minutes}m`;

  // Under a minute is still worth distinguishing from nothing: it means they pressed play.
  return `${total}s`;
}

/// A playback clock: "1:05", "1:02:05". Hours only when there are hours.
///
/// Separate from hoursAndMinutes because they answer different questions. This one tracks a
/// moving position and has to be the same width at 0:59 and 1:00, so it is zero-padded and
/// tabular; that one is a total read at a glance.
export function clockFor(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";

  const whole = Math.floor(seconds);
  const hours = Math.floor(whole / 3600);
  const minutes = Math.floor((whole % 3600) / 60);
  const secs = whole % 60;

  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`
    : `${minutes}:${String(secs).padStart(2, "0")}`;
}
