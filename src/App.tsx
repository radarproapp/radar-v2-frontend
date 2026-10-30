import { Suspense } from "react";
import { lazyPage } from "./lib/lazy-page";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import { EnvironmentBanner } from "./components/EnvironmentBanner";
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
const Login = lazyPage(() => import("./pages/Login").then((m) => ({ default: m.Login })));
const Onboarding = lazyPage(() => import("./pages/Onboarding").then((m) => ({ default: m.Onboarding })));
const OnboardingSelection = lazyPage(() => import("./pages/OnboardingSelection").then((m) => ({ default: m.OnboardingSelection })));
const Feed = lazyPage(() => import("./pages/Feed").then((m) => ({ default: m.Feed })));
const FeedDetail = lazyPage(() => import("./pages/FeedDetail").then((m) => ({ default: m.FeedDetail })));
const Saved = lazyPage(() => import("./pages/Saved").then((m) => ({ default: m.Saved })));
const Capture = lazyPage(() => import("./pages/Capture").then((m) => ({ default: m.Capture })));
const WeeklyBrief = lazyPage(() => import("./pages/WeeklyBrief").then((m) => ({ default: m.WeeklyBrief })));
const SourcePage = lazyPage(() => import("./pages/SourcePage").then((m) => ({ default: m.SourcePage })));
const TopicHub = lazyPage(() => import("./pages/TopicHub").then((m) => ({ default: m.TopicHub })));
const LearnBuilder = lazyPage(() => import("./pages/LearnBuilder").then((m) => ({ default: m.LearnBuilder })));
const Personalise = lazyPage(() => import("./pages/Personalise").then((m) => ({ default: m.Personalise })));
const LearnPath = lazyPage(() => import("./pages/LearnPath").then((m) => ({ default: m.LearnPath })));
const GrowthTracker = lazyPage(() => import("./pages/GrowthTracker").then((m) => ({ default: m.GrowthTracker })));
const ProjectStudio = lazyPage(() => import("./pages/ProjectStudio").then((m) => ({ default: m.ProjectStudio })));
const LearningMentor = lazyPage(() => import("./pages/LearningMentor").then((m) => ({ default: m.LearningMentor })));
const AskRadar = lazyPage(() => import("./pages/AskRadar").then((m) => ({ default: m.AskRadar })));
const Notebook = lazyPage(() => import("./pages/Notebook").then((m) => ({ default: m.Notebook })));
const NoteEditor = lazyPage(() => import("./pages/NoteEditor").then((m) => ({ default: m.NoteEditor })));
const Opportunities = lazyPage(() => import("./pages/Opportunities").then((m) => ({ default: m.Opportunities })));
const Research = lazyPage(() => import("./pages/Research").then((m) => ({ default: m.Research })));
const AssessDocument = lazyPage(() => import("./pages/AssessDocument").then((m) => ({ default: m.AssessDocument })));
const Profiles = lazyPage(() => import("./pages/Profiles").then((m) => ({ default: m.Profiles })));
const ForgotPassword = lazyPage(() => import("./pages/ForgotPassword").then((m) => ({ default: m.ForgotPassword })));
const PrivacyPolicy = lazyPage(() => import("./pages/PrivacyPolicy").then((m) => ({ default: m.PrivacyPolicy })));
const TermsOfService = lazyPage(() => import("./pages/TermsOfService").then((m) => ({ default: m.TermsOfService })));
const Compare = lazyPage(() => import("./pages/Compare").then((m) => ({ default: m.Compare })));
const Plans = lazyPage(() => import("./pages/Plans").then((m) => ({ default: m.Plans })));
const Settings = lazyPage(() => import("./pages/Settings").then((m) => ({ default: m.Settings })));
const EditProfile = lazyPage(() => import("./pages/EditProfile").then((m) => ({ default: m.EditProfile })));
const Notifications = lazyPage(() => import("./pages/Notifications").then((m) => ({ default: m.Notifications })));
const Metrics = lazyPage(() => import("./pages/Metrics").then((m) => ({ default: m.Metrics })));
const SourceQuality = lazyPage(() => import("./pages/SourceQuality").then((m) => ({ default: m.SourceQuality })));
const NotFound = lazyPage(() => import("./pages/NotFound").then((m) => ({ default: m.NotFound })));

// Admin + entry screens, loaded on demand like everything else.
const AdminLogin = lazyPage(() => import("./pages/AdminLogin").then((m) => ({ default: m.AdminLogin })));
const AdminDashboard = lazyPage(() => import("./pages/AdminDashboard").then((m) => ({ default: m.AdminDashboard })));
const EntryScreens = lazyPage(() => import("./pages/EntryScreens").then((m) => ({ default: m.EntryScreens })));

// Marketing pages are their own chunk group: only an unauthenticated visitor to the public site
// needs them, and never alongside the app screens.
const Landing = lazyPage(() => import("./pages/Landing").then((m) => ({ default: m.Landing })));
const Product = lazyPage(() => import("./pages/Product").then((m) => ({ default: m.Product })));
const HowItWorks = lazyPage(() => import("./pages/HowItWorks").then((m) => ({ default: m.HowItWorks })));
const Institutions = lazyPage(() => import("./pages/Institutions").then((m) => ({ default: m.Institutions })));
const ProjectShowcase = lazyPage(() => import("./pages/ProjectShowcase").then((m) => ({ default: m.ProjectShowcase })));

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
          {/* Above everything, including the error boundary: if the app fails to start on a
              non-production build, the first question is still "which environment is this?" */}
          <EnvironmentBanner />
          {/* One boundary around the whole route tree: each route is its own chunk, so the fallback
              is what a visitor sees for the moment between navigation and that chunk arriving. */}
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/" element={<HomeGate />} />
              <Route path="/login" element={<Login />} />
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ForgotPassword />} />
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/terms" element={<TermsOfService />} />
              <Route path="/onboarding" element={<OnboardingSelection />} />
              <Route path="/onboarding/:persona" element={<Onboarding />} />
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
                <Route path="/weekly" element={<RequireAuth><WeeklyBrief /></RequireAuth>} />
                <Route path="/source/:sourceId" element={<RequireAuth><SourcePage /></RequireAuth>} />
                <Route path="/topic/:topicId" element={<RequireAuth><TopicHub /></RequireAuth>} />
                <Route path="/personalise" element={<RequireAuth><Personalise /></RequireAuth>} />
                <Route path="/learn" element={<RequireAuth><LearnPath /></RequireAuth>} />
                <Route path="/learn/path" element={<RequireAuth><LearnPath /></RequireAuth>} />
                <Route path="/learn/build" element={<RequireAuth><LearnBuilder /></RequireAuth>} />
                <Route path="/progress" element={<RequireAuth><GrowthTracker /></RequireAuth>} />
                <Route path="/projects" element={<RequireAuth><ProjectStudio /></RequireAuth>} />
                <Route path="/ask" element={<RequireAuth><AskRadar /></RequireAuth>} />
                <Route path="/mentor" element={<RequireAuth><LearningMentor /></RequireAuth>} />
                <Route path="/notebook" element={<RequireAuth><Notebook /></RequireAuth>} />
                <Route path="/notebook/:noteId" element={<RequireAuth><NoteEditor /></RequireAuth>} />
                <Route path="/opportunities" element={<RequireAuth><Opportunities /></RequireAuth>} />
                <Route path="/research" element={<RequireAuth><Research /></RequireAuth>} />
                <Route path="/assess" element={<RequireAuth><AssessDocument /></RequireAuth>} />
                <Route path="/profiles" element={<RequireAuth><Profiles /></RequireAuth>} />
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
