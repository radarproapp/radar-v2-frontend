import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import { RequireAuth } from "./auth/RequireAuth";
import { MainLayout } from "./components/MainLayout";
import { Login } from "./pages/Login";
import { Onboarding } from "./pages/Onboarding";
import { Today } from "./pages/Today";
import { Feed } from "./pages/Feed";
import { FeedDetail } from "./pages/FeedDetail";
import { Saved } from "./pages/Saved";
import { Capture } from "./pages/Capture";
import { Clips } from "./pages/Clips";
import { WeeklyBrief } from "./pages/WeeklyBrief";
import { SourcePage } from "./pages/SourcePage";
import { TopicHub } from "./pages/TopicHub";
import { Learn } from "./pages/Learn";
import { LearnHub } from "./pages/LearnHub";
import { GrowthTracker } from "./pages/GrowthTracker";
import { ProjectStudio } from "./pages/ProjectStudio";
import { LearningMentor } from "./pages/LearningMentor";
import { Notebook } from "./pages/Notebook";
import { NoteEditor } from "./pages/NoteEditor";
import { Opportunities } from "./pages/Opportunities";
import { ResearchDiscovery } from "./pages/ResearchDiscovery";
import { NotFound } from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: false } },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/onboarding" element={<Onboarding />} />

            <Route element={<MainLayout />}>
              <Route
                path="/"
                element={
                  <RequireAuth>
                    <Today />
                  </RequireAuth>
                }
              />
              <Route
                path="/feed"
                element={
                  <RequireAuth>
                    <Feed />
                  </RequireAuth>
                }
              />
              <Route
                path="/feed/:itemId"
                element={
                  <RequireAuth>
                    <FeedDetail />
                  </RequireAuth>
                }
              />
              <Route
                path="/saved"
                element={
                  <RequireAuth>
                    <Saved />
                  </RequireAuth>
                }
              />
              <Route
                path="/capture"
                element={
                  <RequireAuth>
                    <Capture />
                  </RequireAuth>
                }
              />
              <Route
                path="/clips"
                element={
                  <RequireAuth>
                    <Clips />
                  </RequireAuth>
                }
              />
              <Route
                path="/weekly"
                element={
                  <RequireAuth>
                    <WeeklyBrief />
                  </RequireAuth>
                }
              />
              <Route
                path="/source/:sourceId"
                element={
                  <RequireAuth>
                    <SourcePage />
                  </RequireAuth>
                }
              />
              <Route
                path="/topic/:topicId"
                element={
                  <RequireAuth>
                    <TopicHub />
                  </RequireAuth>
                }
              />
              <Route
                path="/learn"
                element={
                  <RequireAuth>
                    <Learn />
                  </RequireAuth>
                }
              />
              <Route
                path="/learn/hub"
                element={
                  <RequireAuth>
                    <LearnHub />
                  </RequireAuth>
                }
              />
              <Route
                path="/progress"
                element={
                  <RequireAuth>
                    <GrowthTracker />
                  </RequireAuth>
                }
              />
              <Route
                path="/projects"
                element={
                  <RequireAuth>
                    <ProjectStudio />
                  </RequireAuth>
                }
              />
              <Route
                path="/mentor"
                element={
                  <RequireAuth>
                    <LearningMentor />
                  </RequireAuth>
                }
              />
              <Route
                path="/notebook"
                element={
                  <RequireAuth>
                    <Notebook />
                  </RequireAuth>
                }
              />
              <Route
                path="/notebook/:noteId"
                element={
                  <RequireAuth>
                    <NoteEditor />
                  </RequireAuth>
                }
              />
              <Route
                path="/opportunities"
                element={
                  <RequireAuth>
                    <Opportunities />
                  </RequireAuth>
                }
              />
              <Route
                path="/research"
                element={
                  <RequireAuth>
                    <ResearchDiscovery />
                  </RequireAuth>
                }
              />
              <Route
                path="*"
                element={
                  <RequireAuth>
                    <NotFound />
                  </RequireAuth>
                }
              />
            </Route>
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
