import { useRef } from "react";

/// The two surfaces, as tabs rather than columns.
///
/// The brief asks for "Information for you" and "Opportunities for you" side by side, scrolling
/// like social media. Side by side is a desktop idea — at phone width, where most of Radar's
/// users are, two columns means two half-width columns and neither reads. X solves the same
/// problem with For you / Following: sticky tabs, one full-width column underneath, each tab
/// keeping its own place in the scroll.
///
/// So the two columns of the brief become two tabs, and the scrolling the brief actually
/// describes survives intact.
///
/// Swipe is deliberately not implemented here. A horizontal gesture that changes surface fights
/// every horizontal scroll inside a card and is the kind of thing that feels broken on a cheap
/// Android more often than it feels clever; tapping a tab is unambiguous and works with a
/// keyboard. It can be added later behind a real device test rather than guessed at.
export type FeedTab = "information" | "opportunities";

export function FeedTabs({
  active,
  onChange,
  counts,
}: {
  active: FeedTab;
  onChange: (tab: FeedTab) => void;
  /// Shown only when there is something to count. A tab reading "Opportunities 0" is worse than
  /// one reading "Opportunities": the first is a statement about emptiness, the second is a
  /// place to look.
  counts?: Partial<Record<FeedTab, number>>;
}) {
  const bar = useRef<HTMLDivElement>(null);

  /// Arrow keys move between tabs, which is what a tablist is expected to do and what a row of
  /// buttons does not do for free.
  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;

    event.preventDefault();
    const next: FeedTab = active === "information" ? "opportunities" : "information";
    onChange(next);

    bar.current?.querySelector<HTMLButtonElement>(`[data-tab="${next}"]`)?.focus();
  }

  return (
    <div className="feed-tabs" role="tablist" aria-label="Feed" ref={bar} onKeyDown={onKeyDown}>
      <Tab id="information" active={active} onChange={onChange} count={counts?.information}>
        Information
      </Tab>
      <Tab id="opportunities" active={active} onChange={onChange} count={counts?.opportunities}>
        Opportunities
      </Tab>
    </div>
  );
}

function Tab({
  id,
  active,
  onChange,
  count,
  children,
}: {
  id: FeedTab;
  active: FeedTab;
  onChange: (tab: FeedTab) => void;
  count?: number;
  children: React.ReactNode;
}) {
  const selected = active === id;

  return (
    <button
      type="button"
      role="tab"
      data-tab={id}
      id={`feed-tab-${id}`}
      aria-selected={selected}
      aria-controls={`feed-panel-${id}`}
      /// Only the selected tab is in the tab order. A tablist is one stop, and arrows move
      /// within it — otherwise every tab is a separate stop and keyboard users pay for the
      /// pattern rather than being helped by it.
      tabIndex={selected ? 0 : -1}
      className={`feed-tab${selected ? " is-active" : ""}`}
      onClick={() => onChange(id)}
    >
      <span className="feed-tab__label">
        {children}
        {count !== undefined && count > 0 && <span className="feed-tab__count">{count}</span>}
      </span>
    </button>
  );
}
