import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Icon } from "./Icon";
import { explainPaper, findResearchGaps, getPaper, getPaperCitation } from "../lib/api";
import { paperAuthorLine, paperYear } from "../lib/paper";
import type { CitationStyle, ContentItem } from "../lib/types";

/// One paper, and what can be done with it.
///
/// Collapsed it shows only what came back from OpenAlex: title, authors, venue, year, and the DOI
/// as a link the reader can follow. Nothing is paraphrased at this level, because a one-line
/// summary of a paper is a claim about its findings.
///
/// Expanded it shows the summary — the paper in about 500 words of plain English, section by
/// section — and offers the three other things the backend can do: a citation, a longer
/// explanation, and a gap analysis.
///
/// The summary is fetched when the card is opened. Search results arrive without one: building it
/// is a model call per paper, and a page of twenty would be twenty calls for the nineteen nobody
/// opens. It had nowhere else to be fetched from either, so the section existed in the component,
/// in the model and in the endpoint, and never once reached a reader.

const STYLES: CitationStyle[] = ["APA", "MLA", "Chicago", "Harvard", "IEEE"];

export function PaperCard({ paper }: { paper: ContentItem }) {
  const [open, setOpen] = useState(false);
  const [style, setStyle] = useState<CitationStyle>("APA");
  const [copied, setCopied] = useState(false);

  const citation = useMutation({
    mutationFn: (next: CitationStyle) => getPaperCitation(paper.id, next),
  });

  /// The summary, fetched the first time this card is opened and kept after that.
  ///
  /// Not requested when the paper already carries one, which is how it arrives from the feed.
  const detail = useQuery({
    queryKey: ["paper", paper.id],
    queryFn: () => getPaper(paper.id),
    enabled: open && !paper.paperBreakdown,
    staleTime: Infinity,
    retry: 1,
  });

  const summary = paper.paperBreakdown ?? detail.data?.paperBreakdown ?? null;

  const explanation = useMutation({ mutationFn: () => explainPaper(paper.id) });
  const gaps = useMutation({ mutationFn: () => findResearchGaps(paper.id) });

  const published = paperYear(paper.publishedAt);
  const authors = paperAuthorLine(paper.authors);

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can be refused; the citation is on screen and selectable either way.
      setCopied(false);
    }
  };

  return (
    <article className="paper">
      <button
        className="paper__head"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <h3 className="paper__title">{paper.title}</h3>

        <div className="paper__meta">
          {authors && <span className="paper__authors">{authors}</span>}
          {paper.journal && <span className="paper__venue">{paper.journal}</span>}
          {published && <span className="paper__year">{published}</span>}
          {paper.documentType && <span className="paper__type">{paper.documentType}</span>}
        </div>

        <span className="paper__toggle">
          <Icon name={open ? "collapse" : "expand"} size={14} />
          {open ? "Less" : "More"}
        </span>
      </button>

      <div className="paper__links">
        {/* The DOI, as a link. This is the one thing on the card a reader can check for
            themselves, which is why it is not hidden behind the expander. */}
        {paper.doi && (
          <a
            className="paper__link"
            href={`https://doi.org/${paper.doi}`}
            target="_blank"
            rel="noreferrer noopener"
          >
            <Icon name="link" size={13} /> {paper.doi}
          </a>
        )}

        {paper.openAccessPdfUrl && (
          <a
            className="paper__link paper__link--oa"
            href={paper.openAccessPdfUrl}
            target="_blank"
            rel="noreferrer noopener"
          >
            <Icon name="download" size={13} /> Open-access PDF
          </a>
        )}

        {!paper.doi && paper.url && (
          <a
            className="paper__link"
            href={paper.url}
            target="_blank"
            rel="noreferrer noopener"
          >
            <Icon name="external" size={13} /> Source
          </a>
        )}
      </div>

      {open && (
        <div className="paper__body">
          {paper.aiSummary && <p className="paper__abstract">{paper.aiSummary}</p>}

          {detail.isLoading && <p className="paper__summary-wait">Reading the paper…</p>}

          {summary && (
            <div className="paper__breakdown">
              {/* Where the paper sits in time. A founding text of its field can still be the
                  wrong thing to copy as current practice, and nobody works that out from a year
                  while skimming. */}
              {summary.era && <span className="paper__era">{summary.era}</span>}

              {(
                [
                  ["Introduction", summary.introduction],
                  ["The problem", summary.problem],
                  ["What they wanted to find out", summary.aimAndObjectives],
                  ["How they did it", summary.methodology],
                  ["What they argue", summary.keyArguments],
                  ["What they found", summary.findings],
                  ["What they conclude", summary.conclusion],
                  ["What this adds", summary.contribution],
                  ["Why it matters to you", summary.whyItMatters],
                  // The authors' own account of what their work cannot do — the most useful
                  // section of any paper and the one most often dropped. A reader generalising a
                  // finding needs to know the sample was 40 undergraduates first.
                  ["What it cannot tell you", summary.limitations],
                  ["What is still open", summary.futureWork],
                ] as const
              )
                .filter(([, value]) => value && value.trim())
                .map(([label, value]) => (
                  <div key={label} className="paper__section">
                    <div className="paper__section-label">{label}</div>
                    <p className="paper__section-text">{value}</p>
                  </div>
                ))}
            </div>
          )}

          {/* Said rather than left blank. The abstract and the DOI are both still on the card,
              which is more than a summary that could not be written would have added. */}
          {!summary && !detail.isLoading && (
            <p className="paper__summary-wait">
              Radar could not summarise this one. The abstract is above and the DOI below resolves.
            </p>
          )}

          <div className="paper__actions">
            <div className="paper__cite">
              <select
                className="paper__style"
                value={style}
                onChange={(e) => {
                  const next = e.target.value as CitationStyle;
                  setStyle(next);
                  citation.reset();
                }}
                aria-label="Citation style"
              >
                {STYLES.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>

              <button
                className="btn btn--sm btn--text"
                onClick={() => citation.mutate(style)}
                disabled={citation.isPending}
              >
                <Icon name="copy" size={13} /> {citation.isPending ? "Building…" : "Cite"}
              </button>
            </div>

            <button
              className="btn btn--sm btn--text"
              onClick={() => explanation.mutate()}
              disabled={explanation.isPending}
            >
              <Icon name="idea" size={13} /> {explanation.isPending ? "Reading…" : "Explain simply"}
            </button>

            <button
              className="btn btn--sm btn--text"
              onClick={() => gaps.mutate()}
              disabled={gaps.isPending}
            >
              <Icon name="explore" size={13} /> {gaps.isPending ? "Looking…" : "Research gaps"}
            </button>
          </div>

          {citation.data && (
            <div className="paper__result">
              <div className="paper__result-head">
                <span className="paper__result-label">{citation.data.style}</span>
                <button
                  className="btn btn--sm btn--text"
                  onClick={() => copy(citation.data.citation)}
                >
                  <Icon name={copied ? "check" : "copy"} size={13} />
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
              <p className="paper__citation">{citation.data.citation}</p>
            </div>
          )}

          {citation.isError && (
            <div className="paper__result paper__result--error">
              A citation could not be built for this record.
            </div>
          )}

          {explanation.data?.explanation && (
            <div className="paper__result">
              <div className="paper__result-label">In plain language</div>
              <p className="paper__result-text">{explanation.data.explanation}</p>
            </div>
          )}

          {gaps.data?.gaps && (
            <div className="paper__result">
              <div className="paper__result-label">What this paper leaves open</div>
              <p className="paper__result-text">{gaps.data.gaps}</p>
            </div>
          )}
        </div>
      )}
    </article>
  );
}
