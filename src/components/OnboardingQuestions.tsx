import type { OnboardingField, OnboardingQuestion } from "../lib/types";

/// The three questions, rendered from what the server serves.
///
/// Nothing here knows what the options are. That is the point: the answer text is the term the
/// feed is matched on, so a copy of the list living in this app is a copy that can drift from the
/// server deciding what the answers mean — and it had, completely. The old flow sent 235 interests
/// of its own, not one of which matched a string the server offers.
///
/// So the server owns the wording, the limits and the shape, and this renders whatever arrives.
/// A question with two parts — a qualification and skills, a level and skills — comes through as
/// two fields and needs no special case here.
export function OnboardingQuestions({
  questions,
  answers,
  onChange,
}: {
  questions: OnboardingQuestion[];
  answers: Record<string, string[]>;
  onChange: (answers: Record<string, string[]>) => void;
}) {
  return (
    <div className="onboarding-questions">
      {questions.map((question, index) => (
        <Question
          key={question.id}
          question={question}
          number={index + 1}
          of={questions.length}
          answers={answers}
          onChange={onChange}
        />
      ))}
    </div>
  );
}

function Question({
  question,
  number,
  of,
  answers,
  onChange,
}: {
  question: OnboardingQuestion;
  number: number;
  of: number;
  answers: Record<string, string[]>;
  onChange: (answers: Record<string, string[]>) => void;
}) {
  return (
    <section className="onboarding-question" aria-labelledby={`${question.id}-prompt`}>
      <p className="onboarding-question__step">
        Question {number} of {of}
      </p>
      <h2 id={`${question.id}-prompt`} className="onboarding-question__prompt">
        {question.prompt}
      </h2>
      <p className="onboarding-question__help">{question.help}</p>

      {question.fields.map((field) => (
        <Field
          key={field.id}
          field={field}
          prompt={question.prompt}
          picked={answers[field.id] ?? []}
          onPick={(picked) => onChange({ ...answers, [field.id]: picked })}
        />
      ))}
    </section>
  );
}

/// One set of choices.
///
/// Single-choice fields are a qualification or a seniority, which are positions on a ladder — so
/// picking a second replaces the first rather than adding to it. Tapping the chosen one again
/// clears it, because a mis-tap on a single choice is otherwise permanent from this screen.
function Field({
  field,
  prompt,
  picked,
  onPick,
}: {
  field: OnboardingField;
  prompt: string;
  picked: string[];
  onPick: (picked: string[]) => void;
}) {
  const single = field.mostSelections === 1;
  const full = !single && picked.length >= field.mostSelections;

  function toggle(option: string) {
    if (picked.includes(option)) {
      onPick(picked.filter((p) => p !== option));
      return;
    }

    if (single) {
      onPick([option]);
      return;
    }

    if (full) return;

    onPick([...picked, option]);
  }

  // A fieldset is already a group, so the inner role="group" added a second anonymous one. The
  // legend only renders when the server sent a label - interests, skills and goals send null -
  // so the fieldset carries the prompt as its accessible name rather than being nameless.
  return (
    <fieldset className="onboarding-field" aria-label={field.label ?? prompt}>
      {field.label && <legend className="onboarding-field__label">{field.label}</legend>}

      <div className="onboarding-field__options">
        {field.options.map((option) => {
          const chosen = picked.includes(option);

          return (
            <button
              key={option}
              type="button"
              className={`onboarding-option${chosen ? " is-chosen" : ""}`}
              aria-pressed={chosen}
              /// Disabled only when the limit is reached AND this one is not already picked, so
              /// a full set can still be undone. Disabling everything would trap somebody who
              /// picked five and wants a different fifth.
              disabled={full && !chosen}
              onClick={() => toggle(option)}
            >
              {option}
            </button>
          );
        })}
      </div>

      {!single && (
        <p className="onboarding-field__count" aria-live="polite">
          {picked.length} of {field.mostSelections} chosen
        </p>
      )}
    </fieldset>
  );
}
