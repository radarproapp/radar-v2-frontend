import { useState } from "react";
import type { OnboardingQuestion } from "./types";

/// The rules about answers that both the page and its tests need.
///
/// Separate from the component that renders them so a fast refresh of the UI does not reload
/// these, and so the page and the tests agree on what "enough" means rather than each deciding.

/// Whether there is enough here to submit.
///
/// Deliberately lenient: one answer anywhere is enough. The brief wants onboarding fast and
/// expects Radar to learn the rest from behaviour, so a screen that refuses to proceed until
/// every question is answered is the screen people abandon.
export function hasEnoughToSubmit(answers: Record<string, string[]>): boolean {
  return Object.values(answers).some((picked) => picked.length > 0);
}

/// Only the questions that were actually answered.
///
/// An absent key leaves that answer alone on the server, which is what makes a half-finished
/// onboarding resumable. Sending every key with an empty array would instead clear the lot — the
/// same payload meaning the opposite thing.
export function answeredOnly(answers: Record<string, string[]>): Record<string, string[]> {
  return Object.fromEntries(Object.entries(answers).filter(([, picked]) => picked.length > 0));
}

/// A blank answer sheet for a set of questions, so controlled inputs start defined.
export function useAnswers(questions: OnboardingQuestion[]) {
  const [answers, setAnswers] = useState<Record<string, string[]>>(() =>
    Object.fromEntries(
      questions.flatMap((question) => question.fields.map((field) => [field.id, [] as string[]])),
    ),
  );

  return { answers, setAnswers };
}
