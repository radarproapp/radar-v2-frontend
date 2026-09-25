import type {
  AnalyticsEventType,
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
  SourceProfile,
  SourceReportSummary,
  StudioProject,
  SubscriptionPlan,
  TopicProfile,
  UserProfile,
  WeeklyBrief,
} from "./types";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:5080";
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

// ── Me / profile ─────────────────────────────────────────────────────────

export interface UpdateProfileRequest {
  name?: string;
  persona?: string;
  primaryGoal?: string;
  region?: string;
  city?: string;
  interests?: string[];
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

// ── Today ────────────────────────────────────────────────────────────────

export function getToday() {
  return request<NavigatorFocus>("/api/today");
}

// ── Feed ─────────────────────────────────────────────────────────────────

export function getFeed(type: ContentType | null, page = 1, pageSize = 20) {
  const params = new URLSearchParams();
  if (type) params.set("type", type);
  params.set("page", String(page));
  params.set("pageSize", String(pageSize));
  return request<ContentItem[]>(`/api/feed?${params.toString()}`);
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

export function getOpportunities(type: OpportunityType | null, page = 1, pageSize = 20) {
  const params = new URLSearchParams();
  if (type) params.set("type", type);
  params.set("page", String(page));
  params.set("pageSize", String(pageSize));
  return request<Opportunity[]>(`/api/opportunities?${params.toString()}`);
}

export function saveOpportunity(id: string) {
  return request<void>(`/api/opportunities/${id}/save`, { method: "POST" });
}

export function unsaveOpportunity(id: string) {
  return request<void>(`/api/opportunities/${id}/save`, { method: "DELETE" });
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

// ── Admin ─────────────────────────────────────────────────────────────────

export interface AdminSummary {
  users: number;
  publishedContent: number;
  openReports: number;
  role: "PlatformAdmin" | "SuperAdmin";
}

export function getAdminSummary() {
  return request<AdminSummary>("/api/admin/summary");
}
