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
