import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { Icon } from "../components/Icon";
import { LoadingSkeleton } from "../components/LoadingSkeleton";
import { useAuth } from "../auth/AuthContext";
import { ApiError, searchResearch } from "../lib/api";
import { PaperCard } from "../components/PaperCard";

/// Research Discovery, over OpenAlex.
///
/// Every result arrives from `GET /api/research/search`, which is OpenAlex and nothing else, so
/// every paper on this page has a DOI that resolves. That is worth stating because it was not
/// true: a hand-written catalogue of eight papers used to be returned ahead of the live results,
/// six of whose DOIs were 404 at doi.org, with authors, journals and statistics written by hand.
/// It sat behind the citation endpoint, so Radar would format an invented paper into a reference
/// list on request.
///
/// The search box starts empty. Radar does not guess what somebody wants to read about — their
/// declared interests are offered as one-tap searches, because they said those, but nothing is
/// searched until they ask for it.

const YEARS = [
  { label: "Any year", value: 0 },
  { label: "Since 2020", value: 2020 },
  { label: "Since 2023", value: 2023 },
  { label: "Since 2025", value: 2025 },
];

export function Research() {
  const { profile } = useAuth();

  // ?q= lets the Hub hand a subject straight here without the user retyping it. Read once as the
  // initial value rather than kept in sync: after that the box is the user's, and a back
  // navigation should not overwrite what they have typed.
  const [params] = useSearchParams();
  const initial = params.get("q")?.trim() ?? "";

  const [draft, setDraft] = useState(initial);
  // The query that was actually submitted. Separate from the draft so the list does not refetch
  // on every keystroke, and so a half-typed word never becomes a search.
  const [query, setQuery] = useState(initial);
  const [yearFrom, setYearFrom] = useState(0);

  const results = useQuery({
    queryKey: ["research", query, yearFrom],
    queryFn: () => searchResearch({ q: query, yearFrom, pageSize: 20 }),
    enabled: query.trim().length > 1,
    retry: 1,
  });

  const run = (term: string) => {
    const trimmed = term.trim();
    if (trimmed.length < 2) return;
    setDraft(trimmed);
    setQuery(trimmed);
  };

  const interests = (profile?.interests ?? []).filter((i) => i.trim()).slice(0, 6);
  const papers = results.data ?? [];

  return (
    <div className="r-page research">
      <div className="r-page-head">
        <h1 className="r-page-title">Research Discovery</h1>
        <p className="research__sub">
          Search OpenAlex. Open any result for the paper in about 500 words of plain English —
          what it is about, the problem, how they did it, what they found and what they conclude.
          Every result carries a DOI you can resolve, and open-access copies are linked where they
          exist.
        </p>
      </div>

      <form
        className="research__search"
        onSubmit={(e) => {
          e.preventDefault();
          run(draft);
        }}
      >
        <div className="research__field">
          <Icon name="search" size={16} />
          <input
            className="research__input"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="A topic, a method, a question — not a DOI"
            aria-label="Search research papers"
          />
          {draft && (
            <button
              type="button"
              className="research__clear"
              onClick={() => {
                setDraft("");
                setQuery("");
              }}
              aria-label="Clear search"
            >
              <Icon name="close" size={14} />
            </button>
          )}
        </div>

        <button className="btn btn--primary" type="submit" disabled={draft.trim().length < 2}>
          Search
        </button>
      </form>

      <div className="research__filters">
        {YEARS.map((option) => (
          <button
            key={option.value}
            className={`btn btn--sm ${yearFrom === option.value ? "btn--primary" : "btn--text"}`}
            onClick={() => setYearFrom(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* Offered, not run. These are the subjects the user typed into their own profile, so they
          are a shortcut rather than a guess — and nothing is searched until one is pressed. */}
      {!query && interests.length > 0 && (
        <div className="research__suggestions">
          <div className="research__suggestions-label">Your subjects</div>
          <div className="research__suggestions-row">
            {interests.map((interest) => (
              <button key={interest} className="research__chip" onClick={() => run(interest)}>
                {interest}
              </button>
            ))}
          </div>
        </div>
      )}

      {!query ? (
        <EmptyState
          icon="paper"
          title="Nothing searched yet"
          description="Type a topic above. Radar does not pick a subject for you — results appear once you ask for something."
        />
      ) : results.isLoading ? (
        <LoadingSkeleton variant="feed" count={3} />
      ) : results.isError ? (
        <ErrorState
          title="The search did not complete"
          description={
            results.error instanceof ApiError
              ? results.error.message
              : "OpenAlex did not answer. Try again in a moment."
          }
          onRetry={() => results.refetch()}
        />
      ) : papers.length === 0 ? (
        <EmptyState
          icon="search"
          title={`Nothing matches "${query}"`}
          description="An empty result is the honest answer when no published work matches. Try broader wording, or widen the year filter."
        />
      ) : (
        <>
          <div className="research__count">
            {papers.length} {papers.length === 1 ? "paper" : "papers"} · OpenAlex
          </div>
          {papers.map((paper) => (
            <PaperCard key={paper.id} paper={paper} />
          ))}
        </>
      )}
    </div>
  );
}
