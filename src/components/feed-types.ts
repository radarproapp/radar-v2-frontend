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

/// News, podcasts and posts. Nothing else.
///
/// Papers, policy documents and essays moved to Research Discovery, which is the product built
/// to read them: a working paper arriving between two news items is in the way of both the
/// person skimming the news and the person looking for the paper. Videos went to Radar Learn,
/// where somebody asks for a video on a subject rather than being shown whatever arrived today.
///
/// The chips narrow within the feed now rather than reaching past its edge - /feed?type=
/// ResearchPaper used to return papers under a heading that says Intelligence.
export const FEED_TYPES: FeedType[] = [
  { label: "All", type: null, icon: "radar" },
  { slug: "news", label: "News", type: "Article", icon: "article" },
  { slug: "podcasts", label: "Podcasts", type: "Podcast", icon: "podcast" },
];

/// The type a URL is asking for. Anything unrecognised reads as "All" rather than an empty feed,
/// because a mistyped link should show something.
export function feedTypeFor(slug: string | null): FeedType {
  if (!slug) return FEED_TYPES[0];
  return FEED_TYPES.find((entry) => entry.slug === slug.toLowerCase()) ?? FEED_TYPES[0];
}
