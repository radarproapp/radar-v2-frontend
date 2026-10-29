import type { DocumentKind } from "./types";

/// Matching what somebody types to a kind Radar has a written standard for.
///
/// The screen offered seven chips and nothing else, which is the same thing the interests screen
/// did before it: forcing a fixed choice where the reader's own wording is better. Somebody with
/// a dissertation chapter, a funding bid or a README had to decide which of seven it was least
/// unlike.
///
/// But a typed category cannot simply become its own standard. A rubric is a written claim about
/// what good work looks like, which is why these are authored and reviewed rather than generated
/// — asking a model to invent the criteria and then apply them leaves nobody knowing what the
/// judgement was against, and two people typing the same words would be judged differently.
///
/// So typing is free and the match is to something real. What you type finds the standard that
/// fits it; when nothing fits, the screen says so rather than quietly assessing against the
/// nearest thing.

export interface DocumentKindOption {
  kind: DocumentKind;
  label: string;
  /// What this standard is for, shown so a reader can tell whether the match is right.
  covers: string;
  /// Other words people use for the same work. Matched, never displayed.
  aliases: string[];
}

export const DOCUMENT_KINDS: DocumentKindOption[] = [
  {
    kind: "Essay",
    label: "Essay",
    covers: "An argued piece of academic writing",
    aliases: ["argument", "term paper", "assignment", "coursework", "composition", "paper"],
  },
  {
    kind: "Report",
    label: "Report",
    covers: "A structured account of findings or work done",
    aliases: [
      "dissertation chapter", "thesis chapter", "project report", "field report",
      "lab report", "business report", "white paper", "case study", "analysis",
    ],
  },
  {
    kind: "Cv",
    label: "CV",
    covers: "A record of what you have done, for an application",
    aliases: ["resume", "curriculum vitae", "profile"],
  },
  {
    kind: "CoverLetter",
    label: "Cover letter",
    covers: "A letter making the case for you for one role",
    aliases: ["motivation letter", "application letter", "letter of interest"],
  },
  {
    kind: "PersonalStatement",
    label: "Personal statement",
    covers: "Your own account of why this course or programme",
    aliases: ["statement of purpose", "sop", "admissions essay", "motivation statement"],
  },
  {
    kind: "ResearchProposal",
    label: "Research proposal",
    covers: "A plan for research you intend to do",
    aliases: ["thesis proposal", "study design", "concept note", "research plan"],
  },
  {
    kind: "GrantApplication",
    label: "Grant or scholarship application",
    covers: "A case made to a funder for money",
    aliases: [
      "grant", "scholarship", "fellowship", "funding application", "bursary",
      "funding bid", "proposal to funder", "award application",
    ],
  },
  {
    kind: "BusinessPlan",
    label: "Business plan",
    covers: "The plan for how a venture works and makes money",
    aliases: ["business model", "venture plan", "startup plan", "feasibility study"],
  },
  {
    kind: "PitchDeck",
    label: "Pitch deck",
    covers: "Slides written to raise money or win a decision",
    aliases: ["pitch", "investor deck", "slides", "presentation", "deck", "fundraising deck"],
  },
  {
    kind: "TechnicalDocumentation",
    label: "Technical documentation",
    covers: "Writing that exists to be used, not read",
    aliases: ["readme", "api docs", "runbook", "user guide", "manual", "how-to", "setup guide"],
  },
  {
    kind: "LessonPlan",
    label: "Lesson plan",
    covers: "A plan for teaching something to somebody",
    aliases: ["teaching plan", "curriculum", "scheme of work", "syllabus", "training plan"],
  },
  {
    kind: "SocialMediaContent",
    label: "Social media content",
    covers: "A post, caption or thread written to be published",
    aliases: ["post", "caption", "thread", "tweet", "linkedin post", "content calendar", "copy"],
  },
];

/// Kinds matching what has been typed, best first.
///
/// A label match outranks an alias match, and a match at the start of a word outranks one in the
/// middle — so "pitch" finds Pitch deck before it finds anything that merely mentions pitching.
export function kindsMatching(query: string): DocumentKindOption[] {
  const typed = query.trim().toLowerCase();
  if (typed.length === 0) return DOCUMENT_KINDS;

  const scored = DOCUMENT_KINDS.map((option) => ({ option, score: scoreOf(option, typed) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.map((entry) => entry.option);
}

function scoreOf(option: DocumentKindOption, typed: string): number {
  const label = option.label.toLowerCase();

  if (label === typed) return 100;
  if (startsWord(label, typed)) return 80;
  if (label.includes(typed)) return 60;

  for (const alias of option.aliases) {
    const lower = alias.toLowerCase();

    if (lower === typed) return 50;
    if (startsWord(lower, typed)) return 40;
    if (lower.includes(typed)) return 20;
  }

  // What the standard covers, last. "money" finding the grant and the pitch standards is useful;
  // it should not outrank somebody typing the name of the thing they have.
  return option.covers.toLowerCase().includes(typed) ? 10 : 0;
}

/// Whether the text has the query at the start of one of its words.
///
/// Used for ranking, not for excluding. A substring match still counts, lower down - typing
/// "sume" should find "resume". That is the opposite of the rule used against the content
/// corpus, where a substring match on "art" pulls in everything "smart", and deliberately so:
/// here the whole list is twelve curated options and a loose match costs one extra row in a
/// dropdown somebody is choosing from. There, it costs a reader an article about tourism.
function startsWord(text: string, query: string): boolean {
  return text === query || text.startsWith(query) || text.includes(` ${query}`);
}
