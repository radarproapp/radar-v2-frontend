import { ALL_INTERESTS } from "./interests";
import type { PersonaType } from "./types";

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

/// The pool behind box 1. The same list the profile editor offers, by construction rather than
/// by coincidence - the two were derived separately and happened to match.
export const INTEREST_SUGGESTIONS: string[] = ALL_INTERESTS;

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

/// What is in somebody's way, for the third box.
///
/// Written as a reader would say it, in the first person, because that is how the box is answered
/// and because a challenge phrased as a category ("skills gap") is a label rather than a problem.
/// These are starting points — the box takes anything typed, and what somebody types about their
/// own situation will always be better than this list.
///
/// Spread across what actually stops people at each level: students stuck on the work itself,
/// graduates stuck at the door, professionals stuck in place.
export const CHALLENGE_SUGGESTIONS: string[] = [
  "I don't know where to start",
  "I have no portfolio to show",
  "I keep getting rejected",
  "I have no experience in the field",
  "I can't find the right opportunities",
  "I don't have the right qualifications",
  "I can't afford the course or programme",
  "I don't know anyone in the industry",
  "I struggle to finish what I start",
  "I don't have enough time to study",
  "My skills feel out of date",
  "I am not sure this is the right path",
  "I find the subject difficult",
  "I don't know how to write applications",
  "I have been in the same role too long",
  "I cannot get funding for my business",
  "I don't know how to price my work",
  "English academic writing is hard for me",
];

/// The older third box: which kinds of opportunity to watch for.
///
/// Nothing asks for this any more — opportunities are worked out from the goals and challenges
/// instead. Kept because profiles that answered it still carry the answer and it is still
/// honoured where it is set.
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

/// The three categories the spec names, and the stored value each one is.
///
/// "Professional" is YoungProfessional in storage: the enum is persisted by value and carries
/// two more cases that predate the three-category guide, so renaming it would relabel every
/// profile already saved. The label is what the spec calls it; the value is what it has always
/// been.
export const CATEGORIES: { value: PersonaType; label: string; description: string }[] = [
  { value: "Student", label: "Student", description: "Studying now" },
  { value: "Graduate", label: "Graduate", description: "Finished, looking" },
  { value: "YoungProfessional", label: "Professional", description: "Working" },
];
