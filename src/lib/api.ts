import type { ContentItem, ContentType, NavigatorFocus, UserProfile } from "./types";

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

export function getSavedItems() {
  return request<ContentItem[]>("/api/feed/saved");
}

// ── Roadmap ──────────────────────────────────────────────────────────────

export function addTopicToActiveRoadmap(topic: string) {
  return request<void>("/api/roadmaps/active/topics", {
    method: "POST",
    body: JSON.stringify({ topic }),
  });
}
