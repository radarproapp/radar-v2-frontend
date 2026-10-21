// Mirrors RadarV2/Models/*.cs — the C# files are the source of truth.
// Enums are serialised as strings by the API (JsonStringEnumConverter).

export type PersonaType = "Student" | "Graduate" | "YoungProfessional" | "Entrepreneur" | "Researcher";

/// One keyset-paginated page. `nextCursor` is null on the last page, so stop on null rather than
/// inferring the end from a short page. Mirrors RadarV2/Models/Paging.cs.
export interface Page<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
  /// Why the page is empty, when it is. The client cannot work this out for itself: an empty
  /// list looks the same whether nothing has been ingested, the type filter matches nothing, or
  /// the user dismissed it all.
  emptyReason?: FeedEmptyReason;
}

export type FeedEmptyReason =
  | "NotEmpty"
  | "NoContentAtAll"
  | "NoneOfThisType"
  | "EverythingDismissed"
  | "NothingNewRightNow";

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
  | "RemoteJob"
  | "Event"
  | "Conference"
  | "Workshop"
  | "Training"
  | "Bootcamp"
  | "Funding";

export type OpportunityTrackingStatus =
  | "None"
  | "Saved"
  | "Interested"
  | "Applied"
  | "NotRelevant"
  | "Accepted"
  | "Rejected";

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
  whyItFits: string | null;
  matchConfidence: number;
  preparationSteps: string[];
  discoveredAt: string;
  daysUntilDeadline: number;
  regionTag?: string;
  goalTag?: string;
  benefits?: string;
  cost?: string;
  whoIsEligible?: string[];
  radarsAdvice?: string[];
  nextMoveSteps?: string[];
  selectionProcess?: string;
  status?: string;
  userTrackingStatus?: OpportunityTrackingStatus;
  reminderSet?: boolean;
  matchTier?: "StrongMatch" | "Relevant" | "Explore";
  urgencyLabel?: string;
  /// The deadline state as a value rather than a sentence, so the UI can colour it without
  /// string-matching the label. The server used to bake a coloured circle into urgencyLabel.
  urgencyLevel?: "Open" | "Soon" | "Urgent" | "Closed" | "NoDeadline";
}

export interface DailyOpportunityFeed {
  totalCount: number;
  message: string;
  primaryFocus: string;
  items: Opportunity[];
  tierCounts: Record<string, number>;
  urgencyCounts: Record<string, number>;
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

export interface UserInterestContext {
  interest: string;
  goal: string;
  level: "Beginner" | "Intermediate" | "Advanced";
  lens: string;
}

export interface InterestPath {
  id: string;
  title: string;
  interests: string[];
  relationshipStrength: number;
  isPrimary: boolean;
  priority: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: "User" | "PlatformAdmin" | "SuperAdmin";
  persona: PersonaType;
  primaryGoal: string;
  interests: string[];
  region: string;
  city: string;
  problems: string[];
  currentIntent: string;
  targetRole: string;
  targetIndustry: string;
  capabilities: string[];
  opportunityPreferences: string[];
  geography: string[];
  decisionNeeds: string[];
  personaDetails: Record<string, string>;
  interestContexts: UserInterestContext[];
  dominantInterests: string[];
  interestPaths: InterestPath[];
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
  personalizedWhy?: string | null;
  relevanceScore: number;
  relevanceConfidence: number;
  matchedSignals: string[];
  whyYoureSeeingThis?: string | null;
  nextMove: string | null;
  tags: string[];
  secondaryTopics: string[];
  classificationConfidence: number;
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
  paperBreakdown?: AcademicPaperBreakdown | null;
  documentType?: string | null;
  wordCount?: number;
  openAccessPdfUrl?: string | null;
  databaseSource?: string | null;
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

// Mirrors RadarV2.Models.AnalyticsEventType. The values below are the subset the server maps into
// persisted behavioural signals (see MongoAnalyticsService.MapAction), which is why they matter
// beyond analytics: Search, Read, Complete, Applied, MoreLikeThis and LessLikeThis all move a
// signal's strength, so they must stay in step with the C# enum.
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
  | "Reported"
  | "MoreLikeThis"
  | "LessLikeThis"
  | "Search"
  | "Read"
  | "Complete"
  | "Applied";

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
  topic?: string | null;
  isProcessing: boolean;
  capturedAt: string;
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

export type LearningResourceType = "TutorialVideo" | "NewDevelopmentVideo" | "BlogPost";

export interface TutorialStep {
  stepNumber: number;
  title: string;
  instruction: string;
  codeSnippetOrKeyPoint?: string | null;
}

export interface QuizPerformanceRecord {
  id: string;
  topic: string;
  stage: string;
  scorePercent: number;
  passed: boolean;
  takenAt: string;
}

export interface LearningResource {
  id: string;
  title: string;
  url: string;
  embedUrl?: string | null;
  thumbnailUrl?: string | null;
  source: string;
  channelOrAuthor?: string | null;
  duration?: string | null;
  estimatedTime?: string | null;
  order?: number;
  sequenceRole?: string;
  level: "Beginner" | "Intermediate" | "Advanced" | "Application";
  type: LearningResourceType;
  isHowToTutorial?: boolean;
  isNewDevelopment?: boolean;
  whyAmILearningThis?: string;
  whatYouWillBuild?: string | null;
  stepByStepBreakdown: TutorialStep[];
  practiceExerciseTitle?: string | null;
  practiceExercise?: string | null;
  isExerciseCompleted?: boolean;
  quizTopic?: string | null;
  keyConcepts?: string[];
  whatHappened: string;
  whyItMatters: string;
  nextMove: string;
  isCompleted: boolean;
}

export interface RoadmapModule {
  id: string;
  title: string;
  description: string;
  stageGoal?: string;
  order: number;
  level?: string;
  isCompleted: boolean;
  isLocked: boolean;
  masteryPercent?: number;
  lessons: RoadmapLesson[];
  contentItemIds: string[];
  resources?: LearningResource[];
}

export interface GrowthRoadmap {
  id: string;
  userId: string;
  title: string;
  goal: string;
  interest: string;
  level: string;
  currentStage?: string;
  modules: RoadmapModule[];
  resources?: LearningResource[];
  progressPercent: number;
  stageMastery?: Record<string, number>;
  completedResourceIds?: string[];
  completedExerciseIds?: string[];
  quizResults?: QuizPerformanceRecord[];
  weakAreas?: string[];
  adaptiveRecommendation?: string | null;
  createdAt: string;
  isActive: boolean;
}

// ── Learn Hub & Knowledge Graph ──────────────────────────────────────────

export type HubResourceCategory = "Learn" | "Understand" | "Research" | "Apply" | "StayCurrent";
export type HubMediaFormat = "Video" | "AudioPodcast" | "Article" | "AcademicPaper" | "Documentation" | "ProjectGuide";

export interface AcademicPaperBreakdown {
  introduction: string;
  problem: string;
  aimAndObjectives: string;
  methodology: string;
  keyArguments: string;
  findings: string;
  contribution: string;
  whyItMatters: string;
}

export interface PodcastBreakdown {
  keyIdeas: string[];
  importantPoints: string[];
  whyItMatters: string;
  takeaways: string[];
  nextMove: string;
}

export interface HubResourceItem {
  id: string;
  title: string;
  primarySkill: string;
  subInterest: string;
  level: "Beginner" | "Intermediate" | "Advanced" | "Application";
  category: HubResourceCategory;
  format: HubMediaFormat;
  url: string;
  mediaUrl?: string | null;
  thumbnailUrl?: string | null;
  source: string;
  authorOrChannel?: string | null;
  durationOrReadTime?: string | null;
  rankingScore: number;
  whyThisResource: string;
  whatYouWillLearn?: string | null;
  stepByStepBreakdown?: TutorialStep[];
  practiceExerciseTitle?: string | null;
  practiceExercise?: string | null;
  whatHappened?: string;
  whyItMatters?: string;
  nextMove?: string;
  paperBreakdown?: AcademicPaperBreakdown | null;
  podcastBreakdown?: PodcastBreakdown | null;
  connectedNodeIds?: string[];
  isCompleted: boolean;
  isSaved?: boolean;
}

export interface KnowledgeGraphNode {
  id: string;
  label: string;
  category: "Goal" | "Skill" | "SubInterest" | "Topic" | "Concept" | "Project" | "Opportunity";
  status: "Mastered" | "Learning" | "WeakArea" | "NextUp" | "Planned";
  confidencePercent: number;
  summary: string;
  linkedSubInterest?: string | null;
  stage?: string | null;
  connectedNodeIds: string[];
}

export interface KnowledgeGraphEdge {
  fromId: string;
  toId: string;
  relationship: "leads_to" | "requires" | "subskill_of" | "applies_to" | "unlocks" | "contains";
}

export interface NextBestAction {
  title: string;
  description: string;
  whyNowReason: string;
  estimatedTime: string;
  resourceId: string;
  stage: string;
  subInterest: string;
}

export interface LearnHubPayload {
  primarySkill: string;
  goal: string;
  currentStage: string;
  subInterests: string[];
  activeSubInterest: string;
  nextAction: NextBestAction;
  graphNodes: KnowledgeGraphNode[];
  graphEdges: KnowledgeGraphEdge[];
  resources: HubResourceItem[];
  totalMasteredNodes: number;
  totalLearningNodes: number;
  totalWeakNodes: number;
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
  questionType?: string; // "MCQ" | "ShortAnswer" | "TrueFalse" | "PracticalExercise" | "CaseStudy"
  cognitiveLevel?: string; // "Recall" | "Understanding" | "Application" | "ProblemSolving"
  codeSnippet?: string | null;
  scenarioContext?: string | null;
  subtopic?: string | null;
  userAnswered: boolean | null;
  userAnswerIndex: number | null;
  userTextAnswer?: string | null;
  isCorrect?: boolean | null;
}

export interface MentorQuiz {
  id: string;
  topic: string;
  difficulty?: string;
  questions: MentorQuizQuestion[];
  currentQuestionIndex: number;
  score: number;
  conceptualScore?: number;
  practicalScore?: number;
  isComplete: boolean;
  detectedWeakAreas?: string[];
  nextMove?: string;
  createdAt: string;
}

export interface MentorStudyTask {
  title: string;
  description: string;
  resourceType: string;
  estimatedTime: string | null;
  isCompleted: boolean;
  focusArea?: string | null;
}

export interface MentorStudyWeek {
  weekNumber: number;
  theme: string;
  milestone?: string;
  tasks: MentorStudyTask[];
  isCompleted: boolean;
}

export interface MentorStudyPlan {
  id: string;
  topic: string;
  goal: string;
  durationWeeks?: number;
  weeks: MentorStudyWeek[];
  status?: string;
  lastAdjustedAt?: string | null;
  createdAt: string;
}

export interface MentorWorkReview {
  wasReviewed: boolean;
  id: string;
  workTitle: string;
  workContent: string;
  reviewType: string;
  score?: number;
  feedback: string;
  strengths: string[];
  weaknesses: string[];
  mainIssue?: string;
  improvements: string[];
  suggestions: string[];
  nextStep?: string;
  revisionNumber?: number;
  previousScore?: number | null;
  revisedFromId?: string | null;
  reviewedAt: string;
}

export interface SubtopicMasteryItem {
  name: string;
  masteryPercent: number;
  status: string; // "Mastered" | "Strong" | "WeakArea" | "In Progress"
  totalQuestions: number;
  correctAnswers: number;
}

export interface TopicMastery {
  id: string;
  topic: string;
  masteryPercent: number;
  subtopics: SubtopicMasteryItem[];
  weakAreas: string[];
  strongAreas: string[];
  lastPracticedAt: string;
}

export interface PersonalLearningMemory {
  userId: string;
  primaryGoal: string;
  activeSkill: string;
  currentStage: string;
  weakAreas: string[];
  strongAreas: string[];
  recentMistakes: string[];
  masteries: TopicMastery[];
  completedProjects: string[];
  submittedReviewsCount: number;
  lastActiveAt: string;
}

export interface SpacedRevisionItem {
  id: string;
  topic: string;
  intervalName: string;
  dueDate: string;
  prompt: string;
  expectedTakeaway: string;
  isCompleted: boolean;
  wasRemembered?: boolean;
}

export interface DailyLearningCard {
  topic: string;
  skill: string;
  estimatedMinutes: number;
  why: string;
  learnMinutes: number;
  practiceMinutes: number;
  applyMinutes: number;
  nextMove: string;
  suggestedPrompt?: string | null;
}

export interface ChallengeResult {
  topic: string;
  scorePercent: number;
  conceptualScorePercent: number;
  practicalScorePercent: number;
  strengths: string[];
  weaknesses: string[];
  recommendation: string;
  nextMove: string;
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

export interface ProjectMilestone {
  title: string;
  outcome: string;
  estimatedTime: string;
  steps: string[];
  isComplete: boolean;
}

/// Generated on demand from the project plus the user's profile, then persisted server-side.
export interface ProjectPlan {
  summary: string;
  milestones: ProjectMilestone[];
  deliverables: string[];
  successCriteria: string | null;
  generatedAt: string;
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
  /** Null until the user asks for a plan. */
  plan?: ProjectPlan | null;
}

// ── Personalization signals ──────────────────────────────────────────────
// Persisted server-side per user: stated preferences and behaviour-derived inference are kept
// separate, and strength is recency-decayed at read time rather than recomputed on write.

export type SignalSource = "Declared" | "Inferred";

export interface BehavioralSignal {
  term: string;
  source: SignalSource;
  strength: number;
  confidence: number;
  explicitFeedback: number;
  positiveCount: number;
  negativeCount: number;
  updatedAt: string;
  /** Strength after recency decay — what ranking and prompt context actually use. */
  decayedStrength: number;
}

export interface SignalsSummary {
  profileConfidence: number;
  declaredCount: number;
  inferredCount: number;
  signals: BehavioralSignal[];
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
  isPinned: boolean;
  isArchived: boolean;
  color?: string | null;
  checklist: NoteChecklistItem[];
}

export interface NoteChecklistItem {
  id: string;
  text: string;
  isChecked: boolean;
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

// ── Central AI Engine Telemetry ──────────────────────────────────────────

export interface AiActivityLog {
  id: string;
  feature: string;
  userId?: string;
  mode: string;
  success: boolean;
  durationMs: number;
  timestamp: string;
  summary?: string;
}

export interface AiEngineStats {
  engineName: string;
  model: string;
  isCloudLlmActive: boolean;
  isBudgetExhausted: boolean;
  degradedReason?: string | null;
  monthlySpendUsd: number;
  monthlySpendCapUsd: number;
  totalActivitiesProcessed: number;
  activityCounts: Record<string, number>;
  recentActivities: AiActivityLog[];
}

// ── Home brief (GET /api/home) ───────────────────────────────────────────
// Mirrors Models/HomeBrief.cs. Every field is computed from the user's own profile, roadmap,
// behaviour and real ingested content; sections Radar can't ground arrive null/empty so the UI
// omits them rather than rendering placeholder copy.

export interface HomeSignal {
  contentItemId: string;
  signal: string;
  source: string;
  type: ContentType;
  layer: ContentLayer;
  topic?: string | null;
  thumbnailUrl?: string | null;
  publishedAt: string;
  whyYoureSeeingThis: string;
}

export interface NoticedSignal {
  term: string;
  timesEngaged: number;
  suggestion: string;
  actionUrl: string;
}

export interface HomeFocus {
  topic: string;
  stage: string;
  why: string;
  estimatedTime?: string | null;
  actionUrl: string;
}

export interface HomeBuild {
  artifact: string;
  why: string;
  actionUrl: string;
}

export interface HomeOpportunity {
  id: string;
  title: string;
  organisation: string;
  location?: string | null;
  matchScorePercent: number;
  matchTier: string;
  daysUntilDeadline?: number | null;
  whyItMatches: string;
  reminderSet?: boolean;
  /// What to say about the deadline, including when it has already passed. Server-computed so
  /// the card cannot disagree with the opportunities page about whether something is still open.
  urgencyLabel?: string;
}

export interface HomeBrief {
  context: string;
  topSignals: HomeSignal[];
  noticed: NoticedSignal[];
  todaysFocus?: HomeFocus | null;
  nextBuild?: HomeBuild | null;
  opportunities: HomeOpportunity[];
  /// Deadlines the user asked to be reminded about, closing soonest first. The reminder toggle
  /// used to write a boolean nothing read; this is where it is delivered.
  closingSoon?: HomeOpportunity[];
  stats: UserStats;
}
