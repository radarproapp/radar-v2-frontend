import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getAdminActivity, getAdminEngagement } from "../lib/api";

/// What is actually happening in Radar, from the events it already records.
///
/// Seventeen kinds of event were being written to the database - impressions, opens, saves,
/// dismissals, reports, searches - and nothing in the admin area read any of them. So the
/// question this screen exists to answer was one the database could answer and the product
/// could not.
///
/// Every number here is counted. Nothing is estimated, and a question the events cannot answer
/// says so rather than showing a figure - because a number on a dashboard gets quoted in a
/// meeting, and the sections this replaces were quoting "AI confidence 91.3%" at nobody.

const WINDOWS = [7, 30, 90] as const;

function Window({ days, onChange }: { days: number; onChange: (next: number) => void }) {
  return (
    <div className="admin-window">
      {WINDOWS.map((option) => (
        <button
          key={option}
          className={`admin-window__option ${days === option ? "active" : ""}`}
          onClick={() => onChange(option)}
          aria-pressed={days === option}
        >
          {option} days
        </button>
      ))}
    </div>
  );
}

/// A bar whose height is relative to the busiest day in view, so a quiet month still reads.
function Bars({ rows }: { rows: { day: string; events: number; people: number }[] }) {
  const busiest = Math.max(...rows.map((row) => row.events), 1);

  return (
    <div className="admin-bars">
      {rows.map((row) => (
        <div
          className="admin-bars__col"
          key={row.day}
          title={`${new Date(row.day).toDateString()} — ${row.events} events, ${row.people} people`}
        >
          <div className="admin-bars__fill" style={{ height: `${(row.events / busiest) * 100}%` }} />
          <div
            className="admin-bars__people"
            style={{ height: `${(row.people / busiest) * 100}%` }}
          />
        </div>
      ))}
    </div>
  );
}

export function AdminActivitySection() {
  const [days, setDays] = useState<number>(30);
  const activity = useQuery({ queryKey: ["admin", "activity", days], queryFn: () => getAdminActivity(days) });

  if (activity.isError) return <div className="r-admin-page"><div className="admin-card">Could not read activity. Try again shortly.</div></div>;

  // Checked for being there, rather than asserted with `!`. isLoading is isPending && isFetching,
  // so an offline browser - where the default network mode pauses the fetch while leaving it
  // pending - is neither loading nor errored, and the assertion handed the render undefined.
  // A non-JSON 2xx, which is what a proxy serving index.html for /api/* produces, lands here too.
  if (!activity.data) return <div className="r-admin-page"><div className="admin-card">Counting…</div></div>;

  const data = activity.data;
  const daysWithActivity = data.byDay.filter((row) => row.events > 0).length;
  const busiest = data.byDay.reduce((best, row) => (row.events > (best?.events ?? -1) ? row : best), data.byDay[0]);

  // Which of the model's event kinds have actually been seen. A dashboard that does not say
  // what it is missing invites its own figures to be read as the whole picture.
  const unseen = data.recorded.filter((kind) => !(kind in data.mix));

  return (
    <div className="r-admin-page">
      <Window days={days} onChange={setDays} />

      {data.byDay.length === 0 ? (
        <div className="admin-card">
          Nothing recorded in the last {data.days} days. That is the honest answer rather than an
          empty chart: either nobody has used Radar in that window, or events are not reaching
          the database.
        </div>
      ) : (
        <>
          <div className="admin-card">
            <div className="admin-card__title">Events and people, by day</div>
            <Bars rows={data.byDay} />
            <div className="admin-legend">
              <span><i className="admin-legend__swatch admin-legend__swatch--events" /> events</span>
              <span><i className="admin-legend__swatch admin-legend__swatch--people" /> distinct people</span>
            </div>
            <p className="admin-note">
              People, not sessions. One person opening forty things is one engaged reader and
              forty events, and a chart plotting only events cannot tell that from forty readers.
              {busiest && ` Busiest day: ${new Date(busiest.day).toDateString()}, ${busiest.events} events from ${busiest.people}.`}
            </p>
          </div>

          <div className="admin-split">
            <div className="admin-split__left">
              <div className="admin-card">
                <div className="admin-card__title">The funnel, for feed content</div>
                {([
                  ["Impressions", data.funnel.impressions],
                  ["Opens", data.funnel.opens],
                  ["Saves", data.funnel.saves],
                  ["Marked not relevant", data.funnel.dismissals],
                  ["Reported", data.funnel.reports],
                ] as const).map(([label, value]) => (
                  <div className="admin-user-detail__row" key={label}>
                    <span>{label}</span>
                    <span>{value.toLocaleString()}</span>
                  </div>
                ))}

                <p className="admin-note">
                  Feed content only — every stage counts events carrying a content id. Opens are
                  also recorded for opportunities, and counting those here made this read as a
                  logging gap that was not there. They are still in the mix beside it.
                </p>

                {/* Said rather than hidden. Each stage is counted from its own events, and now
                    that all five share one population, one larger than the stage above it is
                    not an arithmetic error - it means impressions are not being logged where
                    opens are. */}
                {data.funnel.opens > data.funnel.impressions && data.funnel.impressions > 0 && (
                  <p className="admin-note">
                    More opens than impressions. Each stage is counted from its own events, so
                    this is not a rounding error — impressions are not being recorded everywhere
                    opens are.
                  </p>
                )}
              </div>
            </div>

            <div className="admin-split__right">
              <div className="admin-card">
                <div className="admin-card__title">What kinds of thing happened</div>
                {Object.entries(data.mix)
                  .sort(([, a], [, b]) => b - a)
                  .map(([kind, count]) => (
                    <div className="admin-user-detail__row" key={kind}>
                      <span>{kind}</span>
                      <span>{count.toLocaleString()}</span>
                    </div>
                  ))}

                {unseen.length > 0 && (
                  <p className="admin-note">
                    Not seen in this window: {unseen.join(", ")}. Either nobody did those things,
                    or they are not being recorded — this screen cannot tell the two apart.
                  </p>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      <p className="admin-note">
        {daysWithActivity} of the last {data.days} days had any activity at all.
      </p>
    </div>
  );
}

export function AdminEngagementSection() {
  const [days, setDays] = useState<number>(30);
  const engagement = useQuery({ queryKey: ["admin", "engagement", days], queryFn: () => getAdminEngagement(days) });

  if (engagement.isError) return <div className="r-admin-page"><div className="admin-card">Could not read engagement. Try again shortly.</div></div>;
  if (!engagement.data) return <div className="r-admin-page"><div className="admin-card">Counting…</div></div>;

  const data = engagement.data;

  return (
    <div className="r-admin-page">
      <Window days={days} onChange={setDays} />

      <div className="admin-split">
        <div className="admin-split__left">
          <div className="admin-card">
            <div className="admin-card__title">What people opened</div>

            {data.items.length === 0 ? (
              <p className="admin-note">Nothing has been opened in the last {data.days} days.</p>
            ) : (
              data.items.map((item) => (
                <div className="admin-engaged" key={item.contentItemId}>
                  <div className="admin-engaged__title">{item.title}</div>
                  <div className="admin-engaged__meta">
                    {item.source} · {item.type}
                  </div>
                  <div className="admin-engaged__counts">
                    {item.opens} open{item.opens === 1 ? "" : "s"}
                    {item.saves > 0 && ` · ${item.saves} saved`}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="admin-split__right">
          <div className="admin-card">
            <div className="admin-card__title">Sources: what they filed, what was read</div>

            {data.sources.length === 0 ? (
              <p className="admin-note">No source has filed, been opened or been dismissed in this window.</p>
            ) : (
              data.sources.map((source) => (
                <div className="admin-user-detail__row" key={source.source}>
                  <span>{source.source}</span>
                  <span>
                    {source.published} filed · {source.opens} opened
                    {source.dismissals > 0 && ` · ${source.dismissals} dismissed`}
                  </span>
                </div>
              ))
            )}

            <p className="admin-note">
              Filed and opened side by side. A source filing forty items a day for three opens is
              costing ingestion budget and feed space to nobody's benefit, which is invisible on
              any chart ranking by opens alone — so a source that filed plenty and earned nothing
              is listed here too, and the order is the larger of what a source filed and what it
              earned. "Filed" counts by the date on the item, because content carries no
              ingestion time of its own.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
