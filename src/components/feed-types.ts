import type { ContentType } from "../lib/types";
import type { IconName } from "./icon-map";

/// The kinds of thing in the feed.
///
/// Shared between the sidebar and the page, and keyed on the URL rather than React state. Three
/// things follow from that: the sidebar can drive the filter without the page handing it a
/// setter, a filtered feed is a link you can send someone, and the browser's own back button
/// steps through filters the way a person expects it to.
export interface FeedType {
  /// Absent for "All", which is the feed with no filter.
  slug?: string;
  label: string;
  type: ContentType | null;
  icon: IconName;
}

export const FEED_TYPES: FeedType[] = [
  { label: "All", type: null, icon: "radar" },
  { slug: "articles", label: "Articles", type: "Article", icon: "article" },
  { slug: "videos", label: "Videos", type: "Video", icon: "video" },
  { slug: "podcasts", label: "Podcasts", type: "Podcast", icon: "podcast" },
  { slug: "papers", label: "Papers", type: "ResearchPaper", icon: "paper" },
  { slug: "policy", label: "Policy", type: "PolicyPaper", icon: "policy" },
  { slug: "ideas", label: "Ideas", type: "Essay", icon: "idea" },
];

/// The type a URL is asking for. Anything unrecognised reads as "All" rather than an empty feed,
/// because a mistyped link should show something.
export function feedTypeFor(slug: string | null): FeedType {
  if (!slug) return FEED_TYPES[0];
  return FEED_TYPES.find((entry) => entry.slug === slug.toLowerCase()) ?? FEED_TYPES[0];
}
