import { useState } from "react";
import { Icon } from "./Icon";
import { VideoEmbed } from "./VideoEmbed";
import { parseVideoUrl } from "../lib/video";
import type { LearningResource } from "../lib/types";

/// The material for a lesson, led by its video — played here, not on YouTube.
///
/// The path used to render every resource as an external link, so a learner working through a
/// section was sent out of Radar for each one and had to find their way back. A course you leave
/// to use is not a course. The player sits where the lesson is, and picking another video swaps
/// it rather than opening a tab.
///
/// Not everything can play. Where Radar has not yet resolved a real video for a lesson the URL is
/// a YouTube *search*, which `parseVideoUrl` correctly refuses — those stay links, because
/// pretending a search page is a video would be worse than sending someone to look. The backend
/// warms those in the background, so a lesson that is a link today is usually a player tomorrow.
export function PathResources({ resources }: { resources: LearningResource[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (resources.length === 0) return null;

  const playable = resources.filter((resource) => parseVideoUrl(resource.url) !== null);
  const current = resources.find((resource) => resource.id === selectedId) ?? playable[0];
  const rest = resources.filter((resource) => resource.id !== current?.id);

  return (
    <>
      {current && (
        <div className="path-player">
          {/* Keyed so choosing another video resets the poster rather than leaving the previous
              clip on screen under a new title. */}
          <VideoEmbed key={current.id} url={current.url} title={current.title} />
          <div className="path-player__meta">
            <span className="path-player__title">{current.title}</span>
            <span className="path-player__source">
              {current.channelOrAuthor || current.source}
              {current.duration ? ` · ${current.duration}` : ""}
            </span>
          </div>
        </div>
      )}

      {rest.length > 0 && (
        <div className="path-resources">
          <div className="path-resources__label">{current ? "Also for this lesson" : "What to use for this"}</div>

          {rest.map((resource) => {
            const canPlay = parseVideoUrl(resource.url) !== null;
            const meta = `${resource.channelOrAuthor || resource.source}${resource.duration ? ` · ${resource.duration}` : ""}`;

            // A playable one swaps the player above. Anything else is honestly a link out.
            return canPlay ? (
              <button key={resource.id} className="path-resource" onClick={() => setSelectedId(resource.id)}>
                <Icon name="play" size={15} />
                <span className="path-resource__text">
                  <span className="path-resource__title">{resource.title}</span>
                  <span className="path-resource__source">{meta}</span>
                </span>
                <span className="path-resource__action">Play</span>
              </button>
            ) : (
              <a
                key={resource.id}
                className="path-resource"
                href={resource.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Icon name={resource.type === "BlogPost" ? "article" : "search"} size={15} />
                <span className="path-resource__text">
                  <span className="path-resource__title">{resource.title}</span>
                  <span className="path-resource__source">{meta}</span>
                </span>
                <Icon name="external" size={13} />
              </a>
            );
          })}
        </div>
      )}
    </>
  );
}
