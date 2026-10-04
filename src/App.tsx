import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import { RequireAuth } from "./auth/RequireAuth";
import { RequireAdmin } from "./auth/RequireAdmin";
import { MainLayout } from "./components/MainLayout";
import { MarketingLayout } from "./components/MarketingLayout";
import { HomeGate } from "./pages/HomeGate";

// ── Route-level code splitting ───────────────────────────────────────────────
//
// Every page except the entry gate is loaded on demand, so the initial bundle carries the router,
// the auth shell and nothing else. Previously all ~35 pages were statically imported, which meant
// someone landing on /login downloaded the mentor, compare, notebook and admin screens too.
//
// Pages are named exports (`export function Feed`), so each import is adapted into the default
// export React.lazy expects. Mapping them explicitly keeps the whole thing type-checked — a renamed
// or deleted export fails `tsc -b` instead of throwing when the route is first opened.
const Login = lazy(() => import("./pages/Login").then((m) => ({ default: m.Login })));
const Onboarding = lazy(() => import("./pages/Onboarding").then((m) => ({ default: m.Onboarding })));
const Feed = lazy(() => import("./pages/Feed").then((m) => ({ default: m.Feed })));
const FeedDetail = lazy(() => import("./pages/FeedDetail").then((m) => ({ default: m.FeedDetail })));
const Saved = lazy(() => import("./pages/Saved").then((m) => ({ default: m.Saved })));
const Capture = lazy(() => import("./pages/Capture").then((m) => ({ default: m.Capture })));
const Clips = lazy(() => import("./pages/Clips").then((m) => ({ default: m.Clips })));
const WeeklyBrief = lazy(() => import("./pages/WeeklyBrief").then((m) => ({ default: m.WeeklyBrief })));
const SourcePage = lazy(() => import("./pages/SourcePage").then((m) => ({ default: m.SourcePage })));
const TopicHub = lazy(() => import("./pages/TopicHub").then((m) => ({ default: m.TopicHub })));
const Learn = lazy(() => import("./pages/Learn").then((m) => ({ default: m.Learn })));
const LearnHub = lazy(() => import("./pages/LearnHub").then((m) => ({ default: m.LearnHub })));
const GrowthTracker = lazy(() => import("./pages/GrowthTracker").then((m) => ({ default: m.GrowthTracker })));
const ProjectStudio = lazy(() => import("./pages/ProjectStudio").then((m) => ({ default: m.ProjectStudio })));
const LearningMentor = lazy(() => import("./pages/LearningMentor").then((m) => ({ default: m.LearningMentor })));
const AskRadar = lazy(() => import("./pages/AskRadar").then((m) => ({ default: m.AskRadar })));
const Notebook = lazy(() => import("./pages/Notebook").then((m) => ({ default: m.Notebook })));
const NoteEditor = lazy(() => import("./pages/NoteEditor").then((m) => ({ default: m.NoteEditor })));
const Opportunities = lazy(() => import("./pages/Opportunities").then((m) => ({ default: m.Opportunities })));
const ResearchDiscovery = lazy(() => import("./pages/ResearchDiscovery").then((m) => ({ default: m.ResearchDiscovery })));
const Library = lazy(() => import("./pages/Library").then((m) => ({ default: m.Library })));
const Compare = lazy(() => import("./pages/Compare").then((m) => ({ default: m.Compare })));
const Plans = lazy(() => import("./pages/Plans").then((m) => ({ default: m.Plans })));
const Settings = lazy(() => import("./pages/Settings").then((m) => ({ default: m.Settings })));
const EditProfile = lazy(() => import("./pages/EditProfile").then((m) => ({ default: m.EditProfile })));
const Notifications = lazy(() => import("./pages/Notifications").then((m) => ({ default: m.Notifications })));
const Metrics = lazy(() => import("./pages/Metrics").then((m) => ({ default: m.Metrics })));
const SourceQuality = lazy(() => import("./pages/SourceQuality").then((m) => ({ default: m.SourceQuality })));
const NotFound = lazy(() => import("./pages/NotFound").then((m) => ({ default: m.NotFound })));

// Admin + entry screens, loaded on demand like everything else.
const AdminLogin = lazy(() => import("./pages/AdminLogin").then((m) => ({ default: m.AdminLogin })));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard").then((m) => ({ default: m.AdminDashboard })));
const EntryScreens = lazy(() => import("./pages/EntryScreens").then((m) => ({ default: m.EntryScreens })));

// Marketing pages are their own chunk group: only an unauthenticated visitor to the public site
// needs them, and never alongside the app screens.
const Landing = lazy(() => import("./pages/Landing").then((m) => ({ default: m.Landing })));
const Product = lazy(() => import("./pages/Product").then((m) => ({ default: m.Product })));
const HowItWorks = lazy(() => import("./pages/HowItWorks").then((m) => ({ default: m.HowItWorks })));
const Institutions = lazy(() => import("./pages/Institutions").then((m) => ({ default: m.Institutions })));
const ProjectShowcase = lazy(() => import("./pages/ProjectShowcase").then((m) => ({ default: m.ProjectShowcase })));

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: false } },
});

/** Shown while a route chunk is in flight. Matches the app's own empty/loading treatment. */
function RouteFallback() {
  return (
    <div className="r-page">
      <div className="r-empty">
        <div className="r-spinner" />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          {/* One boundary around the whole route tree: each route is its own chunk, so the fallback
              is what a visitor sees for the moment between navigation and that chunk arriving. */}
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/" element={<HomeGate />} />
              <Route path="/login" element={<Login />} />
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="/entry" element={<EntryScreens />} />
              <Route path="/showcase/:projectId" element={<ProjectShowcase />} />

              <Route path="/admin" element={<RequireAdmin><AdminDashboard /></RequireAdmin>} />
              <Route path="/admin/:Page" element={<RequireAdmin><AdminDashboard /></RequireAdmin>} />

              <Route element={<MarketingLayout />}>
                <Route path="/landing" element={<Landing />} />
                <Route path="/m" element={<Landing />} />
                <Route path="/product" element={<Product />} />
                <Route path="/how-it-works" element={<HowItWorks />} />
                <Route path="/institutions" element={<Institutions />} />
              </Route>

              <Route element={<MainLayout />}>
                <Route path="/feed" element={<RequireAuth><Feed /></RequireAuth>} />
                <Route path="/feed/:itemId" element={<RequireAuth><FeedDetail /></RequireAuth>} />
                <Route path="/saved" element={<RequireAuth><Saved /></RequireAuth>} />
                <Route path="/capture" element={<RequireAuth><Capture /></RequireAuth>} />
                <Route path="/clips" element={<RequireAuth><Clips /></RequireAuth>} />
                <Route path="/weekly" element={<RequireAuth><WeeklyBrief /></RequireAuth>} />
                <Route path="/source/:sourceId" element={<RequireAuth><SourcePage /></RequireAuth>} />
                <Route path="/topic/:topicId" element={<RequireAuth><TopicHub /></RequireAuth>} />
                <Route path="/learn" element={<RequireAuth><Learn /></RequireAuth>} />
                <Route path="/learn/hub" element={<RequireAuth><LearnHub /></RequireAuth>} />
                <Route path="/progress" element={<RequireAuth><GrowthTracker /></RequireAuth>} />
                <Route path="/projects" element={<RequireAuth><ProjectStudio /></RequireAuth>} />
                <Route path="/ask" element={<RequireAuth><AskRadar /></RequireAuth>} />
                <Route path="/mentor" element={<RequireAuth><LearningMentor /></RequireAuth>} />
                <Route path="/notebook" element={<RequireAuth><Notebook /></RequireAuth>} />
                <Route path="/notebook/:noteId" element={<RequireAuth><NoteEditor /></RequireAuth>} />
                <Route path="/opportunities" element={<RequireAuth><Opportunities /></RequireAuth>} />
                <Route path="/research" element={<RequireAuth><ResearchDiscovery /></RequireAuth>} />
                <Route path="/library" element={<RequireAuth><Library /></RequireAuth>} />
                <Route path="/compare" element={<RequireAuth><Compare /></RequireAuth>} />
                <Route path="/compare/:comparisonId" element={<RequireAuth><Compare /></RequireAuth>} />
                <Route path="/plans" element={<RequireAuth><Plans /></RequireAuth>} />
                <Route path="/settings" element={<RequireAuth><Settings /></RequireAuth>} />
                <Route path="/profile/edit" element={<RequireAuth><EditProfile /></RequireAuth>} />
                <Route path="/notifications" element={<RequireAuth><Notifications /></RequireAuth>} />
                <Route path="/metrics" element={<RequireAuth><Metrics /></RequireAuth>} />
                <Route path="/source-quality" element={<RequireAuth><SourceQuality /></RequireAuth>} />
                <Route path="*" element={<RequireAuth><NotFound /></RequireAuth>} />
              </Route>
            </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
