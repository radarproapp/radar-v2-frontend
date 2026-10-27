import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { Icon } from "../components/Icon";
import { LoadingSkeleton } from "../components/LoadingSkeleton";
import { ApiError, getUserGraph } from "../lib/api";
import { humanize } from "../lib/date";
import { hoursAndMinutes } from "../lib/duration";

/// Your graph: what you have actually done, in Radar.
///
/// This page used to read nine counters off `profile.stats` — ArticlesRead, PodcastsFinished,
/// VideosWatched, OpportunitiesApplied and the rest. Nothing in the codebase ever wrote to any of
/// them, so every user who ever opened it saw nine tiles of zero under the heading "Your learning
/// journey, quantified".
///
/// It is derived now, from the rows the user's own actions created: analytics events, playback
/// heartbeats, roadmap modules, answered quizzes, applications, notes and projects. Where there
/// are no rows the number is absent rather than nought, because those are different claims.

function Tile({ value, label, hint }: { value: string | number; label: string; hint?: string }) {
  return (
    <div className="graph-tile">
      <div className="graph-tile__value">{value}</div>
      <div className="graph-tile__label">{label}</div>
      {hint && <div className="graph-tile__hint">{hint}</div>}
    </div>
  );
}

export function GrowthTracker() {
  const navigate = useNavigate();

  const graphQuery = useQuery({ queryKey: ["me", "graph"], queryFn: getUserGraph, retry: 1 });
  const graph = graphQuery.data;

  if (graphQuery.isLoading) {
    return (
      <div className="r-page" style={{ maxWidth: 820 }}>
        <div className="r-page-head">
          <h1 className="r-page-title">Your graph</h1>
        </div>
        <LoadingSkeleton variant="stats" />
      </div>
    );
  }

  if (graphQuery.isError || !graph) {
    return (
      <div className="r-page" style={{ maxWidth: 820 }}>
        <div className="r-page-head">
          <h1 className="r-page-title">Your graph</h1>
        </div>
        <ErrorState
          title="Could not load your graph"
          description={
            graphQuery.error instanceof ApiError
              ? graphQuery.error.message
              : "Something went wrong reading your history."
          }
          onRetry={() => graphQuery.refetch()}
        />
      </div>
    );
  }

  const { listening, learning, opportunities, reading } = graph;
  const peakMonth = [...graph.months].sort((a, b) => b.interactions - a.interactions)[0];

  return (
    <div className="r-page graph" style={{ maxWidth: 820 }}>
      <div className="r-page-head">
        <h1 className="r-page-title">Your graph</h1>
        <p className="r-page-sub">
          {graph.firstActivityAt
            ? `Everything you have done in Radar since ${humanize(graph.firstActivityAt)}.`
            : "Everything you have done in Radar."}
        </p>
      </div>

      {/* A new account gets something to do, not a wall of noughts. The server says which this
          is; the page does not guess from a sum being zero. */}
      {!graph.hasActivity ? (
        <EmptyState
          icon="trend"
          title="Nothing to show yet"
          description="Your graph fills itself in as you read, listen, build a path and apply for things. Nothing here is estimated — it is only ever what you have actually done."
        >
          <button className="btn btn--primary" onClick={() => navigate("/feed")}>
            Open your feed
          </button>
        </EmptyState>
      ) : (
        <>
          {listening.secondsPlayed > 0 && (
            <div className="graph-hero">
              <div className="graph-hero__label">Time listened and watched</div>
              <div className="graph-hero__value">{hoursAndMinutes(listening.secondsPlayed)}</div>
              <div className="graph-hero__note">
                Time that actually elapsed while playing — scrubbing to the end earns nothing.
              </div>

              {listening.mostPlayed && (
                <button
                  className="graph-hero__most"
                  onClick={() => navigate(`/feed/${listening.mostPlayed!.id}`)}
                >
                  <span className="graph-hero__most-label">Most played</span>
                  <span className="graph-hero__most-title">{listening.mostPlayed.title}</span>
                  <span className="graph-hero__most-meta">
                    {listening.mostPlayed.source} · {hoursAndMinutes(listening.mostPlayed.secondsPlayed)}
                  </span>
                </button>
              )}
            </div>
          )}

          <div className="graph-grid">
            {listening.episodesStarted > 0 && (
              <Tile
                value={`${listening.episodesFinished}/${listening.episodesStarted}`}
                label="Episodes finished"
                hint="of those you started"
              />
            )}
            {listening.videosStarted > 0 && (
              <Tile
                value={`${listening.videosFinished}/${listening.videosStarted}`}
                label="Videos finished"
                hint="of those you started"
              />
            )}
            {reading.itemsOpened > 0 && <Tile value={reading.itemsOpened} label="Briefs opened" />}
            {reading.papersOpened > 0 && <Tile value={reading.papersOpened} label="Papers opened" />}
            {reading.itemsSaved > 0 && <Tile value={reading.itemsSaved} label="Saved" hint="net of unsaved" />}
            {reading.notesWritten > 0 && <Tile value={reading.notesWritten} label="Notes written" />}
            {reading.capturesMade > 0 && <Tile value={reading.capturesMade} label="Captures" />}

            {learning.lessonsTotal > 0 && (
              <Tile
                value={`${learning.lessonsCompleted}/${learning.lessonsTotal}`}
                label="Lessons completed"
              />
            )}
            {learning.pathSections > 0 && <Tile value={learning.pathSections} label="Path sections" />}
            {learning.quizzesTaken > 0 && (
              <Tile
                value={learning.quizzesTaken}
                label="Quizzes taken"
                /* Null rather than zero when none are complete — a different claim from scoring
                   nothing — so the hint is simply absent. */
                hint={learning.averageQuizScore !== null ? `${learning.averageQuizScore}% average` : undefined}
              />
            )}
            {learning.projectsCompleted > 0 && (
              <Tile value={learning.projectsCompleted} label="Projects completed" />
            )}
            {learning.exercisesCompleted > 0 && (
              <Tile value={learning.exercisesCompleted} label="Lab exercises done" />
            )}
            {opportunities.applied > 0 && <Tile value={opportunities.applied} label="Applications" />}
            {opportunities.saved > 0 && <Tile value={opportunities.saved} label="Opportunities saved" />}
          </div>

          {graph.topTopics.length > 0 && (
            <section className="graph-section">
              <div className="graph-section__label">What you spend time on</div>
              <p className="graph-section__note">
                Ranked by time played first, then by how many of your actions touched it. Items you
                were merely shown are not counted — that would rank what Radar pushed, not what you
                chose.
              </p>

              {graph.topTopics.map((topic) => {
                const widest = graph.topTopics[0];
                const basis = widest.secondsPlayed > 0 ? widest.secondsPlayed : widest.interactions;
                const mine = topic.secondsPlayed > 0 ? topic.secondsPlayed : topic.interactions;

                return (
                  <div key={topic.topic} className="graph-row">
                    <div className="graph-row__head">
                      <span className="graph-row__name">{topic.topic}</span>
                      <span className="graph-row__value">
                        {topic.secondsPlayed > 0
                          ? hoursAndMinutes(topic.secondsPlayed)
                          : `${topic.interactions} ${topic.interactions === 1 ? "action" : "actions"}`}
                      </span>
                    </div>
                    <div className="graph-row__bar">
                      <div
                        className="graph-row__bar-fill"
                        style={{ width: `${basis > 0 ? Math.max(4, (mine / basis) * 100) : 0}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </section>
          )}

          {graph.topSources.length > 0 && (
            <section className="graph-section">
              <div className="graph-section__label">Who you read most</div>
              <div className="graph-chips">
                {graph.topSources.map((source) => (
                  <span key={source.source} className="graph-chip">
                    {source.source}
                    <span className="graph-chip__count">{source.opens}</span>
                  </span>
                ))}
              </div>
            </section>
          )}

          {learning.subjects.length > 0 && (
            <section className="graph-section">
              <div className="graph-section__label">What you are learning</div>
              <div className="graph-chips">
                {learning.subjects.map((subject, i) => (
                  <span key={`${subject}-${i}`} className="graph-chip">
                    {subject}
                  </span>
                ))}
              </div>
            </section>
          )}

          {learning.weakAreas.length > 0 && (
            <section className="graph-section">
              <div className="graph-section__label">What the quizzes keep finding</div>
              <div className="graph-chips">
                {learning.weakAreas.map((area) => (
                  <span key={area} className="graph-chip graph-chip--weak">
                    {area}
                  </span>
                ))}
              </div>
              <p className="graph-section__note">
                Subtopics where more answers were wrong than right. A count, not a verdict.
              </p>
            </section>
          )}

          {Object.keys(opportunities.byStatus).length > 0 && (
            <section className="graph-section">
              <div className="graph-section__label">Where your applications stand</div>
              <div className="graph-chips">
                {Object.entries(opportunities.byStatus).map(([status, count]) => (
                  <span key={status} className="graph-chip">
                    {status}
                    <span className="graph-chip__count">{count}</span>
                  </span>
                ))}
              </div>
            </section>
          )}

          {graph.months.length > 1 && (
            <section className="graph-section">
              <div className="graph-section__label">Month by month</div>
              <div className="graph-months">
                {graph.months.map((month) => {
                  const tallest = Math.max(...graph.months.map((m) => m.interactions), 1);

                  return (
                    <div key={month.month} className="graph-month">
                      <div className="graph-month__bar-wrap">
                        <div
                          className="graph-month__bar"
                          style={{ height: `${Math.max(3, (month.interactions / tallest) * 100)}%` }}
                          title={`${month.interactions} actions`}
                        />
                      </div>
                      <div className="graph-month__label">
                        {new Date(month.month).toLocaleDateString(undefined, { month: "short" })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {peakMonth && (
                <p className="graph-section__note">
                  Your busiest month was{" "}
                  {new Date(peakMonth.month).toLocaleDateString(undefined, {
                    month: "long",
                    year: "numeric",
                  })}
                  , with {peakMonth.interactions} actions.
                </p>
              )}
            </section>
          )}

          {graph.lastActivityAt && (
            <div className="graph-foot">
              <Icon name="time" size={12} /> Last activity {humanize(graph.lastActivityAt)}
            </div>
          )}
        </>
      )}
    </div>
  );
}
