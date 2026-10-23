import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "./Icon";
import { pickGuidance } from "../lib/guidance";

/// Short pointers to what Radar can do, shown where there is nothing else to show.
///
/// Radar now starts empty on purpose — the path, and the Hub behind it, wait to be told what the
/// learner wants rather than guessing from their degree. That is the honest default, but an empty
/// screen explains nothing on its own, and the three workspaces hold more than a first visit can
/// discover by clicking around.
///
/// A rotating few rather than the whole list: ten cards is another wall, and a different three on
/// the next visit surfaces more of the product over time than a fixed three ever would.

interface GuidanceCardsProps {
  /// How many to show. Three fits a row on a laptop and stacks cleanly on a phone.
  count?: number;
  /// Cards that would be redundant here — the screen already offers that action.
  exclude?: string[];
  heading?: string;
}

export function GuidanceCards({ count = 3, exclude = [], heading = "While you are here" }: GuidanceCardsProps) {
  const navigate = useNavigate();

  const excludeKey = exclude.join(",");

  // Chosen once per mount, keyed on what is excluded rather than the array it arrived in.
  // Callers pass that inline, so depending on its identity would reshuffle the cards on every
  // render — under the cursor of whoever was deciding which one to click.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const cards = useMemo(() => pickGuidance(count, exclude), [count, excludeKey]);

  if (cards.length === 0) return null;

  return (
    <section className="guide" aria-label={heading}>
      <div className="guide__heading">{heading}</div>

      <div className="guide__grid">
        {cards.map((card) => (
          <button key={card.id} className="guide__card" onClick={() => navigate(card.path)}>
            <span className="guide__icon">
              <Icon name={card.icon} size={17} />
            </span>
            <span className="guide__title">{card.title}</span>
            <span className="guide__body">{card.body}</span>
            <span className="guide__action">
              {card.action}
              <Icon name="next" size={12} />
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
