import type { IconName } from "../components/icon-map";

/// Short pointers to what Radar can do, and the picker that rotates them.
///
/// Split from the component so the choosing logic can be tested without rendering, the same way
/// icon-map is split from Icon.

export interface Guidance {
  id: string;
  icon: IconName;
  title: string;
  body: string;
  action: string;
  path: string;
}

/// Each one names something Radar actually does. Nothing aspirational, nothing unbuilt — a tip
/// that turns out to be untrue costs more than the empty space it filled.
export const GUIDANCE: Guidance[] = [
  {
    id: "one-subject",
    icon: "explore",
    title: "Start with one subject",
    body: "Radar builds your path a section at a time. Pick what you want to learn next, not everything you study.",
    action: "Build a section",
    path: "/learn/build",
  },
  {
    id: "own-material",
    icon: "upload",
    title: "Bring your own material",
    body: "A lecture handout, a past paper, an article. Radar reads it and pulls out what matters.",
    action: "Upload something",
    path: "/ask?mode=upload",
  },
  {
    id: "ask",
    icon: "chat",
    title: "Ask from anywhere",
    body: "Ask Radar is a verb, not a place. It already knows your path and what is in your feed.",
    action: "Ask Radar",
    path: "/ask",
  },
  {
    id: "feed",
    icon: "article",
    title: "Your feed follows what you pick",
    body: "Every subject you add and every item you save changes what Radar brings you next.",
    action: "Open your feed",
    path: "/feed",
  },
  {
    id: "capture",
    icon: "inbox",
    title: "Capture it now, read it later",
    body: "Paste a link the moment you see it. Radar works out why it matters to you.",
    action: "Capture something",
    path: "/capture",
  },
  {
    id: "notes",
    icon: "note",
    title: "Notes sit beside your reading",
    body: "Write while you read rather than somewhere else you will forget to open.",
    action: "Open notes",
    path: "/notebook",
  },
  {
    id: "opportunities",
    icon: "job",
    title: "Opportunities, matched and dated",
    body: "Scholarships, jobs and programmes, with how well each fits and how long is left.",
    action: "See opportunities",
    path: "/opportunities",
  },
  {
    id: "projects",
    icon: "build",
    title: "Evidence beats a claim",
    body: "Finish one small thing you can show. It proves more than three half-read courses.",
    action: "Open projects",
    path: "/projects",
  },
  {
    id: "weekly",
    icon: "deadline",
    title: "One brief a week",
    body: "What moved in your field over seven days, in a single read.",
    action: "Read the brief",
    path: "/weekly",
  },
  {
    id: "mentor",
    icon: "idea",
    title: "Stuck on something",
    body: "The mentor explains a concept at your level and tests whether it landed.",
    action: "Ask the mentor",
    path: "/mentor",
  },
];

/// Fisher-Yates, seeded by nothing in particular — a different few each visit is the point.
export function pickGuidance(count: number, exclude: string[]): Guidance[] {
  const pool = GUIDANCE.filter((card) => !exclude.includes(card.id));
  const shuffled = [...pool];

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled.slice(0, count);
}

