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
