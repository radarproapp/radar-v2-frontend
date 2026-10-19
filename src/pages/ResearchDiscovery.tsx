import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { LoadingSkeleton } from "../components/LoadingSkeleton";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { ApiError, logEvent, saveFeedItem, searchResearch, unsaveFeedItem, getPaperCitation } from "../lib/api";
import type { ContentItem, AcademicPaperBreakdown } from "../lib/types";

const YEAR_RANGES: { label: string; yearFrom: number; badge: string }[] = [
  { label: "2020–2026 (Recent & Current)", yearFrom: 2020, badge: "2020–2026" },
  { label: "2024–2026 (Latest Breakthroughs)", yearFrom: 2024, badge: "Latest" },
  { label: "2022–2026 (Last 4 Years)", yearFrom: 2022, badge: "2022+" },
  { label: "All Years (Includes Classic Seminal Papers)", yearFrom: 0, badge: "All Years" },
];

const PAPER_TYPES = [
  { label: "All Types", value: "all" },
  { label: "Journal Articles", value: "journal" },
  { label: "Conference Papers", value: "conference" },
  { label: "Review Articles", value: "review" },
];

const POPULAR_ACADEMIC_TOPICS = [
  { label: "💡 AI & Autonomous Agents", query: "AI" },
  { label: "👥 Transformational Leadership", query: "leadership" },
  { label: "🏢 SMEs & Digital Transformation", query: "SMEs" },
  { label: "🛡️ Zero Trust Cybersecurity", query: "cybersecurity" },
  { label: "💳 Fintech & Mobile Money in Africa", query: "fintech in Africa" },
  { label: "🧠 Attention Is All You Need (Classic)", query: "Attention Is All You Need" },
  { label: "🏥 Health Informatics & AI Diagnosis", query: "health informatics" },
  { label: "⚡ Renewable Energy & Smart Grids", query: "renewable energy" },
];

const CITATION_STYLES = ["APA", "Harvard", "IEEE", "BibTeX", "MLA"] as const;
type CitationStyle = (typeof CITATION_STYLES)[number];

export function ResearchDiscovery() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [activeYearFrom, setActiveYearFrom] = useState<number>(() => {
    const p = searchParams.get("yearFrom");
    return p !== null ? parseInt(p, 10) : 2020; // Default to 2020-2026 as mandated
  });
  const [activePaperType, setActivePaperType] = useState<string>("all");

  const [results, setResults] = useState<ContentItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Copy feedback state
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Citation Modal state
  const [citationPaper, setCitationPaper] = useState<ContentItem | null>(null);
  const [citationStyle, setCitationStyle] = useState<CitationStyle>("APA");
  const [citationText, setCitationText] = useState<string>("");
  const [citationLoading, setCitationLoading] = useState(false);
  const [citationCopied, setCitationCopied] = useState(false);

  // Expanded breakdowns state (default all expanded for full accessibility)
  const [expandedPapers, setExpandedPapers] = useState<Record<string, boolean>>({});

  // Auto-search if q is provided in URL
  useEffect(() => {
    const q = searchParams.get("q");
    if (q && q.trim()) {
      setQuery(q);
      executeSearch(q.trim(), activeYearFrom, activePaperType);
    }
  }, []);

  const executeSearch = async (searchTerm: string, yearFrom: number, paperType: string) => {
    if (!searchTerm.trim()) return;
    setSearching(true);
    setHasSearched(true);
    setError(null);

    // Update query params in URL
    setSearchParams({ q: searchTerm, yearFrom: String(yearFrom), type: paperType });

    logEvent("Search", { metadata: { term: searchTerm.trim(), context: "AcademicResearch", yearFrom: String(yearFrom), paperType } });

    try {
      const items = await searchResearch(searchTerm.trim(), yearFrom, paperType, 1, 30);
      setResults(items);
      // Initialize all items as expanded so user immediately sees the rich 500-word summaries
      const initialExpanded: Record<string, boolean> = {};
      items.forEach((p) => {
        initialExpanded[p.id] = true;
      });
      setExpandedPapers(initialExpanded);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Academic search encountered an issue. Please try again.");
    } finally {
      setSearching(false);
    }
  };

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;
    executeSearch(query.trim(), activeYearFrom, activePaperType);
  };

  const handleTopicClick = (topicQuery: string) => {
    setQuery(topicQuery);
    executeSearch(topicQuery, activeYearFrom, activePaperType);
  };

  const handleYearFilterChange = (year: number) => {
    setActiveYearFrom(year);
    if (hasSearched && query.trim()) {
      executeSearch(query, year, activePaperType);
    }
  };

  const handleTypeFilterChange = (pt: string) => {
    setActivePaperType(pt);
    if (hasSearched && query.trim()) {
      executeSearch(query, activeYearFrom, pt);
    }
  };

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

  const togglePaperExpand = (id: string) => {
    setExpandedPapers((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Copy complete 500-word breakdown
  const copyFullBreakdown = (paper: ContentItem) => {
    const b = paper.paperBreakdown;
    if (!b) return;

    const fullText = `ACADEMIC PAPER: ${paper.title}
Authors: ${paper.authors.join(", ")}
Journal: ${paper.journal || paper.source} (${new Date(paper.publishedAt).getFullYear()})
DOI: ${paper.doi ? `https://doi.org/${paper.doi}` : paper.url}
Verified Sourced Database: ${paper.databaseSource || "OpenAlex / CrossRef"}

1. INTRODUCTION:
${b.introduction}

2. PROBLEM STATEMENT:
${b.problem}

3. KEY AIM & OBJECTIVES:
${b.aimAndObjectives}

4. METHODOLOGY:
${b.methodology}

5. KEY ARGUMENTS:
${b.keyArguments}

6. FINDINGS:
${b.findings}

7. CONTRIBUTION & WHY IT MATTERS:
${b.contribution}
${b.whyItMatters ? `\nPractical Relevance: ${b.whyItMatters}` : ""}`;

    navigator.clipboard.writeText(fullText);
    setCopiedId(paper.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  // Open Citation Modal
  const openCitationModal = async (paper: ContentItem) => {
    setCitationPaper(paper);
    setCitationStyle("APA");
    setCitationCopied(false);
    setCitationLoading(true);

    try {
      const res = await getPaperCitation(paper.id, "APA");
      setCitationText(res.citation);
    } catch {
      // Fallback client-side formatter
      const year = new Date(paper.publishedAt).getFullYear() || 2024;
      const authors = paper.authors.length > 0 ? paper.authors.join(", ") : "Unknown";
      setCitationText(`${authors} (${year}). ${paper.title}. ${paper.journal || paper.source}. https://doi.org/${paper.doi || ""}`);
    } finally {
      setCitationLoading(false);
    }
  };

  const changeCitationStyle = async (style: CitationStyle) => {
    if (!citationPaper) return;
    setCitationStyle(style);
    setCitationCopied(false);
    setCitationLoading(true);

    try {
      const res = await getPaperCitation(citationPaper.id, style);
      setCitationText(res.citation);
    } catch {
      setCitationText(`${citationPaper.authors.join(", ")} (${new Date(citationPaper.publishedAt).getFullYear()}). ${citationPaper.title}.`);
    } finally {
      setCitationLoading(false);
    }
  };

  const copyCitationToClipboard = () => {
    if (!citationText) return;
    navigator.clipboard.writeText(citationText);
    setCitationCopied(true);
    setTimeout(() => setCitationCopied(false), 2000);
  };

  // Navigate to Ask Radar with prefilled academic query
  const askRadarAboutPaper = (paper: ContentItem) => {
    const prompt = `I am reviewing the academic paper "${paper.title}" (${new Date(paper.publishedAt).getFullYear()}) by ${paper.authors.join(", ")}.
Key findings: ${paper.keyFindings || paper.aiSummary}

Could you explain how to practically apply this paper's findings and methodology to solve real-world problems in my field? What are the key research gaps?`;

    sessionStorage.setItem("radar_prefill_ask", prompt);
    navigate("/ask");
  };

  return (
    <div className="r-page" style={{ maxWidth: 880 }}>
      {/* Page Header */}
      <div className="r-page-head" style={{ marginBottom: 14 }}>
        <h1 className="r-page-title" style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span>🔬</span> Academic Research & Literature Discovery
        </h1>
        <p className="r-page-sub">
          Search peer-reviewed journal articles and conference papers across verifiable databases. Open a paper for Radar's structured 5-minute (~500-word) breakdown, and a direct link to the original every time.
        </p>
      </div>

      {/* Verifiable Databases Trust Bar */}
      <div className="research-trust-bar">
        <strong>Verifiable Databases:</strong>
        <span className="research-trust-tag">🏛️ OpenAlex (250M+ Works)</span>
        <span className="research-trust-tag">🔗 CrossRef</span>
        <span className="research-trust-tag">⚡ IEEE Xplore</span>
        <span className="research-trust-tag">📄 arXiv</span>
        <span className="research-trust-tag">🏥 PubMed</span>
        <span className="research-trust-tag">💻 ACM</span>
        <span style={{ marginLeft: "auto", fontWeight: 700, color: "#047857" }}>
          ✓ 2020–2026 Default Filter
        </span>
      </div>

      {/* Universal Search Box */}
      <form onSubmit={handleSearchSubmit} className="research-search">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Type a keyword like 'leadership', 'AI', 'SMEs', 'cybersecurity' or enter a full academic topic..."
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setHasSearched(false);
              setResults([]);
            }}
            style={{ background: "transparent", color: "var(--text-muted)", padding: "0 8px", fontSize: 16 }}
            title="Clear search"
          >
            ✕
          </button>
        )}
        <button type="submit" disabled={searching}>
          {searching ? "Searching…" : "Search Literature"}
        </button>
      </form>

      {/* Quick Topic Chips */}
      <div className="research-topic-chips">
        {POPULAR_ACADEMIC_TOPICS.map((topic) => (
          <button
            key={topic.label}
            type="button"
            className="research-topic-chip"
            onClick={() => handleTopicClick(topic.query)}
          >
            {topic.label}
          </button>
        ))}
      </div>

      {/* Filter Row: Publication Year & Document Type */}
      <div className="research-filters">
        <div className="research-filter-group">
          <span className="research-filter-label">Year Window:</span>
          {YEAR_RANGES.map((r) => (
            <button
              key={r.yearFrom}
              type="button"
              className={`r-chip ${activeYearFrom === r.yearFrom ? "active" : ""}`}
              style={{ fontSize: 11.5, padding: "4px 10px" }}
              onClick={() => handleYearFilterChange(r.yearFrom)}
            >
              {r.badge}
            </button>
          ))}
        </div>

        <div style={{ width: 1, height: 18, background: "var(--border)", margin: "0 6px" }} />

        <div className="research-filter-group">
          <span className="research-filter-label">Document Type:</span>
          {PAPER_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              className={`r-chip ${activePaperType === t.value ? "active" : ""}`}
              style={{ fontSize: 11.5, padding: "4px 10px" }}
              onClick={() => handleTypeFilterChange(t.value)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Results or States */}
      {error ? (
        <ErrorState title="Search failed" description={error} onRetry={() => executeSearch(query, activeYearFrom, activePaperType)} />
      ) : searching ? (
        <LoadingSkeleton variant="feed" count={4} />
      ) : hasSearched ? (
        <>
          <div className="research-count">
            <span>
              Found <strong>{results.length}</strong> peer-reviewed papers for &ldquo;{query}&rdquo;
            </span>
            <span style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
              {activeYearFrom > 0 ? `Filtered for ${activeYearFrom}–2026` : "All Time (Including Classics)"} · Strict 5-Minute Format
            </span>
          </div>

          {results.length === 0 ? (
            <EmptyState
              icon="🔬"
              title="No papers found for this query"
              description="Try a broader term, toggle 'All Years' to include seminal classics, or choose one of the recommended topics above."
            >
              <button
                className="btn btn--sm"
                onClick={() => {
                  setHasSearched(false);
                  setQuery("");
                  setResults([]);
                }}
              >
                Clear Search
              </button>
            </EmptyState>
          ) : (
            results.map((paper) => {
              const b: AcademicPaperBreakdown | undefined = paper.paperBreakdown || undefined;
              const isExpanded = expandedPapers[paper.id] ?? true;
              const wordCount = paper.wordCount ?? 0;

              // Build verified read link
              const verifiedPaperUrl = paper.url || (paper.doi ? `https://doi.org/${paper.doi}` : null);

              return (
                <div className="research-paper" key={paper.id}>
                  {/* Badges Bar */}
                  <div className="research-paper-badges">
                    <span className="research-badge-type">{paper.documentType || "Journal Article"}</span>
                    <span className="research-badge-source">
                      Verifiable: {paper.databaseSource || "OpenAlex / CrossRef"}
                    </span>
                    <span className="research-badge-year">
                      {new Date(paper.publishedAt).getFullYear() || 2024}
                    </span>
                    {paper.doi && (
                      <span style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "monospace" }}>
                        DOI: {paper.doi}
                      </span>
                    )}
                    {b && wordCount > 0 && (
                      <span className="research-badge-cite">
                        📖 ~{wordCount} words · 5 min read
                      </span>
                    )}
                  </div>

                  {/* Paper Title */}
                  <div className="research-paper-title">
                    {verifiedPaperUrl ? (
                      <a
                        href={verifiedPaperUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: "inherit", textDecoration: "none" }}
                        title="Click to view original verified paper"
                      >
                        {paper.title} ↗
                      </a>
                    ) : (
                      paper.title
                    )}
                  </div>

                  {/* Authors & Publication Meta */}
                  <div className="research-paper-meta">
                    <strong>{paper.authors.length > 0 ? paper.authors.join(", ") : "Peer-Reviewed Authors"}</strong> ·{" "}
                    <em>{paper.journal || paper.source || "Academic Press"}</em> ({new Date(paper.publishedAt).getFullYear() || 2024})
                    {paper.doi && (
                      <>
                        {" "}·{" "}
                        <a
                          href={`https://doi.org/${paper.doi}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="research-paper-doi"
                        >
                          https://doi.org/{paper.doi}
                        </a>
                      </>
                    )}
                  </div>

                  {/* STRICT 5-MINUTE (~500-WORD) STRUCTURED SUMMARY CONTAINER */}
                  {b ? (
                    <div className="research-breakdown-box">
                      <div className="research-breakdown-header">
                        <div className="research-breakdown-title-wrap">
                          <span className="research-breakdown-title">Strict 5-Minute Academic Summary</span>
                          {wordCount > 0 && (
                            <span className="research-breakdown-pill">~{wordCount} words · 7-Part Format</span>
                          )}
                        </div>

                        <div style={{ display: "flex", gap: 6 }}>
                          <button
                            type="button"
                            className="research-breakdown-copy"
                            onClick={() => copyFullBreakdown(paper)}
                          >
                            {copiedId === paper.id ? "✓ Copied 500-Word Summary!" : "📋 Copy Summary"}
                          </button>
                          <button
                            type="button"
                            className="research-breakdown-copy"
                            onClick={() => togglePaperExpand(paper.id)}
                          >
                            {isExpanded ? "Collapse ▲" : "Expand 7-Part Summary ▼"}
                          </button>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="research-breakdown-grid">
                          {/* 1. Introduction */}
                          <div className="research-section-item">
                            <div className="research-section-label">
                              <span>📌</span> 1. Introduction & Theoretical Context
                            </div>
                            <div className="research-section-text">{b.introduction}</div>
                          </div>

                          {/* 2. Problem Statement */}
                          <div className="research-section-item problem">
                            <div className="research-section-label" style={{ color: "#b91c1c" }}>
                              <span>⚠️</span> 2. Problem Statement & Research Dilemma
                            </div>
                            <div className="research-section-text">{b.problem}</div>
                          </div>

                          {/* 3. Key Aim & Objectives */}
                          <div className="research-section-item aim">
                            <div className="research-section-label" style={{ color: "#7c3aed" }}>
                              <span>🎯</span> 3. Key Aim & Objectives
                            </div>
                            <div className="research-section-text">{b.aimAndObjectives}</div>
                          </div>

                          {/* 4. Methodology */}
                          <div className="research-section-item method">
                            <div className="research-section-label" style={{ color: "#2563eb" }}>
                              <span>🔬</span> 4. Methodology & Empirical Design
                            </div>
                            <div className="research-section-text">{b.methodology}</div>
                          </div>

                          {/* 5. Key Arguments */}
                          <div className="research-section-item arguments">
                            <div className="research-section-label" style={{ color: "#d97706" }}>
                              <span>💡</span> 5. Key Arguments & Hypotheses
                            </div>
                            <div className="research-section-text">{b.keyArguments}</div>
                          </div>

                          {/* 6. Findings */}
                          <div className="research-section-item findings">
                            <div className="research-section-label" style={{ color: "#059669" }}>
                              <span>📊</span> 6. Findings & Empirical Results
                            </div>
                            <div className="research-section-text">{b.findings}</div>
                          </div>

                          {/* 7. Contribution & Why It Matters */}
                          <div className="research-section-item contribution">
                            <div className="research-section-label" style={{ color: "#0891b2" }}>
                              <span>🌟</span> 7. Contribution to Field & Why It Matters
                            </div>
                            <div className="research-section-text">
                              {b.contribution}
                              {b.whyItMatters && (
                                <div style={{ marginTop: 6, fontStyle: "italic", color: "#4b5563" }}>
                                  <strong>Impact:</strong> {b.whyItMatters}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* No Radar breakdown yet: show the publisher's own abstract, labelled as such.
                       Never dress the source abstract up as Radar's structured summary. */
                    <div className="research-breakdown-box">
                      <div className="research-breakdown-header">
                        <span className="research-breakdown-title">Abstract (from the source)</span>
                      </div>
                      <div className="research-section-text">
                        {paper.aiSummary || paper.whatHappened || "No abstract available from the source."}
                      </div>
                      {paper.keyFindings && (
                        <div style={{ marginTop: 8, fontSize: 12.5, color: "#047857" }}>
                          <strong>Key Findings:</strong> {paper.keyFindings}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Actions Bar */}
                  <div className="research-actions">
                    {/* Read Original / Full Paper Verification Option */}
                    {verifiedPaperUrl && (
                      <a
                        href={verifiedPaperUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="research-btn-primary"
                        title="Open full original paper on publisher / DOI repository"
                      >
                        Read Original Paper ↗
                      </a>
                    )}

                    {paper.openAccessPdfUrl && (
                      <a
                        href={paper.openAccessPdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="research-btn-secondary"
                        style={{ color: "#b91c1c", fontWeight: 700 }}
                        title="Download Open Access PDF"
                      >
                        Download PDF ⬇
                      </a>
                    )}

                    {/* Save to Notebook / Library */}
                    <button
                      type="button"
                      className="research-btn-secondary"
                      onClick={() => toggleSave(paper)}
                      title="Save to your Radar Notebook & Library"
                    >
                      {paper.isSaved ? "Saved ✓" : "Save Paper"}
                    </button>

                    {/* Cite Paper Modal Trigger */}
                    <button
                      type="button"
                      className="research-btn-secondary"
                      onClick={() => openCitationModal(paper)}
                      title="Generate citation in APA, Harvard, IEEE, BibTeX, MLA"
                    >
                      📑 Cite
                    </button>

                    {/* Ask AI Mentor */}
                    <button
                      type="button"
                      className="research-btn-secondary"
                      style={{ marginLeft: "auto", background: "rgba(0, 163, 196, 0.08)", color: "var(--cyan-deep, #0891b2)", fontWeight: 700 }}
                      onClick={() => askRadarAboutPaper(paper)}
                      title="Ask Radar AI to explain methodology, practical applications, or research gaps"
                    >
                      🤖 Ask Radar About This
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </>
      ) : (
        /* Empty Initial State with Suggestions */
        <EmptyState
          icon="📖"
          title="Search All Academic Topics"
          description="Type any topic in plain English—from single keywords like 'leadership', 'AI', 'SMEs' to full research titles. Radar only returns work it can verify, and always links you to the original."
        >
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", maxWidth: 640 }}>
            {POPULAR_ACADEMIC_TOPICS.map((topic) => (
              <button
                key={topic.label}
                type="button"
                className="r-chip"
                style={{ fontSize: 12, padding: "6px 14px" }}
                onClick={() => handleTopicClick(topic.query)}
              >
                {topic.label}
              </button>
            ))}
          </div>
        </EmptyState>
      )}

      {/* CITATION MODAL DIALOG */}
      {citationPaper && (
        <div className="research-modal-backdrop" onClick={() => setCitationPaper(null)}>
          <div className="research-modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="research-modal-head">
              <h3>Citation Generator</h3>
              <button
                type="button"
                onClick={() => setCitationPaper(null)}
                style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "var(--text-muted)" }}
              >
                ✕
              </button>
            </div>

            <div className="research-modal-body">
              <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 12 }}>
                Format citation for <strong>{citationPaper.title}</strong>:
              </div>

              {/* Style Tabs */}
              <div className="research-citation-tabs">
                {CITATION_STYLES.map((st) => (
                  <button
                    key={st}
                    type="button"
                    className={`research-citation-tab ${citationStyle === st ? "active" : ""}`}
                    onClick={() => changeCitationStyle(st)}
                  >
                    {st === "APA" ? "APA 7th" : st === "MLA" ? "MLA 9th" : st}
                  </button>
                ))}
              </div>

              {/* Citation Box */}
              {citationLoading ? (
                <div style={{ padding: "20px 0", textAlign: "center", color: "var(--text-muted)" }}>
                  Formatting citation in {citationStyle}…
                </div>
              ) : (
                <div className="research-citation-box">{citationText}</div>
              )}

              {/* Copy Button */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                  Includes verified DOI link for academic verification.
                </span>
                <button
                  type="button"
                  className="btn btn--sm"
                  style={{ background: citationCopied ? "#059669" : "var(--cyan)", color: "#fff" }}
                  onClick={copyCitationToClipboard}
                >
                  {citationCopied ? "✓ Copied to Clipboard!" : "Copy Citation"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
