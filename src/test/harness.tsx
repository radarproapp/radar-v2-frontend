import type { ReactElement, ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { render } from "@testing-library/react";
import { vi } from "vitest";

/// Renders a page the way the app does, minus the network.
///
/// A page needs a router and a query client to mount at all, so every render test would otherwise
/// start with the same twelve lines of setup — and the ones that got it slightly different would
/// be testing slightly different things.
///
/// `retry: false` matters more than it looks: with the default, a query that rejects is retried
/// three times with backoff, so an error-state test either waits seconds or asserts against a
/// loading state and passes for the wrong reason.

/// The render, plus the query client it was given - so a test can assert on what a mutation
/// invalidated. A component that saves correctly and refreshes the wrong cache looks right in
/// every assertion about the DOM.
export function renderPage(
  ui: ReactElement,
  { route = "/" }: { route?: string } = {},
) {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  });

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
      </QueryClientProvider>
    );
  }

  return { ...render(ui, { wrapper: Wrapper }), client };
}

/// A profile with nothing answered, which is the state most pages have to survive.
///
/// Deliberately not a "happy path" fixture. Every bug this suite exists to catch was a page
/// doing something reasonable with full data and throwing on an empty list, a null topic or an
/// absent stats object.
export const emptyProfile = {
  id: "u1",
  name: "Test Learner",
  email: "test@example.com",
  persona: "Student",
  interests: [],
  goals: [],
  opportunityPreferences: [],
  isPersonalised: false,
  onboardingComplete: true,
  stats: {},
} as const;

/// Replaces an api module export for the duration of one test.
///
/// Returns the spy so a test can assert what the page asked for, not only what it drew — a page
/// that renders beautifully while fetching the wrong thing is still broken.
export function stub<M extends object, K extends keyof M>(
  module: M,
  name: K,
  value: unknown,
) {
  return vi.spyOn(module, name as never).mockResolvedValue(value as never);
}
