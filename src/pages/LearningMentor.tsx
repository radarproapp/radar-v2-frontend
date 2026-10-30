import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { MentorHistory } from "../components/MentorHistory";
import { useAuth } from "../auth/AuthContext";
import { QuizPerformanceSummary } from "../components/QuizPerformanceSummary";
import {
  createStudyPlan,
  getActiveStudyPlan,
  adjustStudyPlan,
  toggleStudyTask,
  generateQuiz,
  submitQuizAnswer,
  streamMentorChat,
  ApiError,
  getMentorConversation,
  getLearningMemory,
  getTopicMasteries,
  getTodayLearning,
  runMentorChallenge,
  getSpacedRevisions,
  completeSpacedRevision
} from "../lib/api";
import type {
  QuizPerformance,
  ChatMessage,
  MentorQuiz,
  MentorStudyPlan,
  PersonalLearningMemory,
  TopicMastery,
  DailyLearningCard,
  ChallengeResult,
  SpacedRevisionItem
} from "../lib/types";
import { Icon } from "../components/Icon";

const MODES = [
  { id: "chat", label: "Ask (Tutor)", desc: "Socratic Q&A connected to your roadmap" },
  { id: "quiz", label: "Practice & Quiz", desc: "Adaptive exercises across 4 cognitive levels" },
  { id: "studyplan", label: "Study Plan", desc: "Dynamic goal-oriented week-by-week plan" },
  { id: "mastery", label: "Mastery & Memory", desc: "Topic mastery progress & learning memory" },
  { id: "spaced", label: "Spaced Revision", desc: "Automated retention schedule" },
];

/// Shown only when Radar knows nothing about the user yet. The previous list was hardcoded to
/// SQL JOINs and Zero Trust, so a cybersecurity learner was offered SQL and a nurse would have
/// been offered both — the opposite of a tutor that knows who it is teaching.
const FALLBACK_CHAT_SUGGESTIONS = [
  "What should I learn first?",
  "Explain my current topic simply.",
  "Give me a real-world scenario to solve.",
];

/// Built from the user's own goal, skill and recorded weak areas.
function buildChatSuggestions(
  memory: PersonalLearningMemory | null,
  targetRole?: string | null,
): string[] {
  const out: string[] = [];
  const skill = memory?.activeSkill?.trim();
  const goal = memory?.primaryGoal?.trim();
  const weak = memory?.weakAreas?.find((w) => w.trim().length > 0);

  // "How do I become a X?" needs a role. It was falling back to the subject, which produced
  // "How do I become a Computer Science?" — the kind of sentence that tells a learner nobody
  // read this before shipping it.
  const role = targetRole?.trim();
  if (role) out.push(`How do I become a ${role}?`);
  else if (skill || goal) out.push(`What roles does ${skill || goal} lead to?`);

  // Act on recorded difficulty before anything else — this is the whole point of tracking it.
  if (weak) out.push(`I keep getting ${weak} wrong. Explain it differently.`);

  if (skill) {
    out.push(`Teach me ${skill} and give me an exercise.`);
    out.push(`Give me a real-world ${skill} scenario to solve.`);
  }

  if (goal && skill && goal !== skill) out.push(`Why does ${skill} matter for ${goal}?`);

  return out.length > 0 ? out.slice(0, 4) : FALLBACK_CHAT_SUGGESTIONS;
}

/// Quiz shortcuts, derived from what the user is actually studying. The fixed list this replaces
/// mixed SQL, Zero Trust and Power BI, so most of it was wrong for any given person.
function buildQuizTopics(memory: PersonalLearningMemory | null): string[] {
  const out: string[] = [];

  // Weak areas first: practising what you already pass is the least useful quiz you can take.
  for (const weak of memory?.weakAreas ?? []) if (weak.trim()) out.push(weak.trim());

  for (const m of memory?.masteries ?? []) {
    if (m.topic?.trim() && !out.includes(m.topic.trim())) out.push(m.topic.trim());
  }

  const skill = memory?.activeSkill?.trim();
  if (skill && !out.includes(skill)) out.push(skill);

  return out.slice(0, 6);
}

/// Turns a message into something that can only ever be text.
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/// <summary>The handful of marks a tutor's reply uses, as HTML.</summary>
///
/// Escaped first, which it was not. The output goes to dangerouslySetInnerHTML and this only
/// ever rewrote asterisks and newlines, so anything angle-bracketed in a message reached the
/// browser as markup. Pasting a snippet and asking a tutor what it does is an ordinary thing a
/// learner does - and now that conversations are stored, one pasted image tag with an onerror
/// would run again every time that thread was reopened, for as long as it existed.
///
/// The escape runs before the substitutions, so the tags written below survive it and nothing
/// in the message itself can become one.
function formatMarkdown(text: string): string {
  return escapeHtml(text)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/\n\n/g, "<br/><br/>")
    .replace(/\n/g, "<br/>");
}

export function LearningMentor() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [searchParams] = useSearchParams();

  const queryClient = useQueryClient();
  const [activeMode, setActiveMode] = useState("chat");

  // Today's Learning Card
  const [todayCard, setTodayCard] = useState<DailyLearningCard | null>(null);

  // Chat
  const [chatInput, setChatInput] = useState("");
  const [chatThinking, setChatThinking] = useState(false);
  const [chatBusy, setChatBusy] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  /// The conversation these turns belong to, or null for one that has not been started.
  ///
  /// The server does not announce a new thread's id in the stream - the SSE frames are what this
  /// page already parses and that shape did not change - so it is read back from the list, which
  /// is ordered by the last turn taken and therefore has it first.
  const [conversationId, setChatConversation] = useState<string | null>(null);

  /// What went wrong on the last turn, in words. Cleared when the next one starts.
  const [chatError, setChatError] = useState<string | null>(null);

  // Quiz & Practice
  const [quiz, setQuiz] = useState<MentorQuiz | null>(null);
  // Arrives with every quiz response rather than being fetched separately, and is counted from
  // stored answers — so it is here even with the cloud brain unavailable.
  const [performance, setPerformance] = useState<QuizPerformance | null>(null);
  const [quizTopic, setQuizTopic] = useState("");
  const [quizDifficulty, setQuizDifficulty] = useState("Adaptive");
  const [quizGenerating, setQuizGenerating] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);

  // Study plan
  const [studyPlan, setStudyPlan] = useState<MentorStudyPlan | null>(null);
  const [planTopic, setPlanTopic] = useState("");
  const [planGoal, setPlanGoal] = useState(profile?.primaryGoal ?? "");
  const [planWeeks, setPlanWeeks] = useState(6);
  const [planCreating, setPlanCreating] = useState(false);

  // Learning Memory & Mastery
  const [memory, setMemory] = useState<PersonalLearningMemory | null>(null);

  // Recomputed as the memory loads, so the prompts name the user's own subject rather than a
  // fixed example from another domain.
  const chatSuggestions = useMemo(
    () => buildChatSuggestions(memory, profile?.targetRole),
    [memory, profile?.targetRole],
  );

  const quizTopics = useMemo(() => buildQuizTopics(memory), [memory]);
  const [masteries, setMasteries] = useState<TopicMastery[]>([]);

  // Spaced Revision
  const [spacedRevisions, setSpacedRevisions] = useState<SpacedRevisionItem[]>([]);

  // Challenge Mode
  const [challengeResult, setChallengeResult] = useState<ChallengeResult | null>(null);
  const [challengeRunning, setChallengeRunning] = useState(false);

  // Load initial data
  useEffect(() => {
    getTodayLearning().then(setTodayCard).catch(() => {});
    getLearningMemory().then(setMemory).catch(() => {});
    getTopicMasteries().then(setMasteries).catch(() => {});
    getSpacedRevisions().then(setSpacedRevisions).catch(() => {});
    getActiveStudyPlan().then(setStudyPlan).catch(() => {});
  }, [profile]);

  // Handle URL Params for deep-links (e.g. from research paper or topic)
  const paramInitRef = useRef(false);
  useEffect(() => {
    if (paramInitRef.current) return;
    const mode = searchParams.get("mode");
    const topic = searchParams.get("topic");
    const prompt = searchParams.get("prompt");
    const prefillAsk = sessionStorage.getItem("radar_prefill_ask");

    if (mode && MODES.some((m) => m.id === mode)) {
      setActiveMode(mode);
    }

    if (prefillAsk) {
      sessionStorage.removeItem("radar_prefill_ask");
      setChatInput(prefillAsk);
      setActiveMode("chat");
      paramInitRef.current = true;
    } else if (prompt) {
      setChatInput(prompt);
      setActiveMode("chat");
      paramInitRef.current = true;
    } else if (mode === "quiz" && topic) {
      setQuizTopic(topic);
      runGenerateQuiz(topic);
      paramInitRef.current = true;
    }
  }, [searchParams]);

  // Chat Streaming
  const sendChat = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || chatBusy) return;

    const history = [
      ...chatMessages,
      {
        id: crypto.randomUUID(),
        role: "user" as const,
        content: trimmed,
        timestamp: new Date().toISOString(),
        suggestedResources: []
      }
    ];

    setChatMessages(history);
    setChatInput("");
    setChatThinking(true);
    setChatBusy(true);
    setChatError(null);

    const assistantId = crypto.randomUUID();
    let started = false;

    try {
      const thread = await streamMentorChat(
        trimmed,
        history,
        (chunk) => {
        if (!started) {
          started = true;
          setChatThinking(false);
          setChatMessages((prev) => [
            ...prev,
            { id: assistantId, role: "assistant", content: chunk, timestamp: new Date().toISOString(), suggestedResources: [] }
          ]);
        } else {
          setChatMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, content: m.content + chunk } : m))
          );
          }
        },
        undefined,
        conversationId ?? undefined,
      );

      // Which thread the server filed this under, from the response header.
      //
      // This used to refetch the conversation list and take the first entry. That is a guess,
      // and it was wrong in the ordinary case: the list query inherits a thirty-second
      // staleTime, so a reply arriving inside that window got the pre-send cache back and the
      // client claimed whichever thread was already top - then sent every follow-up to it,
      // while the sidebar highlighted a title that had nothing to do with the screen.
      //
      // Set through the updater rather than from the captured value, because the reader may
      // have opened a different thread while this was streaming.
      if (thread) setChatConversation((current) => current ?? thread);
    } catch (e) {
      // Said, not swallowed. The question is stored by now, so without this the learner is left
      // with their own words on screen, no reply, no explanation, and a thread that reopens
      // looking exactly as abandoned.
      setChatError(
        e instanceof ApiError
          ? e.message
          : "Radar could not reach your mentor just now. Your question is saved - try asking again.",
      );
    } finally {
      setChatThinking(false);
      setChatBusy(false);

      // The sidebar has moved: a new thread exists, or an existing one rose to the top. Its own
      // failure is not the turn's failure, so it cannot be allowed to replace the error above.
      queryClient.invalidateQueries({ queryKey: ["mentor", "conversations"] });
    }
  };

  /// <summary>Opens a stored conversation, turns and all.</summary>
  ///
  /// Refused while a reply is streaming. Switching mid-stream put the old transcript on screen
  /// with the pointer still aimed at the question being answered, and the chunks still arriving
  /// appended themselves to it.
  const openConversation = async (id: string) => {
    if (chatBusy) return;

    setActiveMode("chat");
    setChatBusy(true);
    setChatError(null);

    try {
      const conversation = await getMentorConversation(id);
      setChatConversation(conversation.id);
      setChatMessages(conversation.messages);
    } catch {
      // Usually deleted from another tab. Clicking a row and having nothing happen, forever, is
      // worse than being told it is gone.
      setChatError("That conversation could not be opened. It may have been deleted.");
      queryClient.invalidateQueries({ queryKey: ["mentor", "conversations"] });
    } finally {
      setChatBusy(false);
    }
  };

  /// Starts a fresh one. The turns on screen are already saved, so nothing is lost by clearing.
  const startNewConversation = () => {
    if (chatBusy) return;

    setChatConversation(null);
    setChatMessages([]);
    setChatInput("");
    setChatError(null);
  };

  const handleChatKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendChat(chatInput);
    }
  };

  // Generate Quiz
  const runGenerateQuiz = async (topic: string, diff: string = "Adaptive") => {
    if (!topic.trim()) return;
    setQuizGenerating(true);
    try {
      const { quiz: q, performance } = await generateQuiz(topic.trim(), 5, diff);
      setQuiz(q);
      setPerformance(performance);
      setSelectedAnswer(null);
    } finally {
      setQuizGenerating(false);
    }
  };

  // Submit Answer
  const submitAnswer = async () => {
    if (!quiz || selectedAnswer === null) return;
    const { quiz: updated, performance: summary } = await submitQuizAnswer(
      quiz.id, quiz.currentQuestionIndex, selectedAnswer);
    setQuiz(updated);
    setPerformance(summary);
    // Refresh masteries
    getTopicMasteries().then(setMasteries).catch(() => {});
  };

  // Create Study Plan
  const runCreateStudyPlan = async () => {
    if (!planTopic.trim() || !planGoal.trim()) return;
    setPlanCreating(true);
    try {
      const p = await createStudyPlan(planTopic.trim(), planGoal.trim(), planWeeks);
      setStudyPlan(p);
    } finally {
      setPlanCreating(false);
    }
  };

  // Toggle Task Completion
  const handleToggleTask = async (weekNumber: number, taskIndex: number) => {
    if (!studyPlan) return;
    await toggleStudyTask(studyPlan.id, weekNumber, taskIndex);
    const updated = await getActiveStudyPlan();
    setStudyPlan(updated);
  };

  // Adjust Study Plan
  const handleAdjustPlan = async (reason: string) => {
    if (!studyPlan) return;
    const adjusted = await adjustStudyPlan(studyPlan.id, reason);
    setStudyPlan(adjusted);
  };


  // Run Challenge Mode
  const handleRunChallenge = async () => {
    setChallengeRunning(true);
    try {
      const res = await runMentorChallenge();
      setChallengeResult(res);
    } finally {
      setChallengeRunning(false);
    }
  };

  // Complete Spaced Revision
  const handleCompleteRevision = async (id: string, wasRemembered: boolean) => {
    await completeSpacedRevision(id, wasRemembered);
    getSpacedRevisions().then(setSpacedRevisions).catch(() => {});
  };

  // Launch Today's Learning
  const startTodayLearning = (card: DailyLearningCard) => {
    setActiveMode("chat");
    sendChat(card.suggestedPrompt || `Teach me ${card.topic}. Explain why it matters to my roadmap, provide an example, and test my understanding.`);
  };

  return (
    <div className="r-page" style={{ maxWidth: 840 }}>
      {/* Header */}
      <div className="r-page-head" style={{ marginBottom: 14 }}>
        <h1 className="r-page-title" style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span><Icon name="brain" /></span> Radar AI Learning Mentor
        </h1>
        <p className="r-page-sub">
          Your personal tutor connected to your Radar Roadmap. Helps you understand concepts simply, practice adaptive exercises and follow dynamic study plans. To have a piece of work judged against a written standard, use Assess my work.
        </p>
      </div>

      {/* Nothing measured and no path: say so, rather than naming a weak area nobody has. */}
      {todayCard?.emptyReason && (
        <div className="mentor-today-card mentor-today-card--empty">
          <div className="mentor-today-badge">
            <span><Icon name="idea" /></span> Nothing to recommend yet
          </div>
          <div className="mentor-today-why" style={{ marginTop: 6 }}>{todayCard.emptyReason}</div>
          <button className="btn btn--primary btn--sm" style={{ marginTop: 14 }} onClick={() => navigate("/learn/build")}>
            Build your path
          </button>
        </div>
      )}

      {/* TODAY'S LEARNING CARD */}
      {todayCard && !todayCard.emptyReason && (
        <div className="mentor-today-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
            <div>
              <div className="mentor-today-badge">
                <span><Icon name="energy" /></span> Today&apos;s Learning · {todayCard.estimatedMinutes} Minutes
              </div>
              <div className="mentor-today-title">{todayCard.topic}</div>
              <div className="mentor-today-why">{todayCard.why}</div>

              <div className="mentor-time-breakdown">
                <span className="mentor-time-pill"><Icon name="book" /> Learn: {todayCard.learnMinutes} min</span>
                <span className="mentor-time-pill"><Icon name="note" /> Practice: {todayCard.practiceMinutes} min</span>
                <span className="mentor-time-pill"><Icon name="build" /> Apply: {todayCard.applyMinutes} min</span>
              </div>
            </div>

            <button
              type="button"
              className="btn btn--primary"
              style={{ background: "var(--cyan)", color: "#fff", fontWeight: 700, padding: "10px 20px" }}
              onClick={() => startTodayLearning(todayCard)}
            >
              Start Learning →
            </button>
          </div>
        </div>
      )}

      {/* Mode Selector Tabs */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
        {MODES.map((mode) => (
          <button
            key={mode.id}
            type="button"
            className={`r-chip ${activeMode === mode.id ? "active" : ""}`}
            style={{ fontSize: 13, padding: "7px 14px" }}
            onClick={() => setActiveMode(mode.id)}
          >
            {mode.label}
          </button>
        ))}
      </div>

      {/* ── 1. ASK / CHAT (TUTOR) ────────────────────────────────────────── */}
      {activeMode === "chat" && (
        <>
          {/* Every conversation the learner has had, beside the one they are in. Until now the
              turns lived in this tab and nowhere else: closing it lost the worked example they
              wanted to come back to on Thursday. */}
          <MentorHistory
            openId={conversationId}
            onOpen={openConversation}
            onNew={startNewConversation}
          />

          {/* What went wrong, in words. The question is stored by the time anything can fail,
              so silence leaves the learner with their own words, no reply and no explanation. */}
          {chatError && (
            <div role="alert" className="mentor-history__error">
              {chatError}
            </div>
          )}

          {chatMessages.length === 0 ? (
            <div className="ask-suggestions">
              <div className="ask-suggestions-label">TRY ASKING YOUR MENTOR (CONNECTED TO YOUR ROADMAP)</div>
              {chatSuggestions.map((s) => (
                <button type="button" className="ask-suggestion-item" key={s} onClick={() => sendChat(s)}>
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
              rows={2}
              placeholder="Ask your tutor anything on your roadmap (e.g., 'Teach me SQL JOINs and give me an exercise')..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={handleChatKey}
            />
            <button
              type="button"
              className="ask-send-btn"
              onClick={() => sendChat(chatInput)}
              disabled={chatBusy || !chatInput.trim()}
              title="Send message"
            >
              →
            </button>
          </div>
        </>
      )}

      {/* ── 2. PRACTICE & QUIZ (ADAPTIVE DIFFICULTY) ─────────────────────── */}
      {activeMode === "quiz" && (
        <>
          {!quiz ? (
            <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 16, padding: 24, marginBottom: 20 }}>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.15rem", marginBottom: 6 }}>
                Generate Adaptive Practice Quiz
              </div>
              <p style={{ fontSize: 13.5, color: "var(--text-dim)", lineHeight: 1.6, marginBottom: 16 }}>
                Radar tests across 4 cognitive levels: <strong>Recall → Understanding → Application → Problem-Solving</strong>. Identifies your weak areas and adapts automatically.
              </p>

              <input
                type="text"
                className="r-input"
                placeholder="Topic (e.g. SQL JOINs, Zero Trust, Threat Modeling)..."
                value={quizTopic}
                onChange={(e) => setQuizTopic(e.target.value)}
                style={{ marginBottom: 12 }}
              />

              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 14 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)" }}>Difficulty:</span>
                {["Adaptive", "Beginner", "Intermediate", "Advanced"].map((d) => (
                  <button
                    key={d}
                    type="button"
                    className={`r-chip ${quizDifficulty === d ? "active" : ""}`}
                    style={{ fontSize: 11.5 }}
                    onClick={() => setQuizDifficulty(d)}
                  >
                    {d}
                  </button>
                ))}
              </div>

              {/* Suggestions only when there is something real to suggest. An empty chip row below
                  the topic box reads as a loading failure. */}
              {quizTopics.length > 0 && (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 18 }}>
                <span style={{ fontSize: 11.5, color: "var(--text-faint)", fontWeight: 700, alignSelf: "center" }}>
                  FROM YOUR ROADMAP:
                </span>
                {quizTopics.map((q) => (
                  <button
                    key={q}
                    type="button"
                    className="r-chip"
                    style={{ fontSize: 12 }}
                    onClick={() => {
                      setQuizTopic(q);
                      runGenerateQuiz(q, quizDifficulty);
                    }}
                  >
                    {q}
                  </button>
                ))}
              </div>
              )}

              <button
                type="button"
                className="btn btn--primary"
                onClick={() => runGenerateQuiz(quizTopic, quizDifficulty)}
                disabled={!quizTopic.trim() || quizGenerating}
              >
                {quizGenerating ? "Generating Adaptive Quiz…" : "Generate Practice Quiz"}
              </button>
            </div>
          ) : (
            <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 16, padding: 24, marginBottom: 16 }}>
              {/* Quiz Header */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 4 }}>
                    <span style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".07em", color: "var(--cyan)", background: "rgba(0,163,196,0.1)", padding: "2px 8px", borderRadius: 6 }}>
                      {quiz.difficulty || "Adaptive"} Practice
                    </span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)" }}>
                      Cognitive Level: {quiz.questions[quiz.currentQuestionIndex]?.cognitiveLevel || "Application"}
                    </span>
                  </div>
                  <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.05rem" }}>{quiz.topic}</div>
                </div>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--text-muted)" }}>
                  Question {quiz.currentQuestionIndex + 1} of {quiz.questions.length}
                </div>
              </div>

              {/* Progress Bar */}
              <div style={{ height: 5, background: "var(--bg-hover)", borderRadius: 99, overflow: "hidden", marginBottom: 20 }}>
                <div
                  style={{
                    height: "100%",
                    width: `${((quiz.currentQuestionIndex + (quiz.isComplete ? 1 : 0)) * 100) / quiz.questions.length}%`,
                    background: "var(--cyan)",
                    borderRadius: 99,
                    transition: "width .3s"
                  }}
                />
              </div>

              {!quiz.isComplete && (() => {
                const q = quiz.questions[quiz.currentQuestionIndex];
                const showResult = q.userAnswered === true;

                return (
                  <>
                    {q.scenarioContext && (
                      <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: 12, marginBottom: 14, fontSize: 13, color: "#475569" }}>
                        <strong>Scenario:</strong> {q.scenarioContext}
                      </div>
                    )}

                    <div style={{ fontSize: 15.5, fontWeight: 600, lineHeight: 1.5, marginBottom: 16 }}>{q.question}</div>

                    {q.codeSnippet && (
                      <pre style={{ background: "#1e293b", color: "#f8fafc", padding: 14, borderRadius: 8, fontSize: 12.5, marginBottom: 16, overflowX: "auto" }}>
                        <code>{q.codeSnippet}</code>
                      </pre>
                    )}

                    <div style={{ display: "flex", flexDirection: "column", gap: 9, marginBottom: 18 }}>
                      {q.options.map((option, idx) => {
                        const isSelected = selectedAnswer === idx;
                        const isCorrect = idx === q.correctIndex;
                        const bg = showResult
                          ? isCorrect ? "var(--cyan-light)" : isSelected ? "#fdf3f2" : "#fff"
                          : isSelected ? "var(--cyan-light)" : "#fff";
                        const bd = showResult
                          ? isCorrect ? "var(--cyan)" : isSelected ? "#c0392b" : "var(--border)"
                          : isSelected ? "var(--cyan)" : "var(--border-strong)";

                        return (
                          <button
                            key={idx}
                            type="button"
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 12,
                              width: "100%",
                              textAlign: "left",
                              padding: "14px 16px",
                              borderRadius: 11,
                              cursor: "pointer",
                              fontSize: 14,
                              fontWeight: 500,
                              background: bg,
                              border: `1.5px solid ${bd}`,
                              color: "var(--text)"
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
                                color: showResult && isCorrect ? "#fff" : "var(--text-faint)"
                              }}
                            >
                              {showResult ? (isCorrect ? "" : isSelected ? "" : idx + 1) : idx + 1}
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
                            marginBottom: 16
                          }}
                        >
                          <div
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              letterSpacing: ".07em",
                              textTransform: "uppercase",
                              color: q.userAnswerIndex === q.correctIndex ? "var(--cyan-deep)" : "#c0392b",
                              marginBottom: 6
                            }}
                          >
                            {q.userAnswerIndex === q.correctIndex ? "CORRECT " : "INCORRECT "}
                          </div>
                          <div style={{ fontSize: 13, color: "#374151", lineHeight: 1.6 }}>{q.explanation}</div>
                        </div>

                        <button
                          type="button"
                          className="btn btn--primary"
                          style={{ width: "100%" }}
                          onClick={() => setSelectedAnswer(null)}
                        >
                          {quiz.currentQuestionIndex >= quiz.questions.length - 1 ? "See Diagnostic Results" : "Next Question →"}
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        className="btn btn--primary"
                        style={{ width: "100%" }}
                        onClick={submitAnswer}
                        disabled={selectedAnswer === null}
                      >
                        Check Answer
                      </button>
                    )}
                  </>
                );
              })()}
            </div>
          )}

          {/* Quiz Complete Diagnostic State */}
          {quiz?.isComplete && (
            <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 16, padding: 26, textAlign: "center" }}>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.6rem", marginBottom: 6 }}>
                Practice Session Complete!
              </div>
              <div style={{ fontSize: 14, color: "var(--text-dim)", marginBottom: 20 }}>{quiz.topic}</div>

              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: 800,
                  fontSize: "3.2rem",
                  color: quiz.score >= quiz.questions.length * 0.7 ? "var(--cyan)" : "#b91c1c",
                  lineHeight: 1,
                  marginBottom: 6
                }}
              >
                {quiz.score} / {quiz.questions.length}
              </div>

              <div style={{ fontSize: 13.5, color: "var(--text-muted)", marginBottom: 18 }}>
                Score: {Math.round((quiz.score / quiz.questions.length) * 100)}% · Mastery score updated in your learning memory.
              </div>

              {/* The breakdown. The score says four out of six; this says both wrong answers
                  were problem-solving questions on one subtopic, which is the part that makes
                  the next attempt different. All of it was already on each question as
                  CognitiveLevel and Subtopic, and nothing read it. */}
              {performance && (
                <div style={{ textAlign: "left", margin: "0 auto 22px", maxWidth: 600 }}>
                  <QuizPerformanceSummary performance={performance} />
                </div>
              )}

              {/* NEXT MOVE BANNER */}
              {quiz.nextMove && (
                <div className="mentor-next-move-banner" style={{ textAlign: "left", margin: "16px auto 24px", maxWidth: 600 }}>
                  <span className="mentor-next-move-icon"><Icon name="goal" /></span>
                  <div>
                    <div className="mentor-next-move-title">Your Next Move</div>
                    <div className="mentor-next-move-text">{quiz.nextMove}</div>
                  </div>
                </div>
              )}

              {/* Every question, right and wrong, with the reason. The score alone tells you that
                  you got four out of six; it does not tell you what you misunderstood, which is
                  the only part that makes the next attempt better. All of this was already on
                  each question — it just was not shown once the session ended. */}
              <div style={{ textAlign: "left", margin: "0 auto 24px", maxWidth: 680 }}>
                <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".07em", color: "var(--text-faint)", marginBottom: 12 }}>
                  YOUR ANSWERS
                </div>

                {quiz.questions.map((q, qi) => {
                  const correct = q.userAnswerIndex === q.correctIndex;
                  return (
                    <div
                      key={qi}
                      style={{
                        background: correct ? "var(--cyan-light)" : "#fdf3f2",
                        border: `1px solid ${correct ? "var(--cyan)" : "#f0c4c0"}`,
                        borderRadius: 12,
                        padding: "14px 16px",
                        marginBottom: 10,
                      }}
                    >
                      <div style={{ display: "flex", gap: 8, alignItems: "baseline", marginBottom: 6 }}>
                        <span style={{ fontSize: 12, fontWeight: 800, color: correct ? "var(--cyan-deep)" : "#c0392b" }}>
                          {correct ? "CORRECT " : "INCORRECT "}
                        </span>
                        <span style={{ fontSize: 11.5, color: "var(--text-muted)", fontWeight: 600 }}>
                          Question {qi + 1}
                        </span>
                      </div>

                      <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 8, color: "#0f172a" }}>{q.question}</div>

                      {!correct && q.userAnswerIndex != null && q.options[q.userAnswerIndex] && (
                        <div style={{ fontSize: 12.5, color: "#c0392b", marginBottom: 4 }}>
                          You chose: {q.options[q.userAnswerIndex]}
                        </div>
                      )}
                      {q.options[q.correctIndex] && (
                        <div style={{ fontSize: 12.5, color: "var(--cyan-deep)", fontWeight: 600, marginBottom: 6 }}>
                          Correct answer: {q.options[q.correctIndex]}
                        </div>
                      )}

                      {q.explanation && (
                        <div style={{ fontSize: 13, color: "#374151", lineHeight: 1.6 }}>{q.explanation}</div>
                      )}
                    </div>
                  );
                })}
              </div>

              {quiz.detectedWeakAreas && quiz.detectedWeakAreas.length > 0 && (
                <div style={{ textAlign: "left", margin: "0 auto 20px", maxWidth: 680, fontSize: 13, color: "var(--text-dim)" }}>
                  <strong>Keep working on:</strong> {quiz.detectedWeakAreas.join(", ")}
                </div>
              )}

              <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
                <button type="button" className="btn" onClick={() => setQuiz(null)}>
                  Practice Another Topic
                </button>
                <button type="button" className="btn btn--primary" onClick={() => setActiveMode("mastery")}>
                  View Mastery Dashboard
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── 3. STUDY PLAN (DYNAMIC WEEK-BY-WEEK) ─────────────────────────── */}
      {activeMode === "studyplan" && (
        <>
          {!studyPlan ? (
            <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 16, padding: 24, marginBottom: 20 }}>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.15rem", marginBottom: 6 }}>
                Create a Dynamic Personal Study Plan
              </div>
              <p style={{ fontSize: 13.5, color: "var(--text-dim)", lineHeight: 1.6, marginBottom: 16 }}>
                Radar builds a progression from <strong>Foundations → Core Tools → Advanced Analysis → Real-World Portfolio Application</strong>. Adapts dynamically if you struggle or advance.
              </p>

              <input
                type="text"
                className="r-input"
                placeholder="Topic (e.g. Power BI, Penetration Testing, Data Analytics)..."
                value={planTopic}
                onChange={(e) => setPlanTopic(e.target.value)}
                style={{ marginBottom: 12 }}
              />

              <input
                type="text"
                className="r-input"
                placeholder="Your specific career goal (e.g. Become a Senior Security Analyst in 6 weeks)..."
                value={planGoal}
                onChange={(e) => setPlanGoal(e.target.value)}
                style={{ marginBottom: 14 }}
              />

              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 18 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)" }}>Duration:</span>
                {[4, 6, 8, 12].map((w) => (
                  <button
                    key={w}
                    type="button"
                    className={`r-chip ${planWeeks === w ? "active" : ""}`}
                    onClick={() => setPlanWeeks(w)}
                  >
                    {w} Weeks
                  </button>
                ))}
              </div>

              <button
                type="button"
                className="btn btn--primary"
                onClick={runCreateStudyPlan}
                disabled={!planTopic.trim() || !planGoal.trim() || planCreating}
              >
                {planCreating ? "Synthesizing Dynamic Plan…" : "Generate Study Plan"}
              </button>
            </div>
          ) : (
            <>
              {/* Active Plan Header */}
              <div style={{ background: "var(--navy)", borderRadius: 16, padding: "20px 22px", color: "#fff", marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--cyan-bright)" }}>
                    ACTIVE RADAR STUDY PLAN
                  </div>
                  <span style={{ fontSize: 11, background: "rgba(255,255,255,0.15)", padding: "2px 8px", borderRadius: 99 }}>
                    Status: {studyPlan.status || "Active"}
                  </span>
                </div>
                <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 17, marginBottom: 4 }}>
                  {studyPlan.topic}
                </div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,.75)" }}>Goal: {studyPlan.goal}</div>
              </div>

              {/* Weekly Progression */}
              {studyPlan.weeks.map((week) => (
                <div key={week.weekNumber} style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 14, padding: "18px 20px", marginBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".07em", textTransform: "uppercase", color: "var(--cyan)" }}>
                        WEEK {week.weekNumber} · {week.theme}
                      </div>
                      {week.milestone && (
                        <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                          <Icon name="goal" /> Milestone: {week.milestone}
                        </div>
                      )}
                    </div>
                    {week.isCompleted && (
                      <span style={{ fontSize: 11, fontWeight: 700, color: "var(--lime)", background: "rgba(46,168,96,0.1)", borderRadius: 99, padding: "4px 10px" }}>
                        <Icon name="check" /> Week Done
                      </span>
                    )}
                  </div>

                  {week.tasks.map((task, i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "10px 0",
                        borderTop: "1px solid rgba(20,24,31,.06)",
                        opacity: task.isCompleted ? 0.6 : 1
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={task.isCompleted}
                        onChange={() => handleToggleTask(week.weekNumber, i)}
                        style={{ cursor: "pointer", width: 16, height: 16 }}
                      />
                      <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 99, background: "#f0f2f4", color: "var(--text-dim)", flex: "none" }}>
                        {task.resourceType}
                      </span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 600, textDecoration: task.isCompleted ? "line-through" : "none" }}>
                          {task.title}
                        </div>
                        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{task.description}</div>
                      </div>
                      {task.estimatedTime && (
                        <span style={{ fontSize: 11, color: "var(--text-faint)", fontWeight: 600, flex: "none" }}>
                          {task.estimatedTime}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              ))}

              {/* Dynamic Adjust Controls */}
              <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
                <button type="button" className="btn" onClick={() => handleAdjustPlan("Struggling with advanced subtopics")}>
                  <Icon name="energy" /> Need Help (Adjust Plan)
                </button>
                <button type="button" className="btn" onClick={() => setStudyPlan(null)}>
                  Create New Plan
                </button>
                <button type="button" className="btn btn--primary" style={{ marginLeft: "auto" }} onClick={() => navigate("/learn")}>
                  Open Roadmap →
                </button>
              </div>
            </>
          )}
        </>
      )}

      {/* ── 5. MASTERY & LEARNING MEMORY DASHBOARD ───────────────────────── */}
      {activeMode === "mastery" && (
        <>
          {/* Personal Learning Memory Card */}
          {memory && (
            <div className="mentor-memory-panel">
              <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".07em", color: "var(--cyan)", marginBottom: 8 }}>
                PERSISTENT LEARNING MEMORY
              </div>
              <div style={{ fontSize: 13.5, color: "#1e293b", lineHeight: 1.6, marginBottom: 12 }}>
                Radar continuously tracks your mastery so you never have to re-explain your background.
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 }}>
                <div style={{ background: "#fff", padding: 10, borderRadius: 8, border: "1px solid var(--border)" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)" }}>PRIMARY GOAL</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{memory.primaryGoal}</div>
                </div>
                <div style={{ background: "#fff", padding: 10, borderRadius: 8, border: "1px solid var(--border)" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)" }}>ACTIVE ROADMAP SKILL</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--cyan-deep)" }}>{memory.activeSkill}</div>
                </div>
                <div style={{ background: "#fff", padding: 10, borderRadius: 8, border: "1px solid var(--border)" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)" }}>DETECTED WEAK AREAS</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#b91c1c" }}>
                    {memory.weakAreas.length > 0 ? memory.weakAreas.join(", ") : "None detected"}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* CHALLENGE ME BUTTON */}
          <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 14, padding: "18px 20px", marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 14.5, fontWeight: 700 }}><Icon name="energy" /> Challenge Mode</div>
              <div style={{ fontSize: 12.5, color: "var(--text-muted)" }}>
                Diagnostic test evaluating Conceptual Understanding vs Practical Application.
              </div>
            </div>
            <button
              type="button"
              className="btn btn--primary"
              style={{ background: "#f59e0b", color: "#fff", border: "none" }}
              onClick={handleRunChallenge}
              disabled={challengeRunning}
            >
              {challengeRunning ? "Testing…" : "Challenge Me"}
            </button>
          </div>

          {/* Challenge Result Modal / Box */}
          {challengeResult && (
            <div style={{ background: "#fffbeb", border: "1.5px solid #fde68a", borderRadius: 14, padding: 20, marginBottom: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 800, textTransform: "uppercase", color: "#b45309", marginBottom: 4 }}>
                DIAGNOSTIC CHALLENGE RESULTS
              </div>
              <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 8 }}>
                {challengeResult.topic} · Overall Score: {challengeResult.scorePercent}%
              </div>

              <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
                <span className="mentor-time-pill" style={{ background: "#fef3c7", color: "#92400e" }}>
                  <Icon name="idea" /> Conceptual Understanding: {challengeResult.conceptualScorePercent}%
                </span>
                <span className="mentor-time-pill" style={{ background: "#fee2e2", color: "#991b1b" }}>
                  <Icon name="build" /> Practical Application: {challengeResult.practicalScorePercent}%
                </span>
              </div>

              <div style={{ fontSize: 13, color: "#78350f", marginBottom: 8 }}>
                <strong>Recommendation:</strong> {challengeResult.recommendation}
              </div>

              <div className="mentor-next-move-banner">
                <span className="mentor-next-move-icon"><Icon name="goal" /></span>
                <div>
                  <div className="mentor-next-move-title">Your Next Move</div>
                  <div className="mentor-next-move-text">{challengeResult.nextMove}</div>
                </div>
              </div>

              <button
                type="button"
                className="btn btn--sm"
                onClick={() => {
                  setQuizTopic(challengeResult.topic);
                  setActiveMode("quiz");
                  runGenerateQuiz(challengeResult.topic);
                }}
              >
                Start Remedial Practice →
              </button>
            </div>
          )}

          {/* Topic & Subtopic Mastery Breakdown */}
          <div className="mentor-mastery-grid">
            {masteries.map((tm) => (
              <div className="mentor-mastery-card" key={tm.id}>
                <div className="mentor-mastery-header">
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700 }}>{tm.topic}</div>
                    <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
                      Completion != Mastery · Evaluated across recent quizzes
                    </div>
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: tm.masteryPercent >= 70 ? "var(--cyan-deep)" : "#b91c1c" }}>
                    {tm.masteryPercent}%
                  </div>
                </div>

                <div style={{ height: 6, background: "#f1f5f9", borderRadius: 99, overflow: "hidden", marginBottom: 14 }}>
                  <div
                    style={{
                      height: "100%",
                      width: `${tm.masteryPercent}%`,
                      background: tm.masteryPercent >= 75 ? "#10b981" : tm.masteryPercent >= 60 ? "var(--cyan)" : "#ef4444",
                      borderRadius: 99
                    }}
                  />
                </div>

                {/* Subtopics */}
                {tm.subtopics.map((sub, i) => (
                  <div className="mentor-subtopic-row" key={i}>
                    <span>{sub.name}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontWeight: 700, fontSize: 12 }}>{sub.masteryPercent}%</span>
                      <span
                        className={`mentor-status-tag ${
                          sub.status === "Mastered"
                            ? "mastered"
                            : sub.status === "Strong"
                            ? "strong"
                            : sub.status === "WeakArea"
                            ? "weak"
                            : "progress"
                        }`}
                      >
                        {sub.status === "WeakArea" ? "Weak Area" : sub.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── 6. SPACED REVISION ───────────────────────────────────────────── */}
      {activeMode === "spaced" && (
        <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 16, padding: 24 }}>
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.15rem", marginBottom: 6 }}>
            Spaced Retention & Revision Loop
          </div>
          <p style={{ fontSize: 13.5, color: "var(--text-dim)", lineHeight: 1.6, marginBottom: 18 }}>
            Radar automatically schedules spaced recall on a proven cadence: <strong>Day 1 (Learn) → Day 2 (Recall) → Day 4 (Practice) → Day 7 (Application) → Day 21 (Mastery Test)</strong>.
          </p>

          {spacedRevisions.map((rev) => (
            <div className="mentor-spaced-item" key={rev.id} style={{ opacity: rev.isCompleted ? 0.7 : 1 }}>
              <span className="mentor-spaced-stage">{rev.intervalName}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 3 }}>{rev.topic}</div>
                <div style={{ fontSize: 12.5, color: "#475569", lineHeight: 1.5, marginBottom: 8 }}>{rev.prompt}</div>

                <div style={{ display: "flex", gap: 8 }}>
                  {!rev.isCompleted ? (
                    <>
                      <button
                        type="button"
                        className="btn btn--sm"
                        style={{ background: "#ecfdf5", color: "#065f46", border: "1px solid #a7f3d0" }}
                        onClick={() => handleCompleteRevision(rev.id, true)}
                      >
                        <Icon name="check" /> I Remembered
                      </button>
                      <button
                        type="button"
                        className="btn btn--sm"
                        style={{ background: "#fef2f2", color: "#991b1b", border: "1px solid #fecaca" }}
                        onClick={() => handleCompleteRevision(rev.id, false)}
                      >
                        ! Need to Review
                      </button>
                    </>
                  ) : (
                    <span style={{ fontSize: 11, fontWeight: 700, color: "var(--lime)" }}>
                      <Icon name="check" /> Revision completed
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
