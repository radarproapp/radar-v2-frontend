import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { getToday, createStudyPlan, generateQuiz, reviewWork, streamMentorChat, submitQuizAnswer } from "../lib/api";
import type { ChatMessage, MentorQuiz, MentorStudyPlan, MentorWorkReview } from "../lib/types";

const MODES: { id: string; label: string }[] = [
  { id: "chat", label: "Chat" },
  { id: "quiz", label: "Quiz" },
  { id: "studyplan", label: "Study Plan" },
  { id: "review", label: "Review Work" },
];

const CHAT_SUGGESTIONS = [
  "Explain machine learning simply.",
  "Test me on what I just learned.",
  "What should I focus on this week?",
  "Recommend resources for my roadmap.",
];

const QUICK_QUIZ_TOPICS = ["ML Fundamentals", "AI Basics", "Product Management", "Research Methods"];
const REVIEW_TYPES = ["Note", "Essay", "Research Proposal", "Project Brief", "CV / Cover Letter"];

// The original Blazor formatter had a real bug: .Replace("**", "<strong>") followed by
// .Replace("**", "</strong>") never finds a second "**" to replace (the first call already
// consumed every occurrence), so bold/italic never closed. Using capture groups here instead.
function formatMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/\n\n/g, "<br/><br/>")
    .replace(/\n/g, "<br/>");
}

export function LearningMentor() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [activeMode, setActiveMode] = useState("chat");

  // Chat
  const [chatInput, setChatInput] = useState("");
  const [chatThinking, setChatThinking] = useState(false);
  const [chatBusy, setChatBusy] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  // Quiz
  const [quiz, setQuiz] = useState<MentorQuiz | null>(null);
  const [quizTopic, setQuizTopic] = useState("");
  const [quizGenerating, setQuizGenerating] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);

  // Study plan
  const [studyPlan, setStudyPlan] = useState<MentorStudyPlan | null>(null);
  const [planTopic, setPlanTopic] = useState("");
  const [planGoal, setPlanGoal] = useState(profile?.primaryGoal ?? "");
  const [planCreating, setPlanCreating] = useState(false);

  // Review
  const [review, setReview] = useState<MentorWorkReview | null>(null);
  const [reviewTitle, setReviewTitle] = useState("");
  const [reviewContent, setReviewContent] = useState("");
  const [reviewType, setReviewType] = useState("Note");
  const [reviewRunning, setReviewRunning] = useState(false);

  const prefilledRef = useRef(false);
  useEffect(() => {
    if (prefilledRef.current || !profile) return;
    prefilledRef.current = true;
    setPlanGoal(profile.primaryGoal);
    getToday()
      .then((focus) => setPlanTopic(focus.learn.title))
      .catch(() => {});
  }, [profile]);

  const sendChat = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || chatBusy) return;
    const history = [...chatMessages, { id: crypto.randomUUID(), role: "user" as const, content: trimmed, timestamp: new Date().toISOString(), suggestedResources: [] }];
    setChatMessages(history);
    setChatInput("");
    setChatThinking(true);
    setChatBusy(true);

    const assistantId = crypto.randomUUID();
    let started = false;

    try {
      await streamMentorChat(trimmed, history, (chunk) => {
        if (!started) {
          started = true;
          setChatThinking(false);
          setChatMessages((prev) => [...prev, { id: assistantId, role: "assistant", content: chunk, timestamp: new Date().toISOString(), suggestedResources: [] }]);
        } else {
          setChatMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, content: m.content + chunk } : m)));
        }
      });
    } finally {
      setChatThinking(false);
      setChatBusy(false);
    }
  };

  const handleChatKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendChat(chatInput);
    }
  };

  const runGenerateQuiz = async (topic: string) => {
    if (!topic.trim()) return;
    setQuizGenerating(true);
    try {
      const q = await generateQuiz(topic.trim());
      setQuiz(q);
      setSelectedAnswer(null);
    } finally {
      setQuizGenerating(false);
    }
  };

  const submitAnswer = async () => {
    if (!quiz || selectedAnswer === null) return;
    const updated = await submitQuizAnswer(quiz.id, quiz.currentQuestionIndex, selectedAnswer);
    setQuiz(updated);
  };

  const runCreateStudyPlan = async () => {
    if (!planTopic.trim() || !planGoal.trim()) return;
    setPlanCreating(true);
    try {
      setStudyPlan(await createStudyPlan(planTopic.trim(), planGoal.trim()));
    } finally {
      setPlanCreating(false);
    }
  };

  const runReviewWork = async () => {
    if (!reviewTitle.trim() || !reviewContent.trim()) return;
    setReviewRunning(true);
    try {
      setReview(await reviewWork(reviewTitle.trim(), reviewContent.trim(), reviewType));
    } finally {
      setReviewRunning(false);
    }
  };

  return (
    <div className="r-page" style={{ maxWidth: 740 }}>
      <div className="r-page-head">
        <h1 className="r-page-title">AI Learning Mentor</h1>
        <p className="r-page-sub">Your tutor for anything on your roadmap. Explains, tests, builds study plans and reviews your work.</p>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
        {MODES.map((mode) => (
          <button key={mode.id} className={`r-chip ${activeMode === mode.id ? "active" : ""}`} onClick={() => setActiveMode(mode.id)}>
            {mode.label}
          </button>
        ))}
      </div>

      {activeMode === "chat" && (
        <>
          {chatMessages.length === 0 ? (
            <div className="ask-suggestions">
              <div className="ask-suggestions-label">TRY ASKING YOUR MENTOR</div>
              {CHAT_SUGGESTIONS.map((s) => (
                <button className="ask-suggestion-item" key={s} onClick={() => sendChat(s)}>
                  {s}
                </button>
              ))}
            </div>
          ) : (
            <div className="ask-messages">
              {chatMessages.map((msg) => (
                <div className={`ask-msg ${msg.role === "user" ? "ask-msg--user" : "ask-msg--assistant"}`} key={msg.id}>
                  <span dangerouslySetInnerHTML={{ __html: formatMarkdown(msg.content) }} />
                </div>
              ))}
              {chatThinking && (
                <div className="ask-msg ask-msg--assistant">
                  <div className="r-spinner r-spinner--sm" />
                </div>
              )}
            </div>
          )}

          <div className="ask-input-row">
            <textarea
              className="ask-input-field"
              rows={1}
              placeholder="Ask your mentor…"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={handleChatKey}
            />
            <button className="ask-send-btn" onClick={() => sendChat(chatInput)} disabled={chatBusy || !chatInput.trim()}>
              →
            </button>
          </div>
        </>
      )}

      {activeMode === "quiz" && (
        <>
          {!quiz ? (
            <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 16, padding: 24, marginBottom: 20 }}>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.1rem", marginBottom: 8 }}>Generate a Quiz</div>
              <p style={{ fontSize: 13.5, color: "var(--text-dim)", lineHeight: 1.6, marginBottom: 16 }}>Test your understanding of any topic from your roadmap.</p>
              <input
                type="text"
                className="r-input"
                placeholder="e.g. Machine Learning Fundamentals"
                value={quizTopic}
                onChange={(e) => setQuizTopic(e.target.value)}
                style={{ marginBottom: 12 }}
              />
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
                {QUICK_QUIZ_TOPICS.map((q) => (
                  <button
                    key={q}
                    className="r-chip"
                    style={{ fontSize: 12 }}
                    onClick={() => {
                      setQuizTopic(q);
                      runGenerateQuiz(q);
                    }}
                  >
                    {q}
                  </button>
                ))}
              </div>
              <button className="btn btn--primary" onClick={() => runGenerateQuiz(quizTopic)} disabled={!quizTopic.trim() || quizGenerating}>
                {quizGenerating ? "Generating…" : "Generate Quiz"}
              </button>
            </div>
          ) : (
            <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 16, padding: 24, marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".07em", textTransform: "uppercase", color: "var(--text-faint)" }}>QUIZ</div>
                  <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1rem" }}>{quiz.topic}</div>
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)" }}>
                  Question {quiz.currentQuestionIndex + 1} of {quiz.questions.length}
                </div>
              </div>

              <div style={{ height: 4, background: "var(--bg-hover)", borderRadius: 99, overflow: "hidden", marginBottom: 20 }}>
                <div
                  style={{
                    height: "100%",
                    width: `${(quiz.currentQuestionIndex * 100) / quiz.questions.length}%`,
                    background: "var(--cyan)",
                    borderRadius: 99,
                    transition: "width .3s",
                  }}
                />
              </div>

              {!quiz.isComplete &&
                (() => {
                  const q = quiz.questions[quiz.currentQuestionIndex];
                  const showResult = q.userAnswered === true;
                  return (
                    <>
                      <div style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.5, marginBottom: 16 }}>{q.question}</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
                        {q.options.map((option, idx) => {
                          const isSelected = selectedAnswer === idx;
                          const isCorrect = idx === q.correctIndex;
                          const bg = showResult ? (isCorrect ? "var(--cyan-light)" : isSelected ? "#fdf3f2" : "#fff") : isSelected ? "var(--cyan-light)" : "#fff";
                          const bd = showResult ? (isCorrect ? "var(--cyan)" : isSelected ? "#c0392b" : "var(--border)") : isSelected ? "var(--cyan)" : "var(--border-strong)";
                          return (
                            <button
                              key={idx}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 10,
                                width: "100%",
                                textAlign: "left",
                                padding: "14px 16px",
                                borderRadius: 11,
                                cursor: "pointer",
                                fontSize: 14,
                                fontWeight: 500,
                                background: bg,
                                border: `1.5px solid ${bd}`,
                                color: "var(--text)",
                              }}
                              disabled={showResult}
                              onClick={() => setSelectedAnswer(idx)}
                            >
                              <span
                                style={{
                                  width: 24,
                                  height: 24,
                                  borderRadius: "50%",
                                  border: `2px solid ${showResult && isCorrect ? "var(--cyan)" : "var(--border-strong)"}`,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontSize: 11,
                                  fontWeight: 700,
                                  flex: "none",
                                  background: showResult && isCorrect ? "var(--cyan)" : "transparent",
                                  color: showResult && isCorrect ? "#fff" : "var(--text-faint)",
                                }}
                              >
                                {showResult ? (isCorrect ? "✓" : isSelected && !isCorrect ? "✗" : idx + 1) : idx + 1}
                              </span>
                              <span>{option}</span>
                            </button>
                          );
                        })}
                      </div>

                      {q.userAnswered === true ? (
                        <>
                          <div
                            style={{
                              background: q.userAnswerIndex === q.correctIndex ? "var(--cyan-light)" : "#fdf3f2",
                              borderRadius: 11,
                              padding: "14px 16px",
                              marginBottom: 16,
                            }}
                          >
                            <div
                              style={{
                                fontSize: 11,
                                fontWeight: 700,
                                letterSpacing: ".07em",
                                textTransform: "uppercase",
                                color: q.userAnswerIndex === q.correctIndex ? "var(--cyan-deep)" : "#c0392b",
                                marginBottom: 6,
                              }}
                            >
                              {q.userAnswerIndex === q.correctIndex ? "CORRECT" : "INCORRECT"}
                            </div>
                            <div style={{ fontSize: 13, color: "#374151", lineHeight: 1.6 }}>{q.explanation}</div>
                          </div>
                          <button className="btn btn--primary" style={{ width: "100%" }} onClick={() => setSelectedAnswer(null)}>
                            {quiz.currentQuestionIndex >= quiz.questions.length - 1 ? "See Results" : "Next Question →"}
                          </button>
                        </>
                      ) : (
                        <button className="btn btn--primary" style={{ width: "100%" }} onClick={submitAnswer} disabled={selectedAnswer === null}>
                          Check Answer
                        </button>
                      )}
                    </>
                  );
                })()}
            </div>
          )}

          {quiz?.isComplete && (
            <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 16, padding: 24, textAlign: "center" }}>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.6rem", marginBottom: 8 }}>Quiz Complete!</div>
              <div style={{ fontSize: 14, color: "var(--text-dim)", marginBottom: 20 }}>{quiz.topic}</div>
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: 700,
                  fontSize: "3rem",
                  color: quiz.score >= quiz.questions.length * 0.7 ? "var(--cyan)" : "var(--red)",
                  lineHeight: 1,
                  marginBottom: 4,
                }}
              >
                {quiz.score} / {quiz.questions.length}
              </div>
              <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 24 }}>
                {quiz.score >= quiz.questions.length * 0.7 ? "Great job! You've got a solid understanding." : "Keep studying — you'll get there!"}
              </div>
              <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
                <button className="btn" onClick={() => setQuiz(null)}>
                  New Quiz
                </button>
                <button className="btn btn--primary" onClick={() => navigate("/learn")}>
                  Back to Roadmap
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {activeMode === "studyplan" && (
        <>
          {!studyPlan ? (
            <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 16, padding: 24, marginBottom: 20 }}>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.1rem", marginBottom: 8 }}>Create a Study Plan</div>
              <p style={{ fontSize: 13.5, color: "var(--text-dim)", lineHeight: 1.6, marginBottom: 16 }}>
                I'll build a structured weekly plan based on your roadmap and goal.
              </p>
              <input
                type="text"
                className="r-input"
                placeholder="Topic (e.g. Machine Learning)"
                value={planTopic}
                onChange={(e) => setPlanTopic(e.target.value)}
                style={{ marginBottom: 12 }}
              />
              <input
                type="text"
                className="r-input"
                placeholder="Your goal (e.g. Get an AI internship)"
                value={planGoal}
                onChange={(e) => setPlanGoal(e.target.value)}
                style={{ marginBottom: 16 }}
              />
              <button className="btn btn--primary" onClick={runCreateStudyPlan} disabled={!planTopic.trim() || !planGoal.trim() || planCreating}>
                {planCreating ? "Creating…" : "Create Study Plan"}
              </button>
            </div>
          ) : (
            <>
              <div style={{ background: "var(--navy)", borderRadius: 16, padding: "20px 22px", color: "#fff", marginBottom: 16 }}>
                <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--cyan-bright)", marginBottom: 9 }}>
                  YOUR STUDY PLAN
                </div>
                <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 16, marginBottom: 4 }}>{studyPlan.topic}</div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,.6)" }}>Goal: {studyPlan.goal}</div>
              </div>

              {studyPlan.weeks.map((week) => (
                <div key={week.weekNumber} style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 14, padding: "18px 20px", marginBottom: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".07em", textTransform: "uppercase", color: "var(--cyan)" }}>WEEK {week.weekNumber}</div>
                      <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14.5 }}>{week.theme}</div>
                    </div>
                    {week.isCompleted && (
                      <span style={{ fontSize: 11, fontWeight: 700, color: "var(--lime)", background: "rgba(46,168,96,0.1)", borderRadius: 99, padding: "4px 10px" }}>
                        Done
                      </span>
                    )}
                  </div>
                  {week.tasks.map((task, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 0", borderTop: "1px solid rgba(20,24,31,.06)" }}>
                      <span style={{ fontSize: 10.5, fontWeight: 700, padding: "4px 8px", borderRadius: 99, background: "#f0f2f4", color: "var(--text-dim)", flex: "none", marginTop: 2 }}>
                        {task.resourceType}
                      </span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 600, lineHeight: 1.4 }}>{task.title}</div>
                        <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5 }}>{task.description}</div>
                      </div>
                      {task.estimatedTime && <span style={{ fontSize: 11, color: "var(--text-faint)", fontWeight: 600, flex: "none" }}>{task.estimatedTime}</span>}
                    </div>
                  ))}
                </div>
              ))}

              <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                <button className="btn" onClick={() => setStudyPlan(null)}>
                  New Plan
                </button>
                <button className="btn btn--primary" onClick={() => navigate("/learn")}>
                  Go to Roadmap
                </button>
              </div>
            </>
          )}
        </>
      )}

      {activeMode === "review" && (
        <>
          {!review ? (
            <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 16, padding: 24, marginBottom: 20 }}>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.1rem", marginBottom: 8 }}>Review My Work</div>
              <p style={{ fontSize: 13.5, color: "var(--text-dim)", lineHeight: 1.6, marginBottom: 16 }}>
                Paste your work and I'll give you detailed feedback on strengths, improvements, and suggestions.
              </p>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-dim)", display: "block", marginBottom: 6 }}>What are you reviewing?</label>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {REVIEW_TYPES.map((type) => (
                    <button key={type} className={`r-chip ${reviewType === type ? "active" : ""}`} onClick={() => setReviewType(type)}>
                      {type}
                    </button>
                  ))}
                </div>
              </div>
              <input
                type="text"
                className="r-input"
                placeholder="Title (e.g. My research proposal)"
                value={reviewTitle}
                onChange={(e) => setReviewTitle(e.target.value)}
                style={{ marginBottom: 12 }}
              />
              <textarea
                className="r-textarea"
                placeholder="Paste your work here…"
                value={reviewContent}
                onChange={(e) => setReviewContent(e.target.value)}
                style={{ minHeight: 180 }}
              />
              <button
                className="btn btn--primary"
                style={{ marginTop: 12 }}
                onClick={runReviewWork}
                disabled={!reviewTitle.trim() || !reviewContent.trim() || reviewRunning}
              >
                {reviewRunning ? "Reviewing…" : "Review My Work"}
              </button>
            </div>
          ) : (
            <>
              <div style={{ background: "var(--navy)", borderRadius: 16, padding: "20px 22px", color: "#fff", marginBottom: 16 }}>
                <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--cyan-bright)", marginBottom: 9 }}>REVIEW</div>
                <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 16, marginBottom: 4 }}>{review.workTitle}</div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,.6)" }}>{review.reviewType} · reviewed just now</div>
              </div>

              <div style={{ fontSize: 14, color: "#374151", lineHeight: 1.7, marginBottom: 16 }}>{review.feedback}</div>

              <div style={{ background: "var(--cyan-light)", borderRadius: 14, padding: "17px 19px", marginBottom: 12 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--cyan-deep)", marginBottom: 9 }}>STRENGTHS</div>
                {review.strengths.map((s, i) => (
                  <div key={i} style={{ fontSize: 13, color: "#0d3d40", lineHeight: 1.6, marginBottom: 4 }}>
                    ✓ {s}
                  </div>
                ))}
              </div>

              <div style={{ background: "#fdf3f2", borderRadius: 14, padding: "17px 19px", marginBottom: 12 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "#c0392b", marginBottom: 9 }}>AREAS TO IMPROVE</div>
                {review.improvements.map((s, i) => (
                  <div key={i} style={{ fontSize: 13, color: "#8a4b44", lineHeight: 1.6, marginBottom: 4 }}>
                    ! {s}
                  </div>
                ))}
              </div>

              <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 14, padding: "17px 19px", marginBottom: 16 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--text-faint)", marginBottom: 9 }}>SUGGESTIONS</div>
                {review.suggestions.map((s, i) => (
                  <div key={i} style={{ fontSize: 13, color: "#374151", lineHeight: 1.6, marginBottom: 6 }}>
                    → {s}
                  </div>
                ))}
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <button className="btn" onClick={() => setReview(null)}>
                  Review Another
                </button>
                <button className="btn btn--primary" onClick={() => navigate("/notebook")}>
                  Open Notebook
                </button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
