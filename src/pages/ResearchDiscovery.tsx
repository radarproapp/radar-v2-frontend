import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LoadingSkeleton } from "../components/LoadingSkeleton";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { ApiError, saveFeedItem, searchResearch, unsaveFeedItem } from "../lib/api";
import type { ContentItem } from "../lib/types";

const YEAR_RANGES: { label: string; value: number }[] = [
  { label: "Last 5 years", value: 5 },
  { label: "Last 3 years", value: 3 },
  { label: "Last year", value: 1 },
  { label: "All time", value: 0 },
];

const SUGGESTIONS = ["AI adoption among SMEs in Africa", "Machine learning in healthcare", "Climate change adaptation"];

export function ResearchDiscovery() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [activeYearRange, setActiveYearRange] = useState(5);
  const [results, setResults] = useState<ContentItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runSearch = async (q: string, yearRange: number) => {
    if (!q.trim()) return;
    setSearching(true);
    setHasSearched(true);
    setError(null);
    try {
      const yearFrom = yearRange > 0 ? new Date().getUTCFullYear() - yearRange : 0;
      setResults(await searchResearch(q.trim(), yearFrom));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Search failed.");
    } finally {
      setSearching(false);
    }
  };

  const setYearRange = (years: number) => {
    setActiveYearRange(years);
    if (hasSearched && query.trim()) runSearch(query, years);
  };

  // The original Blazor page only flipped a local flag here — Save never persisted. Research
  // papers are ContentItems, so this now goes through the same save endpoint the feed uses.
  const toggleSave = async (paper: ContentItem) => {
    const nextSaved = !paper.isSaved;
    setResults((old) => old.map((p) => (p.id === paper.id ? { ...p, isSaved: nextSaved } : p)));
    try {
      if (nextSaved) await saveFeedItem(paper.id);
      else await unsaveFeedItem(paper.id);
    } catch {
      setResults((old) => old.map((p) => (p.id === paper.id ? { ...p, isSaved: !nextSaved } : p)));
    }
  };

  return (
    <div className="r-page" style={{ maxWidth: 740 }}>
      <div className="r-page-head">
        <h1 className="r-page-title">Research Discovery</h1>
        <p className="r-page-sub">Search in plain English across OpenAlex, Semantic Scholar, arXiv, PubMed and Crossref. Last five years by default.</p>
      </div>

      <div className="research-search">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && runSearch(query, activeYearRange)}
          placeholder="e.g. AI adoption among SMEs in Africa"
        />
        <button onClick={() => runSearch(query, activeYearRange)} disabled={searching}>
          {searching ? "Searching…" : "Search"}
        </button>
      </div>

      <div className="research-filters">
        {YEAR_RANGES.map((range) => (
          <button key={range.value} className={`r-chip ${activeYearRange === range.value ? "active" : ""}`} onClick={() => setYearRange(range.value)}>
            {range.label}
          </button>
        ))}
      </div>

      {error ? (
        <ErrorState title="Search failed" description={error} onRetry={() => runSearch(query, activeYearRange)} />
      ) : searching ? (
        <LoadingSkeleton variant="feed" count={3} />
      ) : hasSearched ? (
        <>
          <div className="research-count">
            {results.length} result{results.length !== 1 ? "s" : ""} found
          </div>

          {results.length === 0 ? (
            <EmptyState icon="🔬" title="No papers found" description="Try a different search term or broaden your year range.">
              <button
                className="btn btn--sm"
                onClick={() => {
                  setHasSearched(false);
                  setQuery("");
                }}
              >
                Clear search
              </button>
            </EmptyState>
          ) : (
            results.map((paper) => (
              <div className="research-paper" key={paper.id}>
                <div className="research-paper-title">{paper.title}</div>
                <div className="research-paper-meta">
                  {paper.authors.join(", ")} · {paper.journal} {new Date(paper.publishedAt).getFullYear()} · DOI {paper.doi}
                </div>

                <div className="research-paper-summary">
                  <div className="research-paper-summary-label">5-MINUTE SUMMARY</div>
                  <div className="research-paper-summary-text">{paper.aiSummary}</div>
                </div>

                {paper.keyFindings && (
                  <>
                    <div className="research-paper-findings-label">KEY FINDINGS</div>
                    <div className="research-paper-finding">· {paper.keyFindings}</div>
                  </>
                )}

                {paper.methodology && (
                  <div className="research-paper-method">
                    <strong>Method:</strong> {paper.methodology}
                  </div>
                )}

                <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                  <button className="btn btn--sm" onClick={() => toggleSave(paper)}>
                    {paper.isSaved ? "Saved ✓" : "Save"}
                  </button>
                  <button className="btn btn--sm" style={{ background: "#f0f2f4", borderColor: "transparent", color: "var(--text)" }} onClick={() => navigate("/ask")}>
                    Ask Radar about this
                  </button>
                </div>
              </div>
            ))
          )}
        </>
      ) : (
        <EmptyState icon="📖" title="Search academic databases" description="Type your research topic in plain English and Radar will search across trusted academic sources.">
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                className="r-chip"
                style={{ fontSize: 12 }}
                onClick={() => {
                  setQuery(s);
                  runSearch(s, activeYearRange);
                }}
              >
                {s}
              </button>
            ))}
          </div>
        </EmptyState>
      )}
    </div>
  );
}
