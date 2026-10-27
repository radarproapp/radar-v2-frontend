import { INTEREST_GROUPS } from "./interests";

/// Suggestions for the three personalisation boxes.
///
/// These are starting points, not a menu. The implementation guide is firm about it — "do not
/// force users to choose from fixed options when their own wording is more appropriate" — so
/// every box accepts anything typed, and these only exist to save keystrokes.
///
/// Interests draw on the 235-entry subject catalogue already used by the learning path builder,
/// flattened: someone personalising a feed thinks in subjects, not in the groups the catalogue
/// organises them into.
///
/// Goals and opportunities have no catalogue, so these come from the guide's own examples. They
/// are deliberately phrased the way a person would say them out loud rather than as categories.

export const INTEREST_SUGGESTIONS: string[] = (() => {
  const seen = new Set<string>();
  const flat: string[] = [];

  for (const [, subjects] of INTEREST_GROUPS) {
    for (const subject of subjects) {
      const key = subject.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      flat.push(subject);
    }
  }

  return flat;
})();

export const GOAL_SUGGESTIONS: string[] = [
  "Find a job",
  "Learn a new skill",
  "Get a scholarship",
  "Advance my career",
  "Improve academically",
  "Grow my business",
  "Conduct research",
  "Prepare for exams",
  "Change career",
  "Build a portfolio",
  "Get a promotion",
  "Study abroad",
];

export const OPPORTUNITY_SUGGESTIONS: string[] = [
  "Jobs and internships",
  "Scholarships",
  "Grants and funding",
  "Courses and certifications",
  "Research opportunities",
  "Competitions",
  "Business partnerships",
  "Contracts and tenders",
  "Conferences and events",
  "Graduate programmes",
  "Fellowships",
  "Volunteering",
];

/// Suggestions that match what has been typed and are not already chosen.
///
/// Matches anywhere in the string rather than only at the start: someone typing "engineer"
/// should be offered Civil Engineering, which no prefix match would ever surface.
export function suggestionsFor(
  pool: string[],
  query: string,
  chosen: string[],
  limit = 8,
): string[] {
  const taken = new Set(chosen.map((c) => c.toLowerCase()));
  const term = query.trim().toLowerCase();

  const available = pool.filter((item) => !taken.has(item.toLowerCase()));
  if (!term) return available.slice(0, limit);

  return available.filter((item) => item.toLowerCase().includes(term)).slice(0, limit);
}

/// Whether what has been typed is worth offering as its own answer.
///
/// Only when it is not already chosen and is not an exact match for a suggestion already on
/// screen — otherwise the same words appear twice and one of them does nothing different.
export function canAddCustom(query: string, chosen: string[], suggestions: string[]): boolean {
  const term = query.trim();
  if (term.length < 2) return false;

  const lower = term.toLowerCase();
  return (
    !chosen.some((c) => c.toLowerCase() === lower) &&
    !suggestions.some((s) => s.toLowerCase() === lower)
  );
}
