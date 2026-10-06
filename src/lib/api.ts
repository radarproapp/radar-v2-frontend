import type {
  AnalyticsEventType,
  Page,
  CaptureMode,
  CapturedItem,
  ChatMessage,
  Clip,
  ContentItem,
  ContentReport,
  ContentType,
  EventsSummary,
  GrowthRoadmap,
  LibraryDocument,
  MentorQuiz,
  MentorStudyPlan,
  MentorWorkReview,
  NavigatorFocus,
  Note,
  Opportunity,
  OpportunityType,
  PolicyComparison,
  ProjectTemplate,
  ReportReason,
  SignalsSummary,
  SourceProfile,
  SourceReportSummary,
  StudioProject,
  SubscriptionPlan,
  TopicProfile,
  UserProfile,
  UserInterestContext,
  WeeklyBrief,
} from "./types";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "https://radar-v2-backend-production.up.railway.app";
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

export interface FollowUpSuggestion {
  id: string;
  kind: string;
  prompt: string;
  detail: string | null;
  action: "addInterest" | "setFocus" | "editProfile" | string;
  actionLabel: string;
  value: string | null;
}

export function getFollowUps() {
  return request<FollowUpSuggestion[]>("/api/me/follow-ups");
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

// ── Clips ────────────────────────────────────────────────────────────────

export function getTodaysClips() {
  return request<Clip[]>("/api/clips/today");
}

export function saveClip(id: string) {
  return request<void>(`/api/clips/${id}/save`, { method: "POST" });
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

export function getRoadmapProgress(roadmapId: string) {
  return request<{ progressPercent: number }>(`/api/roadmaps/${roadmapId}/progress`);
}

/// Replaces the active roadmap with an AI-built pathway tailored to the profile.
export function generateLearningPathway() {
  return request<GrowthRoadmap>("/api/roadmaps/generate", { method: "POST" });
}

// ── Mentor ───────────────────────────────────────────────────────────────

export function streamMentorChat(message: string, history: ChatMessage[], onChunk: (text: string) => void, signal?: AbortSignal) {
  return streamChat("/api/mentor/chat/stream", message, history, onChunk, signal);
}

export function generateQuiz(topic: string, questionCount = 5) {
  return request<MentorQuiz>("/api/mentor/quiz", {
    method: "POST",
    body: JSON.stringify({ topic, questionCount }),
  });
}

export function submitQuizAnswer(quizId: string, questionIndex: number, answerIndex: number) {
  return request<MentorQuiz>(`/api/mentor/quiz/${quizId}/answer`, {
    method: "POST",
    body: JSON.stringify({ questionIndex, answerIndex }),
  });
}

export function createStudyPlan(topic: string, goal: string) {
  return request<MentorStudyPlan>("/api/mentor/study-plan", {
    method: "POST",
    body: JSON.stringify({ topic, goal }),
  });
}

export function getActiveStudyPlan() {
  return request<MentorStudyPlan | null>("/api/mentor/study-plan/active");
}

export function reviewWork(workTitle: string, workContent: string, reviewType: string) {
  return request<MentorWorkReview>("/api/mentor/review", {
    method: "POST",
    body: JSON.stringify({ workTitle, workContent, reviewType }),
  });
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

export function getNotes() {
  return request<Note[]>("/api/notes");
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

export function updateNote(id: string, title: string, body: string, tags: string[]) {
  return request<void>(`/api/notes/${id}`, {
    method: "PUT",
    body: JSON.stringify({ title, body, tags }),
  });
}

export function deleteNote(id: string) {
  return request<void>(`/api/notes/${id}`, { method: "DELETE" });
}

// ── Opportunities ────────────────────────────────────────────────────────

export function getOpportunities(
  type: OpportunityType | null,
  page = 1,
  pageSize = 20,
  fields?: readonly string[],
) {
  const params = new URLSearchParams();
  if (type) params.set("type", type);
  params.set("page", String(page));
  params.set("pageSize", String(pageSize));
  if (fields?.length) params.set("fields", fields.join(","));
  return request<Opportunity[]>(`/api/opportunities?${params.toString()}`);
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

// ── Research ─────────────────────────────────────────────────────────────

export function searchResearch(query: string, yearFrom: number) {
  const params = new URLSearchParams({ q: query, yearFrom: String(yearFrom) });
  return request<ContentItem[]>(`/api/research/search?${params.toString()}`);
}

// ── Library ──────────────────────────────────────────────────────────────

export function getLibraryDocuments(category: string | null, year: number | null, search: string | null) {
  const params = new URLSearchParams();
  if (category) params.set("category", category);
  if (year) params.set("year", String(year));
  if (search) params.set("search", search);
  return request<LibraryDocument[]>(`/api/library?${params.toString()}`);
}

export function getLibraryCategories() {
  return request<string[]>("/api/library/categories");
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
