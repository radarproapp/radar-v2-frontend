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
      { label: "Learn", path: "/learn", icon: "explore" },
      { label: "My path", path: "/learn/path", icon: "checklist" },
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
      const score = matchScore(item, path);
      if (score >= 0 && (best === null || score > best.score)) {
        best = { workspace, score };
      }
    }
  }

  return best?.workspace ?? WORKSPACES[0];
}

/// How specifically an item claims a path: the length of its longest matching prefix, or -1 for
/// no match. Exported for the sibling comparison below and for the tests.
function matchScore(item: WorkspaceItem, path: string): number {
  if (item.path === "/") return path === "/" ? 1 : -1;

  let best = -1;
  for (const candidate of [item.path, ...(item.also ?? [])]) {
    // Segment-aware: "/learn" must not claim "/learnhub". Only an exact match or a match
    // followed by a slash counts.
    const isPrefix = path === candidate || path.startsWith(`${candidate}/`);
    if (isPrefix && candidate.length > best) best = candidate.length;
  }
  return best;
}

/// Whether a sidebar item should read as current.
///
/// Scored against its siblings rather than matched on its own. A plain prefix test lit up both
/// "Learn" (/learn) and "My path" (/learn/path) when the learner was on the latter — two
/// highlighted rows, neither of them wrong on its own terms. The most specific claim wins, so
/// only one row is ever current.
export function isItemActive(item: WorkspaceItem, pathname: string, siblings?: WorkspaceItem[]): boolean {
  const path = pathname.toLowerCase();
  const score = matchScore(item, path);
  if (score < 0) return false;

  const others = siblings ?? workspaceForPath(pathname).items;
  return !others.some((other) => other !== item && matchScore(other, path) > score);
}
