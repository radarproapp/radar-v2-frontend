import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Icon } from "./Icon";
import { explainPaper, findResearchGaps, getPaper, getPaperCitation } from "../lib/api";
import { paperAuthorLine, paperDate } from "../lib/paper";
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

/// Harvard and APA first, because those are the two Radar sets out to get exactly right.
///
/// APA is the seventh edition - every author named in the reference entry rather than "et al."
/// from the third, the DOI as a link, and no "Retrieved from". Harvard follows Cite Them Right.
/// The rest are offered as they were and are not held to the same standard.
const STYLES: CitationStyle[] = ["APA", "Harvard", "MLA", "Chicago", "IEEE"];

/// What to call each one on screen. "APA" alone is ambiguous between editions, and the
/// difference is visible in the output.
const STYLE_LABEL: Record<CitationStyle, string> = {
  APA: "APA (7th)",
  Harvard: "Harvard",
  MLA: "MLA",
  Chicago: "Chicago",
  IEEE: "IEEE",
};

/// Where this record came from, which decides what can be asked about it.
///
/// "openalex" is a live search result: Radar can fetch it again by id, so the summary, the
/// citation, the explanation and the gap analysis all work. "library" is Radar's own corpus,
/// whose ids mean nothing to OpenAlex — asking it for one of those answers 404, and the gap and
/// explain endpoints returned "Paper not found. Please check the ID and try again." with a 200,
/// which rendered as the explanation. An error message presented as the answer.
export type PaperOrigin = "openalex" | "library";

export function PaperCard({
  paper,
  origin = "openalex",
}: {
  paper: ContentItem;
  origin?: PaperOrigin;
}) {
  const [open, setOpen] = useState(false);
  const [style, setStyle] = useState<CitationStyle>("APA");
  const [copied, setCopied] = useState(false);

  const citation = useMutation({
    mutationFn: (next: CitationStyle) => getPaperCitation(paper.id, next),
  });

  /// The summary, fetched the first time this card is opened and kept after that.
  ///
  /// Fetched whenever the card is opened, even when the paper arrives carrying a breakdown. The
  /// condition used to be "only if it has none", which meant never: search results carried a
  /// breakdown built from abstract sentences sorted by keyword, so that is what every reader saw
  /// and the plain-English summary was unreachable from the page that exists to show it.
  const detail = useQuery({
    queryKey: ["paper", paper.id],
    queryFn: () => getPaper(paper.id),
    enabled: open && origin === "openalex",
    staleTime: Infinity,
    retry: 1,
  });

  // What was fetched wins. Anything the paper arrived with is a fallback for the seconds before
  // it lands, and for a paper the endpoint cannot resolve.
  const summary = detail.data?.paperBreakdown ?? paper.paperBreakdown ?? null;

  const explanation = useMutation({ mutationFn: () => explainPaper(paper.id) });
  const gaps = useMutation({ mutationFn: () => findResearchGaps(paper.id) });

  const published = paperDate(paper.publishedAt);

  // Where the paper sits in time, which is not how good it is. A 1998 paper can be the text a
  // whole field rests on and still be the wrong thing to copy as current practice; the reader
  // would otherwise have to notice the year and draw the conclusion, which nobody does while
  // skimming. Only shown when the server worked one out - never guessed from the date here.
  // From the item, not from the breakdown. The breakdown is a model call made when a paper is
  // opened, so reading the era out of it meant the badge could never appear on a collapsed card
  // and never at all on a library card - the two places a reader is skimming twenty papers and
  // wants to know which are current. The server sets it on every result now.
  const era = (paper.paperEra ?? summary?.era)?.split(" - ")[0] ?? null;
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
          {era && <span className={`paper__era paper__era--${era.toLowerCase()}`}>{era}</span>}
          {paper.citationCount > 0 && (
            <span className="paper__cited">Cited {paper.citationCount.toLocaleString()} times</span>
          )}
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

          {/* A corpus record carries whatever was written when it was ingested. Radar cannot
              fetch it again by id, so what is here is what there is. */}
          {origin === "library" && !summary && paper.aiSummary && (
            <p className="paper__summary-wait">
              Radar holds this from {paper.source || "its own sources"}. Open it to read the whole
              thing.
            </p>
          )}

          {summary && (
            <div className="paper__breakdown">
              {/* Where the paper sits in time. A founding text of its field can still be the
                  wrong thing to copy as current practice, and nobody works that out from a year
                  while skimming. */}
              {summary.era && <span className="paper__era">{summary.era}</span>}

              {(
                [
                  // The six sections the summary is specified as, in order and uninterrupted.
                  // "What they argue" used to sit between the methodology and the findings,
                  // which broke the run a reader is following; it is supplementary, so it is
                  // after the conclusion with the other two.
                  ["Introduction", summary.introduction],
                  ["Problem statement", summary.problem],
                  ["Objective of the research", summary.aimAndObjectives],
                  ["Methodology", summary.methodology],
                  ["Analysis and findings", summary.findings],
                  ["Conclusion", summary.conclusion],

                  ["What they argue", summary.keyArguments],
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
                    <h4 className="paper__section-label">{label}</h4>
                    <p className="paper__section-text">{value}</p>
                  </div>
                ))}
            </div>
          )}

          {/* Said rather than left blank. The abstract and the DOI are both still on the card,
              which is more than a summary that could not be written would have added. */}
          {!summary && !detail.isLoading && origin === "openalex" && (
            <p className="paper__summary-wait">
              Radar could not summarise this one. The abstract is above and the DOI below resolves.
            </p>
          )}

          {/* Asked of OpenAlex, so offered only for records OpenAlex knows.
              A corpus record's id means nothing to it: Cite answered 404, and Explain and
              Research gaps returned "Paper not found. Please check the ID and try again." with a
              200, which rendered inside the plain-language block as though it were the answer.
              Three buttons that could not work, and one that lied about why. */}
          {origin === "openalex" && (
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
                    {STYLE_LABEL[option]}
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
          )}

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
