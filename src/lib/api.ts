import type {
  AiEngineStats,
  AnalyticsEventType,
  CaptureMode,
  CapturedItem,
  ChallengeResult,
  ChatMessage,
  CitationStyle,
  ContentItem,
  ContentReport,
  ContentType,
  DailyLearningCard,
  DailyOpportunityFeed,
  EventsSummary,
  GrowthRoadmap,
  HomeBrief,
  LearnHubPayload,
  MentorQuiz,
  MentorStudyPlan,
  MentorWorkReview,
  NavigatorFocus,
  Note,
  Opportunity,
  OpportunityTrackingStatus,
  OpportunityType,
  Page,
  PersonaType,
  PersonalLearningMemory,
  PolicyComparison,
  ProjectTemplate,
  ReportReason,
  SignalsSummary,
  SourceProfile,
  SourceReportSummary,
  SpacedRevisionItem,
  StudioProject,
  SubscriptionPlan,
  TopicMastery,
  TopicProfile,
  UserInterestContext,
  UserProfile,
  WeeklyBrief,
} from "./types";

/// Which API this build talks to.
///
/// There used to be a hardcoded production URL as the fallback here. That is the most dangerous
/// possible default once more than one environment exists: a staging build missing its variable
/// would come up looking healthy while reading and writing real user data, and nothing would say
/// so. A build with no API configured is a broken build, and it should behave like one.
///
/// Local development is the one case where a default is helpful, since the dev server is always
/// on the same port.
const API_BASE: string = (() => {
  const configured = import.meta.env.VITE_API_BASE_URL;
  if (configured) return configured;

  if (import.meta.env.DEV) return "http://127.0.0.1:5080";

  throw new Error(
    "VITE_API_BASE_URL is not set for this build. Set it per environment " +
      "(staging and production point at different APIs) — refusing to guess.",
  );
})();
const TOKEN_KEY = "radar_jwt";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (res.status === 204) return undefined as T;

  const isJson = res.headers.get("content-type")?.includes("application/json");
  const body = isJson ? await res.json() : null;

  if (!res.ok) {
    const message = body?.error ?? body?.title ?? res.statusText;
    throw new ApiError(res.status, message);
  }

  return body as T;
}

// Shared by Ask Radar and Mentor chat: POSTs { message, history } to an SSE endpoint and calls
// onChunk with each text delta as it arrives. Uses fetch + a stream reader rather than
// EventSource, since EventSource can't send a POST body.
async function streamChat(path: string, message: string, history: ChatMessage[], onChunk: (text: string) => void, signal?: AbortSignal): Promise<void> {
  const token = getToken();
  const headers = new Headers({ "Content-Type": "application/json" });
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify({ message, history }),
    signal,
  });

  if (!res.ok || !res.body) throw new ApiError(res.status, "Failed to start chat stream.");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) return;
    buffer += decoder.decode(value, { stream: true });

    let sepIndex: number;
    while ((sepIndex = buffer.indexOf("\n\n")) !== -1) {
      const line = buffer.slice(0, sepIndex).trim();
      buffer = buffer.slice(sepIndex + 2);
      if (!line.startsWith("data: ")) continue;

      const data = line.slice("data: ".length);
      if (data === "[DONE]") return;
      try {
        onChunk((JSON.parse(data) as { content: string }).content);
      } catch {
        // ignore a malformed chunk rather than aborting the whole stream
      }
    }
  }
}

// ── Auth ─────────────────────────────────────────────────────────────────

export interface AuthResponse {
  token: string;
  expiresAtUtc: string;
  userId: string;
  userName: string;
  role: string;
}

export function register(name: string, email: string, password: string) {
  return request<AuthResponse>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ name, email, password }),
  });
}

export function login(email: string, password: string) {
  return request<AuthResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function adminLogin(email: string, password: string) {
  return request<AuthResponse>("/api/admin/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

// ── Me / profile ─────────────────────────────────────────────────────────

export interface UpdateProfileRequest {
  name?: string;
  persona?: string;
  primaryGoal?: string;
  region?: string;
  city?: string;
  interests?: string[];
  interestContexts?: UserInterestContext[];
  dominantInterests?: string[];
  problems?: string[];
  currentIntent?: string;
  targetRole?: string;
  targetIndustry?: string;
  capabilities?: string[];
  opportunityPreferences?: string[];
  geography?: string[];
  decisionNeeds?: string[];
  personaDetails?: Record<string, string>;
  notifications?: {
    weeklyBrief: boolean;
    opportunityDeadlines: boolean;
    roadmapReminders: boolean;
  };
}

export function getMe() {
  return request<UserProfile>("/api/me");
}

export function updateMe(body: UpdateProfileRequest) {
  return request<UserProfile>("/api/me", { method: "PUT", body: JSON.stringify(body) });
}

export function completeOnboarding(body: UpdateProfileRequest) {
  return request<UserProfile>("/api/me/onboarding-complete", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

// ── Personalization signals ──────────────────────────────────────────────
// What Radar has learned about the user. Signals are recorded server-side from real behaviour
// (POST /api/events), so these endpoints only read them back and let the user override one.

export function getSignals() {
  return request<SignalsSummary>("/api/me/signals");
}

export interface RecordSignal {
  term: string;
  strength: number;
  timesEngaged: number;
  source: string;
}

export interface TopicEvidence {
  topic: string;
  lessonsCompleted: number;
  averageScore: number;
}

/// Everything Radar has worked out about this user's learning, in one object.
export interface LearningRecord {
  primaryGoal: string;
  targetRole: string;
  targetIndustry: string;
  interests: string[];
  capabilities: string[];
  problems: string[];
  location: string;
  declaredLevel: string;
  signals: RecordSignal[];
  topics: TopicEvidence[];
  strongAreas: string[];
  weakAreas: string[];
  lessonsCompleted: number;
  resourcesCompleted: number;
  quizzesTaken: number;
  averageQuizScore: number;
  recommendedStartStage: string;
  priorityTopics: string[];
  masteredTopics: string[];
  confidence: number;
  summary: string;
  updatedAt: string;
}

/// The three boxes: what you follow, what you want, what you are looking for.
///
/// Interests and goals are both required — the feed is ranked on them, and without either there
/// is nothing to rank by. Opportunity preferences are optional.
export function personalise(input: {
  interests: string[];
  goals: string[];
  opportunityPreferences: string[];
  persona?: PersonaType;
}) {
  return request<{
    isPersonalised: boolean;
    interests: string[];
    goals: string[];
    opportunityPreferences: string[];
    persona: string;
  }>("/api/me/personalise", { method: "POST", body: JSON.stringify(input) });
}

/// The profiles on this account, and which one is in use.
///
/// Each carries its own path, feed, saved items and history — that was already true of the data
/// model, since everything is keyed by profile id. Switching is therefore a change of context,
/// not a filter, which is why the client has to drop every cached query when it happens.
export interface ProfileSummary {
  id: string;
  label: string;
  persona: string;
  primaryGoal: string;
  interests: string[];
  onboardingComplete: boolean;
  createdAt: string;
  isActive: boolean;
}

export function getProfiles() {
  return request<{ activeProfileId: string | null; profiles: ProfileSummary[] }>("/api/me/profiles");
}

export function createProfile(persona: PersonaType, label?: string) {
  return request<{ id: string; label: string; persona: string; onboardingComplete: boolean }>("/api/me/profiles", {
    method: "POST",
    body: JSON.stringify({ persona, label: label ?? null }),
  });
}

export function activateProfile(profileId: string) {
  return request<void>(`/api/me/profiles/${profileId}/activate`, { method: "POST" });
}

export function getLearningRecord() {
  return request<LearningRecord>("/api/me/learning-record");
}

// "This is not about me." Returns the rebuilt record so the caller can show the corrected
// version rather than guessing at what changed.
export function correctLearningRecord(term: string) {
  return request<LearningRecord>("/api/me/learning-record/corrections", {
    method: "POST",
    body: JSON.stringify({ term }),
  });
}

export interface FollowUpSuggestion {
  id: string;
  kind: string;
  prompt: string;
  detail: string | null;
  action: "addInterest" | "setFocus" | "editProfile" | "explore" | string;
  actionLabel: string;
  value: string | null;
  items?: string[];
}

export function getFollowUps() {
  return request<FollowUpSuggestion[]>("/api/me/follow-ups");
}

// Ask Radar conversation persistence — saved on the account so it survives reloads and devices.
export function getAskHistory() {
  return request<ChatMessage[]>("/api/ask/history");
}

export function clearAskHistory() {
  return request<void>("/api/ask/history", { method: "DELETE" });
}

// Server-side fetch + extract for "Summarize link" — the page is retrieved on the backend, not
// trusted from the client.
export function summarizeLink(url: string) {
  return request<{ summary: string }>("/api/ask/summarize-link", {
    method: "POST",
    body: JSON.stringify({ url }),
  });
}

/// What the "bring your own material" lane can do in this deployment.
///
/// Recording needs a transcription key. Rather than offering the card and failing after someone
/// has recorded a lecture, the entry screen asks first and disables it with a reason.
export interface AskCapabilities {
  upload: boolean;
  link: boolean;
  record: boolean;
}

export function getAskCapabilities() {
  return request<AskCapabilities>("/api/ask/capabilities");
}

// Multipart, like summarizeFile — cannot go through request(), which forces a JSON content type.
export async function transcribeAudio(blob: Blob, fileName = "recording.webm"): Promise<{ text: string }> {
  const token = getToken();
  const form = new FormData();
  form.append("audio", blob, fileName);

  const res = await fetch(`${API_BASE}/api/ask/transcribe`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: form,
  });
  const isJson = res.headers.get("content-type")?.includes("application/json");
  const body = isJson ? await res.json() : null;
  if (!res.ok) throw new ApiError(res.status, body?.error ?? body?.title ?? res.statusText);
  return body as { text: string };
}

export interface SummarizeFileResponse {
  requiresSectionSelection?: boolean;
  fileName?: string;
  sections?: string[];
  section?: string;
  message?: string;
  summary?: string;
}

// Multipart upload — cannot go through request() (which forces a JSON content type).
export async function summarizeFile(
  file: File,
  section?: string | null,
  question?: string | null
): Promise<SummarizeFileResponse> {
  const token = getToken();
  const form = new FormData();
  form.append("file", file);
  if (section) form.append("section", section);
  if (question) form.append("question", question);

  const res = await fetch(`${API_BASE}/api/ask/summarize-file`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: form,
  });
  const isJson = res.headers.get("content-type")?.includes("application/json");
  const body = isJson ? await res.json() : null;
  if (!res.ok) throw new ApiError(res.status, body?.error ?? body?.title ?? res.statusText);
  return body as SummarizeFileResponse;
}

/** Explicitly suppresses a topic — recorded against every source that already holds that term. */
export function removeSignalTerm(term: string) {
  return request<void>(`/api/me/signals?term=${encodeURIComponent(term)}`, { method: "DELETE" });
}

// ── Today ────────────────────────────────────────────────────────────────

export function getToday() {
  return request<NavigatorFocus>("/api/today");
}

// ── Feed ─────────────────────────────────────────────────────────────────

/// The feed is keyset-paginated, not offset-paginated: the server returns the items plus an opaque
/// `nextCursor`, and you pass that back to continue. Offsets were dropped because the feed grows
/// while it is read, so page numbers silently duplicate or skip items.
///
/// `fields` asks for a sparse fieldset — only name what you actually render. It is an explicit
/// whitelist server-side, and an unknown name is a 400 rather than a quiet omission.
export interface GetFeedOptions {
  cursor?: string | null;
  limit?: number;
  fields?: readonly string[];
}

/// Fields a feed *row* actually renders. The full document carries podcast chapters, transcripts,
/// paper metadata and persona breakdowns that no list view reads — asking for just these is the
/// difference between a few KB and tens of KB per page. Detail pages still fetch the whole item.
/// Keep this in step with the server-side whitelist in FeedController.FeedFieldProjectors.
export const FEED_CARD_FIELDS = [
  "id",
  "type",
  "title",
  "signal",
  "source",
  "topic",
  "secondaryTopics",
  "layer",
  "credibilityTier",
  "publishedAt",
  "whyItMatters",
  "whyYoureSeeingThis",
  "personalizedWhy",
  "nextMove",
  "matchedSignals",
  "aiSummary",
  "isSaved",
  "tags",
  "opportunities",
  "audioUrl",
  "estimatedReadTime",
  "estimatedWatchTime",
  "url",
  "thumbnailUrl",
] as const;

export function getFeed(type: ContentType | null, options: GetFeedOptions = {}) {
  const params = new URLSearchParams();
  if (type) params.set("type", type);
  if (options.cursor) params.set("cursor", options.cursor);
  if (options.limit) params.set("limit", String(options.limit));
  if (options.fields?.length) params.set("fields", options.fields.join(","));
  return request<Page<ContentItem>>(`/api/feed?${params.toString()}`);
}

export function getFeedItem(id: string) {
  return request<ContentItem>(`/api/feed/${id}`);
}

export function saveFeedItem(id: string) {
  return request<void>(`/api/feed/${id}/save`, { method: "POST" });
}

export function unsaveFeedItem(id: string) {
  return request<void>(`/api/feed/${id}/save`, { method: "DELETE" });
}

export function dismissFeedItem(id: string) {
  return request<void>(`/api/feed/${id}/dismiss`, { method: "POST" });
}

// Brings every dismissed item back. Offered from the empty feed, which can now tell the user that
// their own dismissals are what emptied it.
export function restoreDismissedFeedItems() {
  return request<{ restored: number }>("/api/feed/dismissed", { method: "DELETE" });
}

export function getSavedItems() {
  return request<ContentItem[]>("/api/feed/saved");
}

export interface PersonalizedWhy {
  text: string;
  whatToKnow: string;
  nextMove: string;
  relevanceScore: number;
  relevanceConfidence: number;
  matchedSignals: string[];
  isPersonalized: boolean;
  isHelpful: boolean | null;
}

export function getPersonalizedWhy(id: string) {
  return request<PersonalizedWhy>(`/api/feed/${id}/why`);
}

export function rateWhy(id: string, helpful: boolean) {
  return request<void>(`/api/feed/${id}/why-rating`, {
    method: "POST",
    body: JSON.stringify({ helpful }),
  });
}

export function reportFeedItem(id: string, reason: ReportReason, note?: string) {
  return request<void>(`/api/feed/${id}/report`, {
    method: "POST",
    body: JSON.stringify({ reason, note }),
  });
}

// ── Reports (quality review) ────────────────────────────────────────────

export function getOpenReports() {
  return request<ContentReport[]>("/api/reports");
}

export function getSourceReportSummary(days = 30) {
  return request<SourceReportSummary[]>(`/api/reports/sources?days=${days}`);
}

export function resolveReport(id: string) {
  return request<void>(`/api/reports/${id}/resolve`, { method: "POST" });
}

// ── Roadmap ──────────────────────────────────────────────────────────────

export function addTopicToActiveRoadmap(topic: string) {
  return request<void>("/api/roadmaps/active/topics", {
    method: "POST",
    body: JSON.stringify({ topic }),
  });
}

// ── Capture ──────────────────────────────────────────────────────────────

export function captureItem(mode: CaptureMode, input: string) {
  return request<CapturedItem>("/api/capture", {
    method: "POST",
    body: JSON.stringify({ mode, input }),
  });
}

export function getRecentCaptures() {
  return request<CapturedItem[]>("/api/capture/recent");
}

// ── Weekly brief ─────────────────────────────────────────────────────────

export function getWeeklyBrief() {
  return request<WeeklyBrief>("/api/weekly-brief");
}

// ── Sources ──────────────────────────────────────────────────────────────

export function getSource(id: string) {
  return request<SourceProfile>(`/api/sources/${id}`);
}

export function toggleSourceFollow(id: string) {
  return request<void>(`/api/sources/${id}/follow`, { method: "POST" });
}

export function toggleSourceWeeklyBrief(id: string) {
  return request<void>(`/api/sources/${id}/weekly-brief`, { method: "POST" });
}

export function toggleSourcePrioritise(id: string) {
  return request<void>(`/api/sources/${id}/prioritise`, { method: "POST" });
}

// ── Topics ───────────────────────────────────────────────────────────────

export function getTopic(id: string) {
  return request<TopicProfile>(`/api/topics/${id}`);
}

export function toggleTopicFollow(id: string) {
  return request<void>(`/api/topics/${id}/follow`, { method: "POST" });
}

export function toggleTopicAlert(id: string, alertIndex: number) {
  return request<void>(`/api/topics/${id}/alerts/${alertIndex}`, { method: "POST" });
}

// ── Events ───────────────────────────────────────────────────────────────
// Fire-and-forget: a logging failure must never break the feature the user is using.

export interface LogEventOptions {
  contentItemId?: string;
  opportunityId?: string;
  clipId?: string;
  position?: number;
  metadata?: Record<string, string>;
}

export function logEvent(type: AnalyticsEventType, options: LogEventOptions = {}) {
  request<void>("/api/events", {
    method: "POST",
    body: JSON.stringify({ type, ...options }),
  }).catch(() => {});
}

export function getEventsSummary(days = 7) {
  return request<EventsSummary>(`/api/events/summary?days=${days}`);
}

// ── Roadmap / Learn ──────────────────────────────────────────────────────

export function getRoadmaps() {
  return request<GrowthRoadmap[]>("/api/roadmaps");
}

export function getActiveRoadmap() {
  return request<GrowthRoadmap>("/api/roadmaps/active");
}

export function completeLesson(roadmapId: string, moduleId: string, lessonId: string) {
  return request<void>(`/api/roadmaps/${roadmapId}/modules/${moduleId}/lessons/${lessonId}/complete`, {
    method: "POST",
  });
}

export function completeLearningResource(roadmapId: string, resourceId: string) {
  return request<void>(`/api/roadmaps/${roadmapId}/resources/${resourceId}/complete`, {
    method: "POST",
  });
}

export function completeLearningExercise(roadmapId: string, resourceId: string) {
  return request<void>(`/api/roadmaps/${roadmapId}/exercises/${resourceId}/complete`, {
    method: "POST",
  });
}

export function recordQuizResult(roadmapId: string, topic: string, stage: string, scorePercent: number) {
  return request<GrowthRoadmap>(`/api/roadmaps/${roadmapId}/quizzes`, {
    method: "POST",
    body: JSON.stringify({ topic, stage, scorePercent }),
  });
}

export function setRoadmapStage(roadmapId: string, stage: string) {
  return request<void>(`/api/roadmaps/${roadmapId}/stage`, {
    method: "POST",
    body: JSON.stringify({ stage }),
  });
}

export function getRoadmapProgress(roadmapId: string) {
  return request<{ progressPercent: number }>(`/api/roadmaps/${roadmapId}/progress`);
}

/// Replaces the active roadmap with an AI-built pathway tailored to the profile.
/// Builds a section from a document the learner uploaded.
///
/// Multipart, so it cannot go through request(), which forces a JSON content type.
export async function addPathSectionFromDocument(file: File) {
  const token = getToken();
  const form = new FormData();
  form.append("file", file);

  const res = await fetch(`${API_BASE}/api/roadmaps/sections/from-document`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: form,
  });

  const isJson = res.headers.get("content-type")?.includes("application/json");
  const body = isJson ? await res.json() : null;
  if (!res.ok) throw new ApiError(res.status, body?.error ?? body?.title ?? res.statusText);

  return body as { roadmap: GrowthRoadmap; detected: { subject: string; outcome?: string; level?: string } };
}

/// Adds one section to the path, built from what the learner answered.
///
/// Deliberately not `generateLearningPathway`, which reads the profile and returns a whole
/// four-stage pathway — that is how a Computer Science student was handed "Foundations of
/// Computer Science" without being asked a single question.
export function addPathSection(subject: string, level: string, outcome?: string | null) {
  return request<GrowthRoadmap>("/api/roadmaps/sections", {
    method: "POST",
    body: JSON.stringify({ subject, level, outcome: outcome || null }),
  });
}

export function generateLearningPathway() {
  return request<GrowthRoadmap>("/api/roadmaps/generate", { method: "POST" });
}

// ── Learn Hub ─────────────────────────────────────────────────────────────

export function getLearnHub(subInterest?: string, stage?: string) {
  const params = new URLSearchParams();
  if (subInterest && subInterest !== "All Sub-Interests") params.set("subInterest", subInterest);
  if (stage) params.set("stage", stage);
  const q = params.toString();
  return request<LearnHubPayload>(`/api/learn-hub${q ? `?${q}` : ""}`);
}

export function completeHubResource(resourceId: string) {
  return request<void>(`/api/learn-hub/resources/${resourceId}/complete`, { method: "POST" });
}

export function toggleSaveHubResource(resourceId: string) {
  return request<void>(`/api/learn-hub/resources/${resourceId}/save`, { method: "POST" });
}

export function recordNodeActivity(nodeId: string, activityType: string, scorePercent: number) {
  return request<void>("/api/learn-hub/nodes/activity", {
    method: "POST",
    body: JSON.stringify({ nodeId, activityType, scorePercent }),
  });
}

// ── Mentor ───────────────────────────────────────────────────────────────

export function streamMentorChat(message: string, history: ChatMessage[], onChunk: (text: string) => void, signal?: AbortSignal) {
  return streamChat("/api/mentor/chat/stream", message, history, onChunk, signal);
}

export function generateQuiz(topic: string, questionCount: number = 5, difficulty: string = "Adaptive") {
  return request<MentorQuiz>("/api/mentor/quiz", {
    method: "POST",
    body: JSON.stringify({ topic, questionCount, difficulty }),
  });
}

export function submitQuizAnswer(quizId: string, questionIndex: number, answerIndex: number, textAnswer?: string) {
  return request<MentorQuiz>(`/api/mentor/quiz/${quizId}/answer`, {
    method: "POST",
    body: JSON.stringify({ questionIndex, answerIndex, textAnswer }),
  });
}

export function createStudyPlan(topic: string, goal: string, weeks: number = 6) {
  return request<MentorStudyPlan>("/api/mentor/study-plan", {
    method: "POST",
    body: JSON.stringify({ topic, goal, weeks }),
  });
}

export function getActiveStudyPlan() {
  return request<MentorStudyPlan | null>("/api/mentor/study-plan/active");
}

export function adjustStudyPlan(planId: string, reason: string) {
  return request<MentorStudyPlan>(`/api/mentor/study-plan/${planId}/adjust`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}

export function toggleStudyTask(planId: string, weekNumber: number, taskIndex: number) {
  return request<{ success: boolean }>(`/api/mentor/study-plan/${planId}/toggle-task`, {
    method: "POST",
    body: JSON.stringify({ weekNumber, taskIndex }),
  });
}

export function reviewWork(workTitle: string, workContent: string, reviewType: string, revisedFromId?: string) {
  return request<MentorWorkReview>("/api/mentor/review", {
    method: "POST",
    body: JSON.stringify({ workTitle, workContent, reviewType, revisedFromId }),
  });
}

export function getUserReviews() {
  return request<MentorWorkReview[]>("/api/mentor/reviews");
}

export function getLearningMemory() {
  return request<PersonalLearningMemory>("/api/mentor/memory");
}

export function getTopicMasteries() {
  return request<TopicMastery[]>("/api/mentor/mastery");
}

export function getTodayLearning() {
  return request<DailyLearningCard>("/api/mentor/today");
}

export function runMentorChallenge(topic?: string) {
  return request<ChallengeResult>("/api/mentor/challenge", {
    method: "POST",
    body: JSON.stringify({ topic }),
  });
}

export function getSpacedRevisions() {
  return request<SpacedRevisionItem[]>("/api/mentor/spaced-revision");
}

export function completeSpacedRevision(revisionId: string, wasRemembered: boolean = true) {
  return request<{ success: boolean }>(`/api/mentor/spaced-revision/${revisionId}/complete`, {
    method: "POST",
    body: JSON.stringify({ wasRemembered }),
  });
}

export function getAiEngineStatus() {
  return request<AiEngineStats>("/api/ai/status");
}

// ── Ask Radar ────────────────────────────────────────────────────────────

// One-shot completion (e.g. Project Studio's "Ask Radar for tips") — just wants a finished
// string, not a typing effect, so it stays on the plain request/response endpoint.
export function sendAskRadarChat(message: string, history: ChatMessage[]) {
  return request<ChatMessage>("/api/ask/chat", {
    method: "POST",
    body: JSON.stringify({ message, history }),
  });
}

export function streamAskRadarChat(message: string, history: ChatMessage[], onChunk: (text: string) => void, signal?: AbortSignal) {
  return streamChat("/api/ask/chat/stream", message, history, onChunk, signal);
}

// ── Project Studio ───────────────────────────────────────────────────────

export function getProjectTemplates() {
  return request<ProjectTemplate[]>("/api/projects/templates");
}

export function getUserProjects() {
  return request<StudioProject[]>("/api/projects");
}

/// Creates a project that is not based on a template. The endpoint has existed since the studio
/// was built, but nothing ever called it, so there was no way to start your own project.
export function createProject(title: string, description: string, category: string) {
  return request<StudioProject>("/api/projects", {
    method: "POST",
    body: JSON.stringify({ title, description, category }),
  });
}

export function startProject(templateId: string) {
  return request<StudioProject>(`/api/projects/${templateId}/start`, { method: "POST" });
}

export function completeProject(projectId: string) {
  return request<void>(`/api/projects/${projectId}/complete`, { method: "POST" });
}

/// Builds and persists the project's execution plan. Idempotent — re-calling returns the stored one.
export function generateProjectPlan(projectId: string) {
  return request<StudioProject>(`/api/projects/${projectId}/plan`, { method: "POST" });
}

export function setProjectVisibility(projectId: string, isPublic: boolean) {
  return request<void>(`/api/projects/${projectId}/visibility`, {
    method: "POST",
    body: JSON.stringify({ isPublic }),
  });
}

export function getPublicProject(projectId: string) {
  return request<StudioProject>(`/api/projects/${projectId}/public`);
}

// ── Notebook ─────────────────────────────────────────────────────────────

export function getNotes(archived = false) {
  return request<Note[]>(`/api/notes${archived ? "?archived=true" : ""}`);
}

export function getNote(id: string) {
  return request<Note>(`/api/notes/${id}`);
}

export function createNote(title: string, body: string) {
  return request<Note>("/api/notes", {
    method: "POST",
    body: JSON.stringify({ title, body }),
  });
}

/// Partial update: send only what changed. Ticking a checkbox or pinning should not have to
/// resend the whole note, which would let one small action overwrite a concurrent edit.
export function updateNote(id: string, patch: Partial<Pick<Note, "title" | "body" | "tags" | "isPinned" | "isArchived" | "color" | "checklist">>) {
  return request<Note>(`/api/notes/${id}`, {
    method: "PUT",
    body: JSON.stringify(patch),
  });
}

export function deleteNote(id: string) {
  return request<void>(`/api/notes/${id}`, { method: "DELETE" });
}

// ── Opportunities ────────────────────────────────────────────────────────

export function getOpportunities(
  type?: OpportunityType | null,
  pageOrFilters?:
    | number
    | {
        region?: string | null;
        goal?: string | null;
        urgency?: string | null;
        matchTier?: string | null;
        fields?: readonly string[];
        page?: number;
        pageSize?: number;
      },
  pageSize = 20,
  fields?: readonly string[],
) {
  const params = new URLSearchParams();
  if (type) params.set("type", type);

  if (typeof pageOrFilters === "object" && pageOrFilters !== null) {
    if (pageOrFilters.region) params.set("region", pageOrFilters.region);
    if (pageOrFilters.goal) params.set("goal", pageOrFilters.goal);
    if (pageOrFilters.urgency) params.set("urgency", pageOrFilters.urgency);
    if (pageOrFilters.matchTier) params.set("matchTier", pageOrFilters.matchTier);
    params.set("page", String(pageOrFilters.page ?? 1));
    params.set("pageSize", String(pageOrFilters.pageSize ?? pageSize));
    if (pageOrFilters.fields?.length) params.set("fields", pageOrFilters.fields.join(","));
  } else {
    const page = typeof pageOrFilters === "number" ? pageOrFilters : 1;
    params.set("page", String(page));
    params.set("pageSize", String(pageSize));
    if (fields?.length) params.set("fields", fields.join(","));
  }

  return request<Opportunity[]>(`/api/opportunities?${params.toString()}`);
}

export function getDailyOpportunities() {
  return request<DailyOpportunityFeed>("/api/opportunities/daily");
}

export function getOpportunityById(id: string) {
  return request<Opportunity>(`/api/opportunities/${id}`);
}

export function updateOpportunityStatus(id: string, status: OpportunityTrackingStatus, notes?: string) {
  return request<void>(`/api/opportunities/${id}/status`, {
    method: "POST",
    body: JSON.stringify({ status, notes }),
  });
}

export function toggleOpportunityReminder(id: string, reminderSet: boolean) {
  return request<void>(`/api/opportunities/${id}/reminder`, {
    method: "POST",
    body: JSON.stringify({ reminderSet }),
  });
}

export function getOpportunityPipeline() {
  return request<Opportunity[]>("/api/opportunities/pipeline");
}

export function saveOpportunity(id: string) {
  return request<void>(`/api/opportunities/${id}/save`, { method: "POST" });
}

export function unsaveOpportunity(id: string) {
  return request<void>(`/api/opportunities/${id}/save`, { method: "DELETE" });
}

export function markOpportunityApplied(id: string) {
  return request<void>(`/api/opportunities/${id}/applied`, { method: "POST" });
}

// ── Home ─────────────────────────────────────────────────────────────────

export function getHome() {
  return request<HomeBrief>("/api/home");
}











// ── Compare ──────────────────────────────────────────────────────────────

export function getComparison(id: string) {
  return request<PolicyComparison>(`/api/comparisons/${id}`);
}

// ── Plans ────────────────────────────────────────────────────────────────

export function getPlans() {
  return request<SubscriptionPlan[]>("/api/plans");
}

export function getFocus() {
  return request<{ paths: import("./types").InterestPath[]; suggestedDominantInterests: string[] }>("/api/me/focus");
}

// ── Admin ─────────────────────────────────────────────────────────────────

export interface AdminSummary {
  users: number;
  publishedContent: number;
  openReports: number;
  role: "PlatformAdmin" | "SuperAdmin";
}

export interface AdminQueueItem {
  id: string;
  title: string;
  signal: string;
  source: string;
  publishedAt: string;
  credibilityTier: number;
  isEnriched: boolean;
  type: string;
}

export interface AdminSource {
  id: string;
  name: string;
  domain: string;
  type: string;
  itemsInRadar: number;
  itemsRead: number;
  publishFrequency: string;
  active: boolean;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  persona: string;
  goal: string;
  region: string;
  onboardingComplete: boolean;
  roadmapProgressPercent: number;
  createdAt: string;
}

export interface AdminReport {
  id: string;
  signal: string;
  source: string;
  reason: string;
  note: string | null;
  createdAt: string;
}

export function getAdminSummary() {
  return request<AdminSummary>("/api/admin/summary");
}

export function getAdminQueue() {
  return request<AdminQueueItem[]>("/api/admin/queue");
}

export function getAdminSources() {
  return request<AdminSource[]>("/api/admin/sources");
}

export function getAdminUsers() {
  return request<AdminUser[]>("/api/admin/users");
}

export function getAdminReports() {
  return request<AdminReport[]>("/api/admin/reports");
}

export function resolveAdminReport(id: string) {
  return request<void>(`/api/admin/reports/${id}/resolve`, { method: "POST" });
}

// ── Research discovery ───────────────────────────────────────────────────
// Every result comes from OpenAlex, which means every result has a DOI a reader can resolve.
// A hand-written catalogue used to be returned ahead of these; six of its eight DOIs were 404
// at doi.org, and a citation endpoint would format any of them into a reference list. Nothing
// here is hard-coded, and an empty result is the honest answer when nothing matches.

export function searchResearch(params: {
  q: string;
  yearFrom?: number;
  paperType?: string;
  page?: number;
  pageSize?: number;
}) {
  const query = new URLSearchParams({ q: params.q });
  if (params.yearFrom) query.set("yearFrom", String(params.yearFrom));
  if (params.paperType && params.paperType !== "all") query.set("paperType", params.paperType);
  if (params.page) query.set("page", String(params.page));
  query.set("pageSize", String(params.pageSize ?? 20));

  return request<ContentItem[]>(`/api/research/search?${query.toString()}`);
}

export function getPaper(id: string) {
  return request<ContentItem>(`/api/research/${encodeURIComponent(id)}`);
}

export function getPaperCitation(id: string, style: CitationStyle) {
  return request<{ paperId: string; style: string; citation: string }>(
    `/api/research/${encodeURIComponent(id)}/citation?style=${style}`,
  );
}

export function explainPaper(id: string) {
  return request<{ paperId: string; explanation: string }>(
    `/api/research/${encodeURIComponent(id)}/explain`,
    { method: "POST" },
  );
}

export function findResearchGaps(id: string) {
  return request<{ paperId: string; gaps: string }>(
    `/api/research/${encodeURIComponent(id)}/gaps`,
    { method: "POST" },
  );
}

export function getRelatedPapers(id: string) {
  return request<ContentItem[]>(`/api/research/${encodeURIComponent(id)}/related`);
}
