import { useNavigate } from "react-router-dom";
import { Icon } from "./Icon";
import type { Opportunity } from "../lib/types";

/// The third strand of Radar Intelligence: things you can actually apply for.
///
/// Radar Intelligence is developments in the subjects you follow, material for what you are
/// working towards, and opportunities you can act on. The third lived only behind its own screen,
/// so the feed showed two thirds of what it is.
///
/// Deliberately not the card from the Opportunities page. That one carries a match tier, an
/// urgency band, requirements, eligibility and tracking actions, because that screen is where
/// somebody goes to decide. This sits above a feed that somebody came to read, so it carries the
/// four things that decide whether to stop scrolling — what it is, who it is from, when it
/// closes, and why Radar thinks it fits — and sends them to that screen for the rest.
///
/// A deadline is the only part of an opportunity that expires, so it is never omitted when known
/// and never invented when not.

function daysLeft(opportunity: Opportunity): string | null {
  if (!opportunity.deadline) return null;

  const days = opportunity.daysUntilDeadline;

  if (days < 0) return null;
  if (days === 0) return "Closes today";
  if (days === 1) return "1 day left";
  if (days <= 14) return `${days} days left`;

  return `Closes ${new Date(opportunity.deadline).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  })}`;
}

export function FeedOpportunities({
  opportunities,
  focus,
}: {
  opportunities: Opportunity[];
  focus?: string;
}) {
  const navigate = useNavigate();

  if (opportunities.length === 0) return null;

  return (
    <section className="feed-opps" aria-label="Opportunities for you">
      <div className="feed-opps__head">
        <span className="feed-opps__label">
          <Icon name="deadline" size={13} /> Open to you now
        </span>

        {/* Named so the match can be disagreed with, and omitted rather than guessed at when
            Radar has nothing to claim it matched against. */}
        {focus ? <span className="feed-opps__focus">matched on {focus}</span> : null}
      </div>

      <div className="feed-opps__list">
        {opportunities.map((opportunity) => {
          const closes = daysLeft(opportunity);

          return (
            <button
              key={opportunity.id}
              className="feed-opps__item"
              onClick={() => navigate(`/opportunities?open=${opportunity.id}`)}
            >
              <span className="feed-opps__title">{opportunity.title}</span>

              <span className="feed-opps__meta">
                {opportunity.organisation}
                {closes ? <span className="feed-opps__closes"> · {closes}</span> : null}
              </span>

              {/* Radar's own reason, when it has one. Nothing is written here on its behalf. */}
              {opportunity.whyItFits ? (
                <span className="feed-opps__why">{opportunity.whyItFits}</span>
              ) : null}
            </button>
          );
        })}
      </div>

      <button className="btn btn--text btn--sm" onClick={() => navigate("/opportunities")}>
        See all opportunities
      </button>
    </section>
  );
}
