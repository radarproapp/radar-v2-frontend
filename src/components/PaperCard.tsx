import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Icon } from "./Icon";
import { explainPaper, findResearchGaps, getPaperCitation } from "../lib/api";
import { paperAuthorLine, paperYear } from "../lib/paper";
import type { CitationStyle, ContentItem } from "../lib/types";

/// One paper, and what can be done with it.
///
/// Collapsed it shows only what came back from OpenAlex: title, authors, venue, year, and the DOI
/// as a link the reader can follow. Nothing is paraphrased at this level, because a one-line
/// summary of a paper is a claim about its findings.
///
/// Expanded it offers the three things the backend can actually do — a citation, a plain-language
/// explanation, and a gap analysis. Each is fetched on request rather than up front: they are
/// model calls, and most papers in a result list are never opened.

const STYLES: CitationStyle[] = ["APA", "MLA", "Chicago", "Harvard", "IEEE"];

export function PaperCard({ paper }: { paper: ContentItem }) {
  const [open, setOpen] = useState(false);
  const [style, setStyle] = useState<CitationStyle>("APA");
  const [copied, setCopied] = useState(false);

  const citation = useMutation({
    mutationFn: (next: CitationStyle) => getPaperCitation(paper.id, next),
  });

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

          {paper.paperBreakdown && (
            <div className="paper__breakdown">
              {(
                [
                  ["Introduction", paper.paperBreakdown.introduction],
                  ["Problem", paper.paperBreakdown.problem],
                  ["Aim and objectives", paper.paperBreakdown.aimAndObjectives],
                  ["Methodology", paper.paperBreakdown.methodology],
                  ["Key arguments", paper.paperBreakdown.keyArguments],
                  ["Findings", paper.paperBreakdown.findings],
                  ["Contribution", paper.paperBreakdown.contribution],
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
