import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { QuizPerformanceSummary } from "../QuizPerformanceSummary";
import { renderPage } from "../../test/harness";
import type { QuizPerformance } from "../../lib/types";

/// The breakdown that makes the next attempt different.
///
/// The score already said four out of six. These assert the page says *which* four, and that it
/// keeps the two distinctions the backend is careful about: nothing answered is not a score of
/// zero, and a weak area is a count rather than a verdict.

function perf(overrides: Partial<QuizPerformance> = {}): QuizPerformance {
  return {
    quizId: "q1",
    topic: "Cybersecurity",
    difficulty: "Intermediate",
    answered: 0,
    correct: 0,
    total: 5,
    scorePercent: null,
    isComplete: false,
    byCognitiveLevel: [],
    bySubtopic: [],
    byQuestionType: [],
    missed: [],
    weakAreas: [],
    nextMove: null,
    ...overrides,
  };
}

describe("QuizPerformanceSummary", () => {
  /// Nothing answered is no score, not a score of nought, so there is nothing to summarise and
  /// the component draws nothing at all.
  it("renders nothing before anything is answered", () => {
    const { container } = renderPage(<QuizPerformanceSummary performance={perf()} />);

    expect(container.querySelector(".quizperf")).toBeNull();
  });

  it("scores only what was answered", () => {
    renderPage(
      <QuizPerformanceSummary
        performance={perf({ answered: 4, correct: 3, total: 6, scorePercent: 75 })}
      />,
    );

    expect(screen.getByText("3")).toBeTruthy();
    expect(screen.getByText("/4")).toBeTruthy();
    // Says how many are left rather than counting them against the learner.
    expect(screen.getByText(/2 left/)).toBeTruthy();
  });

  it("breaks the score down by thinking skill", () => {
    renderPage(
      <QuizPerformanceSummary
        performance={perf({
          answered: 3,
          correct: 2,
          scorePercent: 67,
          byCognitiveLevel: [
            { name: "Recall", correct: 2, answered: 2, percent: 100 },
            { name: "ProblemSolving", correct: 0, answered: 1, percent: 0 },
          ],
        })}
      />,
    );

    expect(screen.getByText("By thinking skill")).toBeTruthy();
    expect(screen.getByText("Recall")).toBeTruthy();
    expect(screen.getByText("ProblemSolving")).toBeTruthy();
  });

  /// A single band is the overall score with a label on it, not a breakdown, so it is not drawn.
  it("does not draw a breakdown of one band", () => {
    renderPage(
      <QuizPerformanceSummary
        performance={perf({
          answered: 2,
          correct: 1,
          scorePercent: 50,
          bySubtopic: [{ name: "TLS", correct: 1, answered: 2, percent: 50 }],
        })}
      />,
    );

    expect(screen.queryByText("By subtopic")).toBeNull();
  });

  it("shows both answers and the explanation for a missed question", () => {
    renderPage(
      <QuizPerformanceSummary
        performance={perf({
          answered: 1,
          correct: 0,
          scorePercent: 0,
          missed: [
            {
              question: "What is a nonce?",
              yourAnswer: "a hash",
              correctAnswer: "a number used once",
              explanation: "It exists to stop replay.",
              subtopic: "Key exchange",
              cognitiveLevel: "Understanding",
            },
          ],
        })}
      />,
    );

    expect(screen.getByText("What is a nonce?")).toBeTruthy();
    expect(screen.getByText(/a hash/)).toBeTruthy();
    expect(screen.getByText(/a number used once/)).toBeTruthy();
    expect(screen.getByText("It exists to stop replay.")).toBeTruthy();
  });

  // A missed free-text answer has no option to show back, so it says so rather than leaving a gap.
  it("names an unanswered question rather than showing an empty answer", () => {
    renderPage(
      <QuizPerformanceSummary
        performance={perf({
          answered: 1,
          correct: 0,
          scorePercent: 0,
          missed: [
            {
              question: "Explain salting",
              yourAnswer: null,
              correctAnswer: null,
              explanation: null,
              subtopic: null,
              cognitiveLevel: "Application",
            },
          ],
        })}
      />,
    );

    expect(screen.getByText(/no answer/i)).toBeTruthy();
  });

  /// The label is the point. "Worth another pass" and "that is a count, not a verdict" are the
  /// difference between a breakdown and a judgement about the learner.
  it("labels weak areas as a count rather than a verdict", () => {
    renderPage(
      <QuizPerformanceSummary
        performance={perf({
          answered: 3,
          correct: 1,
          scorePercent: 33,
          weakAreas: ["Key exchange"],
        })}
      />,
    );

    expect(screen.getByText("Worth another pass")).toBeTruthy();
    expect(screen.getByText("Key exchange")).toBeTruthy();
    expect(screen.getByText(/a count, not a verdict/i)).toBeTruthy();
  });
});
