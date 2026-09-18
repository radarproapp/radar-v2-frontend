// Mirrors RadarV2/Models/*.cs — the C# files are the source of truth.
// Enums are serialised as strings by the API (JsonStringEnumConverter).

export type PersonaType = "Student" | "Graduate" | "YoungProfessional" | "Entrepreneur" | "Researcher";

export type ContentType =
  | "Article"
  | "Podcast"
  | "Video"
  | "ResearchPaper"
  | "Book"
  | "Documentation"
  | "Framework"
  | "PolicyPaper"
  | "Essay";

export type ContentLayer =
  | "Policy"
  | "Academic"
  | "Ideas"
  | "Learning"
  | "Video"
  | "Skills"
  | "RealEstate"
  | "Law"
  | "Literature"
  | "Transportation"
  | "Gaming"
  | "Art"
  | "History"
  | "Sports"
  | "Music"
  | "Film"
  | "Science"
  | "Environment"
  | "Travel"
  | "Medicine"
  | "Fashion"
  | "Lifestyle"
  | "Faith"
  | "Philosophy"
  | "Education"
  | "Finance"
  | "Energy"
  | "Agriculture"
  | "Industry"
  | "Career";

export type OpportunityType =
  | "Job"
  | "Internship"
  | "Scholarship"
  | "GraduateProgramme"
  | "ResearchGrant"
  | "Competition"
  | "StartupAccelerator"
  | "Fellowship"
  | "RemoteJob";

export interface Opportunity {
  id: string;
  type: OpportunityType;
  title: string;
  organisation: string;
  logoUrl: string;
  description: string;
  deadline: string | null;
  requirements: string[];
  matchScorePercent: number;
  url: string;
  location: string | null;
  isRemote: boolean;
  isSaved: boolean;
  discoveredAt: string;
  daysUntilDeadline: number;
}

export interface NotificationPrefs {
  weeklyBrief: boolean;
  opportunityDeadlines: boolean;
  roadmapReminders: boolean;
}

export interface UserStats {
  learningStreakDays: number;
  savedResourcesCount: number;
  roadmapProgressPercent: number;
  opportunitiesApplied: number;
  projectsCompleted: number;
  lessonsCompleted: number;
  articlesRead: number;
  podcastsFinished: number;
  videosWatched: number;
  researchPapersRead: number;
  lastActivityDate: string | null;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  persona: PersonaType;
  primaryGoal: string;
  interests: string[];
  region: string;
  city: string;
  personaDetails: Record<string, string>;
  notifications: NotificationPrefs;
  createdAt: string;
  onboardingComplete: boolean;
  stats: UserStats;
}

export interface ChapterBreakdown {
  title: string;
  timestamp: string; // TimeSpan serialised as "hh:mm:ss"
  summary: string | null;
}

export interface ContentItem {
  id: string;
  type: ContentType;
  title: string;
  signal: string;
  topic: string;
  whatHappened: string;
  source: string;
  sourceLogoUrl: string;
  url: string;
  aiSummary: string;
  keyInsights: string[];
  whyItMatters: string;
  tags: string[];
  publishedAt: string;
  estimatedReadTime: string | null;
  estimatedWatchTime: string | null;
  isSaved: boolean;
  thumbnailUrl: string | null;
  author: string | null;
  whoShouldListen: string | null;
  keyLessons: string[];
  chapters: ChapterBreakdown[];
  keyConcepts: string[];
  audioUrl: string | null;
  transcriptText: string | null;
  durationSeconds: number | null;
  authors: string[];
  journal: string | null;
  doi: string | null;
  keyFindings: string | null;
  methodology: string | null;
  relatedPaperIds: string[];
  layer: ContentLayer;
  credibilityTier: number;
  ingestionSourceId: string | null;
  urlHash: string | null;
  isEnriched: boolean;
  personaImpact: Record<string, string>;
  opportunities: string[];
  recommendedActions: string[];
}

export interface NavigatorCard {
  cardType: "Learn" | "Read" | "Watch" | "Listen" | "Apply" | "Build";
  title: string;
  subtitle: string;
  whyItMatters: string;
  estimatedTime: string | null;
  aiSummary: string | null;
  actionUrl: string | null;
  contentItemId: string | null;
  opportunityId: string | null;
  matchScorePercent: number | null;
  deadlineDays: number | null;
}

export interface NavigatorFocus {
  learn: NavigatorCard;
  read: NavigatorCard;
  watch: NavigatorCard;
  listen: NavigatorCard;
  apply: NavigatorCard;
  build: NavigatorCard;
  generatedAt: string;
}

export type ReportReason = "Incorrect" | "LowQuality" | "BrokenLink" | "NotRelevantToLayer" | "Other";

export interface ContentReport {
  id: string;
  userId: string;
  contentItemId: string;
  itemSignal: string;
  source: string;
  credibilityTier: number;
  reason: ReportReason;
  note: string | null;
  isResolved: boolean;
  createdAt: string;
}

export interface SourceReportSummary {
  source: string;
  credibilityTier: number;
  reportCount: number;
  lastReportedAt: string;
}

export interface EventsSummary {
  eventCounts: Record<string, number>;
  whyHelpfulRatings: {
    helpful: number;
    notHelpful: number;
    helpfulRatePercent: number | null;
  };
}

export type AnalyticsEventType =
  | "Impression"
  | "Open"
  | "Save"
  | "Unsave"
  | "NotRelevant"
  | "AddToRoadmap"
  | "CaptureCreated"
  | "ClipSaved"
  | "WhyRatedHelpful"
  | "WhyRatedNotHelpful"
  | "Reported";

export type CaptureMode = "Link" | "Note" | "Voice" | "Photo";

export interface CapturedItem {
  id: string;
  userId: string;
  mode: CaptureMode;
  input: string;
  signal: string | null;
  whyItMatters: string | null;
  aiSummary: string | null;
  source: string | null;
  linkedRoadmapId: string | null;
  isProcessing: boolean;
  capturedAt: string;
}

export interface Clip {
  id: string;
  userId: string;
  tag: string;
  signal: string;
  whyItMatters: string;
  source: string;
  contentItemId: string | null;
  isSaved: boolean;
  publishedAt: string;
}

export interface WeeklyBrief {
  id: string;
  userId: string;
  weekOf: string;
  topArticles: ContentItem[];
  topVideos: ContentItem[];
  topPodcasts: ContentItem[];
  weeklyRecommendation: string;
}

export interface SourceProfile {
  id: string;
  name: string;
  abbreviation: string;
  type: string;
  domain: string;
  trustNote: string;
  aiEdge: string | null;
  itemsInRadar: number;
  itemsRead: number;
  publishFrequency: string;
  isFollowing: boolean;
  includeInWeeklyBrief: boolean;
  prioritiseInFeed: boolean;
  recentItems: ContentItem[];
}

export interface TopicAlert {
  label: string;
  note: string;
  isEnabled: boolean;
}

export interface TopicProfile {
  id: string;
  name: string;
  summary: string;
  summarySource: string;
  summaryUpdatedAt: string;
  aiEdge: string | null;
  itemsInRadar: number;
  itemsThisWeek: number;
  sourceCount: number;
  isFollowing: boolean;
  onRoadmap: boolean;
  roadmapModuleName: string | null;
  roadmapContents: string[];
  alerts: TopicAlert[];
  recentItems: ContentItem[];
}

// ── Roadmap / Learn ──────────────────────────────────────────────────────

export interface RoadmapLesson {
  id: string;
  title: string;
  body: string;
  order: number;
  isCompleted: boolean;
  estimatedTime: string | null;
}

export interface RoadmapModule {
  id: string;
  title: string;
  description: string;
  order: number;
  isCompleted: boolean;
  isLocked: boolean;
  lessons: RoadmapLesson[];
  contentItemIds: string[];
}

export interface GrowthRoadmap {
  id: string;
  userId: string;
  title: string;
  goal: string;
  modules: RoadmapModule[];
  progressPercent: number;
  createdAt: string;
  isActive: boolean;
}

// ── Mentor ───────────────────────────────────────────────────────────────

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  suggestedResources: ContentItem[];
}

export interface MentorQuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  userAnswered: boolean | null;
  userAnswerIndex: number | null;
}

export interface MentorQuiz {
  id: string;
  topic: string;
  questions: MentorQuizQuestion[];
  currentQuestionIndex: number;
  score: number;
  isComplete: boolean;
  createdAt: string;
}

export interface MentorStudyTask {
  title: string;
  description: string;
  resourceType: string;
  estimatedTime: string | null;
  isCompleted: boolean;
}

export interface MentorStudyWeek {
  weekNumber: number;
  theme: string;
  tasks: MentorStudyTask[];
  isCompleted: boolean;
}

export interface MentorStudyPlan {
  id: string;
  topic: string;
  goal: string;
  weeks: MentorStudyWeek[];
  createdAt: string;
}

export interface MentorWorkReview {
  id: string;
  workTitle: string;
  workContent: string;
  reviewType: string;
  feedback: string;
  strengths: string[];
  improvements: string[];
  suggestions: string[];
  reviewedAt: string;
}

// ── Project Studio ───────────────────────────────────────────────────────

export interface ProjectTemplate {
  id: string;
  title: string;
  description: string;
  category: string;
  estimatedTime: string;
  tags: string[];
}

export interface StudioProject {
  id: string;
  templateId: string;
  title: string;
  description: string;
  userId: string;
  isCompleted: boolean;
  isPublic: boolean;
  createdAt: string;
  completedAt: string | null;
}

// ── Notebook ─────────────────────────────────────────────────────────────

export interface Note {
  id: string;
  userId: string;
  title: string;
  body: string;
  tags: string[];
  linkedItemIds: string[];
  linkedSourceIds: string[];
  createdAt: string;
  editedAt: string;
}

// ── Library ──────────────────────────────────────────────────────────────

export interface LibraryDocument {
  id: string;
  title: string;
  year: number;
  publisher: string;
  documentType: string;
  region: string;
  category: string;
  subtopic: string;
  url: string;
  isAfrica: boolean;
  addedAt: string;
}

// ── Compare ──────────────────────────────────────────────────────────────

export type ComparisonRowTag = "Same" | "Differs" | "Context";

export interface ComparisonRow {
  label: string;
  valueA: string;
  valueB: string;
  labelA: string | null;
  labelB: string | null;
  tag: ComparisonRowTag;
}

export interface PolicyComparison {
  id: string;
  userId: string;
  title: string;
  items: string[];
  summary: string;
  whyItMatters: string;
  aiEdge: string | null;
  rows: ComparisonRow[];
  disclaimer: string | null;
  createdAt: string;
}

// ── Plans ────────────────────────────────────────────────────────────────

export interface SubscriptionPlan {
  id: string;
  name: string;
  isCurrent: boolean;
  isPro: boolean;
  monthlyPrice: number;
  yearlyPrice: number;
  currency: string;
  features: string[];
  badge: string | null;
  note: string | null;
}
