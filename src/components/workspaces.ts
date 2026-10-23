import type { IconName } from "./Icon";

/// The three things Radar is for, and what lives inside each.
///
/// Until now the navigation listed eleven destinations side by side, including "Radar
/// Intelligence" and "Feed" — the same idea twice — so the menu itself could not say what the
/// product was. These are the three jobs the personas actually have: know what is happening,
/// become capable and prove it, get the place.
///
/// Everything a user *adds* — saved items, captures, notes, uploads — sits under Intelligence
/// rather than in a drawer of its own. Following a subject and uploading a document are the same
/// gesture: putting something into your own feed.
export interface WorkspaceItem {
  label: string;
  path: string;
  icon: IconName;
  /// Extra paths that should keep this item highlighted, e.g. a detail route.
  also?: string[];
}

export interface Workspace {
  id: "intelligence" | "learn" | "opportunities";
  label: string;
  tagline: string;
  icon: IconName;
  home: string;
  items: WorkspaceItem[];
}

export const WORKSPACES: Workspace[] = [
  {
    id: "intelligence",
    label: "Radar Intelligence",
    tagline: "What's worth your attention",
    icon: "radar",
    home: "/",
    items: [
      { label: "Today", path: "/", icon: "star" },
      { label: "Feed", path: "/feed", icon: "article", also: ["/source", "/topic"] },
      { label: "Weekly brief", path: "/weekly", icon: "deadline" },
      { label: "Saved", path: "/saved", icon: "save" },
      { label: "Captures", path: "/capture", icon: "inbox" },
      { label: "Notes", path: "/notebook", icon: "note" },
    ],
  },
  {
    id: "learn",
    label: "Radar Learn",
    tagline: "Get good, and prove it",
    icon: "course",
    home: "/learn",
    items: [
      { label: "My path", path: "/learn", icon: "explore" },
      { label: "Hub", path: "/learn/hub", icon: "book" },
      { label: "Projects", path: "/projects", icon: "build", also: ["/showcase"] },
      { label: "Mentor", path: "/mentor", icon: "chat" },
      { label: "Progress", path: "/progress", icon: "trend" },
    ],
  },
  {
    id: "opportunities",
    label: "Opportunities",
    tagline: "Find your next place",
    icon: "job",
    home: "/opportunities",
    items: [{ label: "All opportunities", path: "/opportunities", icon: "job" }],
  },
];

/// Which workspace a path belongs to.
///
/// Longest match wins, so `/learn/hub` resolves to Learn rather than matching `/` first. Anything
/// unrecognised falls to Intelligence, which is the home of the app — better than rendering a
/// sidebar with nothing selected.
export function workspaceForPath(pathname: string): Workspace {
  const path = pathname.toLowerCase();

  let best: { workspace: Workspace; score: number } | null = null;

  for (const workspace of WORKSPACES) {
    for (const item of workspace.items) {
      const candidates = [item.path, ...(item.also ?? [])];
      for (const candidate of candidates) {
        const matches = candidate === "/" ? path === "/" : path.startsWith(candidate);
        if (matches && (best === null || candidate.length > best.score)) {
          best = { workspace, score: candidate.length };
        }
      }
    }
  }

  return best?.workspace ?? WORKSPACES[0];
}

/// Whether a sidebar item should read as current.
export function isItemActive(item: WorkspaceItem, pathname: string): boolean {
  const path = pathname.toLowerCase();
  if (item.path === "/") return path === "/";

  return [item.path, ...(item.also ?? [])].some((candidate) => path.startsWith(candidate));
}
