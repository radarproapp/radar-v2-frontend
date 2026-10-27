import { Icon } from "./Icon";
import type { QuizBand, QuizPerformance } from "../lib/types";

/// What a learner got right, and where.
///
/// The score alone says four out of six. It does not say that both wrong answers were
/// problem-solving questions on one subtopic, which is the part that makes the next attempt
/// different — and that breakdown was already sitting on each question as CognitiveLevel and
/// Subtopic, unread.
///
/// Everything here is counted. No grade letter, no encouragement, no characterisation of the
/// learner: these are their own answers grouped by the labels the questions already carried. The
/// single judgement is which subtopics to call weak, and that is a count of more wrong than
/// right rather than a view about anybody's ability.

function Bars({ title, bands }: { title: string; bands: QuizBand[] }) {
  // A single band is not a breakdown — it is the overall score with a label on it.
  if (bands.length < 2) return null;

  return (
    <div className="quizperf__group">
      <div className="quizperf__group-label">{title}</div>

      {bands.map((band) => (
        <div key={band.name} className="quizperf__band">
          <div className="quizperf__band-head">
            <span className="quizperf__band-name">{band.name}</span>
            <span className="quizperf__band-count">
              {band.correct}/{band.answered}
            </span>
          </div>

          <div className="quizperf__bar">
            <div
              className="quizperf__bar-fill"
              style={{
                width: `${band.percent ?? 0}%`,
                // Red below half, because the colour is doing the same job as the number and
                // should not disagree with it.
                background: (band.percent ?? 0) >= 50 ? "var(--cyan)" : "#dc2626",
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function QuizPerformanceSummary({ performance }: { performance: QuizPerformance }) {
  // Nothing answered is not a score of zero; it is no score, and there is nothing to summarise.
  if (performance.answered === 0) return null;

  return (
    <div className="quizperf">
      <div className="quizperf__head">
        <div>
          <div className="quizperf__score">
            {performance.correct}
            <span className="quizperf__score-of">/{performance.answered}</span>
          </div>
          <div className="quizperf__score-label">
            {performance.scorePercent}% of what you answered
            {performance.answered < performance.total &&
              ` · ${performance.total - performance.answered} left`}
          </div>
        </div>

        <div className="quizperf__meta">
          <span>{performance.topic}</span>
          <span>{performance.difficulty}</span>
        </div>
      </div>

      <Bars title="By thinking skill" bands={performance.byCognitiveLevel} />
      <Bars title="By subtopic" bands={performance.bySubtopic} />
      <Bars title="By question type" bands={performance.byQuestionType} />

      {/* Named because they were counted. More wrong than right in a subtopic the question
          itself declared — not a diagnosis of the learner. */}
      {performance.weakAreas.length > 0 && (
        <div className="quizperf__weak">
          <div className="quizperf__group-label">Worth another pass</div>
          <div className="quizperf__weak-row">
            {performance.weakAreas.map((area) => (
              <span key={area} className="quizperf__weak-chip">
                {area}
              </span>
            ))}
          </div>
          <p className="quizperf__weak-note">
            More wrong than right here. That is a count, not a verdict.
          </p>
        </div>
      )}

      {performance.missed.length > 0 && (
        <div className="quizperf__missed">
          <div className="quizperf__group-label">What went wrong</div>

          {performance.missed.map((miss, i) => (
            <div key={`${miss.question}-${i}`} className="quizperf__miss">
              <div className="quizperf__miss-q">{miss.question}</div>

              <div className="quizperf__miss-answers">
                <div className="quizperf__miss-yours">
                  <Icon name="close" size={12} /> {miss.yourAnswer ?? "No answer"}
                </div>
                {miss.correctAnswer && (
                  <div className="quizperf__miss-right">
                    <Icon name="check" size={12} /> {miss.correctAnswer}
                  </div>
                )}
              </div>

              {miss.explanation && <p className="quizperf__miss-why">{miss.explanation}</p>}

              {miss.subtopic && <span className="quizperf__miss-tag">{miss.subtopic}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
