import { useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { EmptyState } from "../components/EmptyState";
import { Icon } from "../components/Icon";
import { useAuth } from "../auth/AuthContext";
import { ApiError, assessDocument, getRubric } from "../lib/api";
import type { AssessmentCriterion, DocumentAssessment, DocumentKind } from "../lib/types";

/// Upload work you wrote and have it assessed as the kind of thing it is.
///
/// Distinct from "start from a document", which reads a textbook and builds a path out of it.
/// This reads your essay and says what is wrong with it.
///
/// Two things it will not do. It does not ask you to pick the document type — that is detected
/// from the text, because a CV submitted with "Essay" selected comes back criticised for short
/// paragraphs. And it does not give a score: the criteria are named on screen and each gets Met,
/// Partly or Not met, because a judgement you can see the basis of is one you can argue with.

/// Readable before uploading anything. A rubric you can see in advance is one you can write
/// towards, which is more use than the same rubric applied afterwards.
const PREVIEWABLE: { kind: DocumentKind; label: string }[] = [
  { kind: "Essay", label: "Essay" },
  { kind: "Report", label: "Report" },
  { kind: "Cv", label: "CV" },
  { kind: "CoverLetter", label: "Cover letter" },
  { kind: "PersonalStatement", label: "Personal statement" },
  { kind: "ResearchProposal", label: "Research proposal" },
  { kind: "BusinessPlan", label: "Business plan" },
  { kind: "SocialMediaContent", label: "Social media content" },
];

const VERDICT_LABEL: Record<string, string> = {
  Met: "Met",
  Partly: "Partly",
  NotMet: "Not met",
  Unjudged: "Not assessed",
};

function Criterion({ criterion }: { criterion: AssessmentCriterion }) {
  return (
    <div className={`crit crit--${criterion.verdict.toLowerCase()}`}>
      <div className="crit__head">
        <span className="crit__name">{criterion.name}</span>
        <span className="crit__verdict">{VERDICT_LABEL[criterion.verdict] ?? criterion.verdict}</span>
      </div>

      {/* What the criterion asks, always shown. The judgement means nothing without it. */}
      <p className="crit__asks">{criterion.asks}</p>

      {criterion.evidence && <p className="crit__evidence">{criterion.evidence}</p>}

      {criterion.fix && (
        <p className="crit__fix">
          <Icon name="next" size={12} /> {criterion.fix}
        </p>
      )}
    </div>
  );
}

export function AssessDocument() {
  const { profile } = useAuth();
  const fileInput = useRef<HTMLInputElement>(null);

  const [preview, setPreview] = useState<DocumentKind | null>(null);
  const [error, setError] = useState<string | null>(null);

  const rubric = useQuery({
    queryKey: ["rubric", preview, profile?.persona],
    queryFn: () => getRubric(preview!),
    enabled: preview !== null,
  });

  // Kept so a declared kind can be re-sent for the same file without choosing it again.
  const [lastFile, setLastFile] = useState<File | null>(null);

  const assess = useMutation({
    mutationFn: ({ file, kind }: { file: File; kind?: DocumentKind }) => assessDocument(file, kind),
    onMutate: () => setError(null),
    onError: (e) =>
      setError(
        e instanceof ApiError ? e.message : "Could not assess that file. Try again in a moment.",
      ),
  });

  const result: DocumentAssessment | undefined = assess.data;

  return (
    <div className="r-page assess" style={{ maxWidth: 780 }}>
      <div className="r-page-head">
        <h1 className="r-page-title">Assess my work</h1>
        <p className="r-page-sub">
          Upload something you wrote. Radar works out what kind of document it is, then judges it
          against criteria for that kind and for where you are — shown on screen, so you can see
          what it was measured against.
        </p>
      </div>

      <div className="assess__drop">
        <input
          ref={fileInput}
          type="file"
          accept=".pdf,.doc,.docx,.md,.txt,.csv,.json,.html"
          style={{ display: "none" }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              setLastFile(file);
              assess.mutate({ file });
            }
            // Cleared so re-uploading the same file after a fix fires onChange again.
            e.target.value = "";
          }}
        />

        <button
          className="btn btn--primary"
          onClick={() => fileInput.current?.click()}
          disabled={assess.isPending}
        >
          {assess.isPending ? "Reading it…" : "Choose a file"}
        </button>

        <span className="assess__formats">PDF, Word, Markdown, text, CSV, JSON or HTML</span>
      </div>

      {error && (
        <div role="alert" className="assess__error">
          {error}
        </div>
      )}

      {/* The rubric, before anything is uploaded. */}
      {!result && !assess.isPending && (
        <section className="assess__rubric">
          <div className="assess__rubric-label">Or see what each kind is judged against</div>

          <div className="assess__kinds">
            {PREVIEWABLE.map((entry) => (
              <button
                key={entry.kind}
                className={`assess__kind ${preview === entry.kind ? "active" : ""}`}
                onClick={() => setPreview(preview === entry.kind ? null : entry.kind)}
              >
                {entry.label}
              </button>
            ))}
          </div>

          {preview && rubric.data && (
            <div className="assess__rubric-list">
              <p className="assess__rubric-note">
                As a {rubric.data.assessedAs.replace("YoungProfessional", "professional")}, your{" "}
                {PREVIEWABLE.find((e) => e.kind === preview)?.label.toLowerCase()} is read for:
              </p>

              {rubric.data.criteria.map((criterion) => (
                <div key={criterion.name} className="assess__rubric-item">
                  <span className="assess__rubric-name">{criterion.name}</span>
                  <span className="assess__rubric-asks">{criterion.asks}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Nothing is invented when it could not be assessed. */}
      {/* Not a dead end. Detection is not reliable enough to be the only route — measured, the
          same CV came back as a CV in full and as Unknown when shortened by a third — so if it
          cannot tell, the reader says. Radar asking rather than guessing is the rule everywhere
          else in the product; this is the same rule. */}
      {result && !result.wasAssessed && (
        <section className="assess__unknown">
          <EmptyState
            icon="warning"
            title={result.kind === "Unknown" ? "What is this?" : "Not assessed"}
            description={result.notAssessedReason ?? "Radar could not assess this document."}
          />

          {result.kind === "Unknown" && lastFile && (
            <div className="assess__kinds">
              {PREVIEWABLE.map((entry) => (
                <button
                  key={entry.kind}
                  className="assess__kind"
                  onClick={() => assess.mutate({ file: lastFile, kind: entry.kind })}
                  disabled={assess.isPending}
                >
                  {entry.label}
                </button>
              ))}
            </div>
          )}

          <button className="btn btn--text btn--sm" onClick={() => fileInput.current?.click()}>
            Or try another file
          </button>
        </section>
      )}

      {result?.wasAssessed && (
        <section className="assess__result">
          <div className="assess__result-head">
            <div>
              <div className="assess__detected">
                {result.kindWasDeclared ? "Assessed as a" : "Read as a"}{" "}
                <strong>
                  {PREVIEWABLE.find((e) => e.kind === result.kind)?.label.toLowerCase() ??
                    result.kind}
                </strong>
                , for a {result.assessedAs.replace("YoungProfessional", "professional")}
              </div>
              {/* Why it thinks that, so a wrong guess is arguable rather than mysterious. */}
              {result.kindEvidence && (
                <div className="assess__detected-why">{result.kindEvidence}</div>
              )}
            </div>

            {result.summary && <span className="assess__summary">{result.summary}</span>}
          </div>

          {result.mostValuableChange && (
            <div className="assess__priority">
              <div className="assess__priority-label">The one change worth making first</div>
              <p className="assess__priority-text">{result.mostValuableChange}</p>
            </div>
          )}

          {result.strengths.length > 0 && (
            <div className="assess__strengths">
              <div className="assess__section-label">What works</div>
              <ul>
                {result.strengths.map((strength, i) => (
                  <li key={i}>{strength}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="assess__criteria">
            <div className="assess__section-label">Against the criteria</div>
            {result.criteria.map((criterion) => (
              <Criterion key={criterion.name} criterion={criterion} />
            ))}
          </div>

          <div className="assess__after">
            <button className="btn btn--text btn--sm" onClick={() => fileInput.current?.click()}>
              <Icon name="upload" size={13} /> Assess a revision
            </button>

            {/* A wrong detection is correctable without re-uploading. */}
            {!result.kindWasDeclared && lastFile && (
              <details className="assess__wrong">
                <summary>Not a {PREVIEWABLE.find((e) => e.kind === result.kind)?.label.toLowerCase() ?? result.kind}?</summary>
                <div className="assess__kinds">
                  {PREVIEWABLE.filter((e) => e.kind !== result.kind).map((entry) => (
                    <button
                      key={entry.kind}
                      className="assess__kind"
                      onClick={() => assess.mutate({ file: lastFile, kind: entry.kind })}
                      disabled={assess.isPending}
                    >
                      {entry.label}
                    </button>
                  ))}
                </div>
              </details>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
