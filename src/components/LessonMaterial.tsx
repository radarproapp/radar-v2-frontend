import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "./Icon";
import { VideoEmbed } from "./VideoEmbed";
import { parseVideoUrl } from "../lib/video";
import type { LessonResource } from "../lib/types";

/// The five videos and two reads for one lesson, each with what is in it.
///
/// Resources used to attach to the stage, not the lesson — and when none matched the stage's
/// level the code handed it every resource on the path, so a lesson on ARP spoofing could show the
/// same list as a lesson on VLAN hopping. One video was resolved per lesson and the rest of the
/// search results were discarded.
///
/// Two things it deliberately does not do. It does not pad: a lesson with three videos and no
/// article shows three videos, because a search link presented as a resource is a resource in
/// name only. And it does not present a description-derived summary as though somebody watched
/// the video — the provenance is on screen, because a summary of a blurb and a summary of forty
/// minutes read identically otherwise.

function Summary({ resource }: { resource: LessonResource }) {
  if (!resource.summary) {
    // Said as a fact about this item, not as a promise about a later one.
    //
    // This read "No summary yet — it is written on the next visit", which is false in both cases
    // it actually appears. An article's summary is the publisher's own, copied when the item was
    // ingested; nothing writes one later, so an article without one never gets one. And a video's
    // is written by the same call that admitted it, so once a lesson has settled there is no
    // next visit to write anything.
    return (
      <p className="material__nosummary">
        {resource.kind !== "Video"
          ? "The publisher did not provide a summary."
          : resource.summarySource === "Transcript"
            // Said accurately. This read "too little in the description" even when Radar had
            // read the whole transcript — blaming the wrong source for its own silence.
            ? "No summary — Radar read this one and could not describe it."
            : "No summary — there was too little in the description to write one from."}
      </p>
    );
  }

  return (
    <>
      <p className="material__summary">{resource.summary}</p>

      {/* Where the summary came from, which is the whole reason this field is stored.
          Only Description said anything, so the one case worth distinguishing — a summary
          written from the video's own words — looked exactly like a summary written from a
          two-line blurb. */}
      {resource.summarySource === "Description" && (
        <p className="material__provenance">From the title and channel — not from watching it.</p>
      )}

      {resource.summarySource === "Transcript" && (
        <p className="material__provenance">
          From what is said in the video
          {resource.licence ? ` · ${resource.licence}` : ""}
        </p>
      )}
    </>
  );
}

/// Why this is in the lesson, in the words of the check that admitted it.
///
/// Nothing is written here on its behalf. A resource kept without a reason shows none, because a
/// sentence Radar invented about why something matters — attributed to a judgement that never
/// produced one — is the small fabrication the rest of the product refuses to make.
function WhyKept({ resource }: { resource: LessonResource }) {
  if (!resource.whyRelevant) return null;

  return <p className="material__why">{resource.whyRelevant}</p>;
}

export function LessonMaterial({
  resources,
  note = "",
}: {
  resources: LessonResource[];
  note?: string;
}) {
  const navigate = useNavigate();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // An empty list is a result, not an absence. The server already tells apart a library that
  // holds nothing for this lesson, a check that could not be made, and one still running —
  // rendering all three as the same blank space threw that away, and it meant a provider outage
  // emptying every lesson on the platform would have looked exactly like a thin corpus.
  if (resources.length === 0) {
    return note ? <p className="material__note">{note}</p> : null;
  }

  const videos = resources.filter((r) => r.kind === "Video");
  const articles = resources.filter((r) => r.kind === "Article");

  // Only what can actually play. A url parseVideoUrl refuses is a search page, and pretending one
  // is a video is worse than sending somebody to look.
  const playable = videos.filter((v) => parseVideoUrl(v.embedUrl ?? v.url) !== null);
  const current = playable.find((v) => v.id === selectedId) ?? playable[0];
  const queue = videos.filter((v) => v.id !== current?.id);

  return (
    <div className="material">
      {videos.length > 0 && (
        <section className="material__section">
          <div className="material__label">
            Watch <span className="material__count">{videos.length}</span>
          </div>

          {current && (
            <div className="material__now">
              {/* Keyed so picking another video resets the poster rather than leaving the previous
                  clip on screen under a new title. */}
              <VideoEmbed key={current.id} url={current.embedUrl ?? current.url} title={current.title} />

              <div className="material__now-meta">
                <span className="material__now-title">{current.title}</span>
                <span className="material__now-source">
                  {current.source}
                  {current.duration ? ` · ${current.duration}` : ""}
                </span>
              </div>

              <WhyKept resource={current} />
              <Summary resource={current} />
            </div>
          )}

          {queue.map((video) => {
            const canPlay = parseVideoUrl(video.embedUrl ?? video.url) !== null;

            return (
              <article key={video.id} className="material__item">
                {/* A row that plays is a button; one that only links out is a link.
                    It used to be a disabled button with an anchor inside it, and a browser does
                    not dispatch clicks into a disabled button's subtree - so the link was inert
                    and a video Radar could not play was a video nobody could open either. */}
                {canPlay ? (
                  <button
                    className="material__item-head"
                    onClick={() => setSelectedId(video.id)}
                  >
                    {video.thumbnailUrl && (
                      <img className="material__thumb" src={video.thumbnailUrl} alt="" loading="lazy" />
                    )}

                    <span className="material__item-text">
                      <span className="material__item-title">{video.title}</span>
                      <span className="material__item-source">
                        {video.source}
                        {video.duration ? ` · ${video.duration}` : ""}
                      </span>
                    </span>

                    <Icon name="play" size={14} />
                  </button>
                ) : (
                  <a
                    className="material__item-head"
                    href={video.url}
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    {video.thumbnailUrl && (
                      <img className="material__thumb" src={video.thumbnailUrl} alt="" loading="lazy" />
                    )}

                    <span className="material__item-text">
                      <span className="material__item-title">{video.title}</span>
                      <span className="material__item-source">
                        {video.source}
                        {video.duration ? ` · ${video.duration}` : ""}
                      </span>
                    </span>

                    {/* Honest about what it is rather than dressed as a player. */}
                    <span className="material__out">
                      <Icon name="external" size={13} />
                    </span>
                  </a>
                )}

                <div className="material__item-body">
                  <WhyKept resource={video} />
                  <Summary resource={video} />
                </div>
              </article>
            );
          })}
        </section>
      )}

      {articles.length > 0 && (
        <section className="material__section">
          <div className="material__label">
            Read <span className="material__count">{articles.length}</span>
          </div>

          {articles.map((article) => (
            <article key={article.id} className="material__item">
              {/* Into the brief when Radar ingested it, because the brief carries the why and the
                  next move. Straight out to the publisher when it did not. */}
              {article.contentItemId ? (
                <button
                  className="material__item-head"
                  onClick={() => navigate(`/feed/${article.contentItemId}`)}
                >
                  <span className="material__item-text">
                    <span className="material__item-title">{article.title}</span>
                    <span className="material__item-source">
                      {article.source}
                      {article.duration ? ` · ${article.duration}` : ""}
                    </span>
                  </span>
                  <Icon name="next" size={14} />
                </button>
              ) : (
                <a
                  className="material__item-head"
                  href={article.url}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  <span className="material__item-text">
                    <span className="material__item-title">{article.title}</span>
                    <span className="material__item-source">{article.source}</span>
                  </span>
                  <Icon name="external" size={13} />
                </a>
              )}

              <div className="material__item-body">
                <WhyKept resource={article} />
                <Summary resource={article} />
              </div>
            </article>
          ))}
        </section>
      )}

      {/* After the material, not instead of it: this case is "some arrived, more is coming". */}
      {note && <p className="material__note">{note}</p>}
    </div>
  );
}
