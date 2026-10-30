import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AssessmentHistory } from "../components/AssessmentHistory";
import { EmptyState } from "../components/EmptyState";
import { Icon } from "../components/Icon";
import { useAuth } from "../auth/AuthContext";
import { ApiError, assessDocument, getRubric } from "../lib/api";
import type { WorkToAssess } from "../lib/api";
import { DOCUMENT_KINDS, kindsMatching } from "../lib/document-kinds";
import type { AssessmentCriterion, DocumentAssessment, DocumentKind } from "../lib/types";

/// Hand in work you wrote and have it assessed as the kind of thing it is.
///
/// Distinct from "start from a document", which reads a textbook and builds a path out of it.
/// This reads your essay and says what is wrong with it.
///
/// Pasted or attached. Most writing being assessed is open in another window, and exporting it to
/// a file first was a step that existed only because the screen wanted one.
///
/// Two things it will not do. It does not require you to pick the document type — that is
/// detected from the text, because a CV submitted with "Essay" selected comes back criticised for
/// short paragraphs. You can say, and then it skips detection and takes your word; what you type
/// is matched to a written standard rather than becoming one, because a rubric invented per
/// request leaves nobody knowing what the judgement was against. And it does not give a score:
/// the criteria are named on screen and each gets Met, Partly or Not met, because a judgement you
/// can see the basis of is one you can argue with.

/// The least that can be assessed.
///
/// The endpoint enforces this and refuses below it in its own words. Mirrored here only so the
/// screen can say how much is still needed instead of spending a round trip to find out; if the
/// two ever disagree the server's refusal is what the reader sees.
const MINIMUM_PASTED = 400;

const VERDICT_LABEL: Record<string, string> = {
  Met: "Met",
  Partly: "Partly",
  NotMet: "Not met",
  Unjudged: "Not assessed",
};

function labelFor(kind: DocumentKind): string {
  return DOCUMENT_KINDS.find((option) => option.kind === kind)?.label ?? kind;
}

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
  const queryClient = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);

  /// An older assessment the reader has opened from their history, shown in place of the one
  /// they just submitted. Cleared the moment they hand something new in.
  const [opened, setOpened] = useState<DocumentAssessment | null>(null);

  const [text, setText] = useState("");
  const [typed, setTyped] = useState("");
  const [declared, setDeclared] = useState<DocumentKind | null>(null);
  const [error, setError] = useState<string | null>(null);

  /// The rubric for whatever kind is on screen, readable before handing anything in. A standard
  /// you can see in advance is one you can write towards, which is more use than the same
  /// standard applied afterwards.
  const rubric = useQuery({
    queryKey: ["rubric", declared, profile?.persona],
    queryFn: () => getRubric(declared!),
    enabled: declared !== null,
  });

  // Kept so a kind can be declared for the same work without handing it in again.
  const [lastWork, setLastWork] = useState<WorkToAssess | null>(null);

  const assess = useMutation({
    mutationFn: (work: WorkToAssess) => assessDocument(work),
    onMutate: (work) => {
      setError(null);
      setLastWork(work);
      setOpened(null);
    },
    // The new one belongs in the history immediately, not on the next visit.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["assessments"] }),
    onError: (e) =>
      setError(
        e instanceof ApiError ? e.message : "Could not assess that. Try again in a moment.",
      ),
  });

  const result: DocumentAssessment | undefined = opened ?? assess.data;
  const matches = kindsMatching(typed);
  const shortBy = MINIMUM_PASTED - text.trim().length;

  /// Re-judges the same work, now that the reader has said what it is.
  function declareAndReassess(kind: DocumentKind) {
    if (!lastWork) return;
    setDeclared(kind);
    assess.mutate({ ...lastWork, kind });
  }

  return (
    <div className="r-page assess" style={{ maxWidth: 780 }}>
      <div className="r-page-head">
        <h1 className="r-page-title">Assess my work</h1>
        <p className="r-page-sub">
          Paste what you wrote, or attach the file. Radar judges it against criteria for that kind
          of work and for where you are — shown on screen, so you can see what it was measured
          against.
        </p>
      </div>

      <div className="assess__paste">
        <textarea
          className="r-textarea assess__text"
          placeholder="Paste your work here — the whole thing, not an extract."
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={assess.isPending}
        />

        <div className="assess__paste-foot">
          <button
            className="btn btn--primary"
            onClick={() => assess.mutate({ text: text.trim(), kind: declared ?? undefined })}
            disabled={assess.isPending || shortBy > 0}
          >
            {assess.isPending ? "Reading it…" : "Assess this"}
          </button>

          {/* Said before the work is sent rather than after it is refused. */}
          {text.trim().length > 0 && shortBy > 0 && (
            <span className="assess__formats">
              {shortBy} more characters before there is enough to judge
            </span>
          )}

          <button
            className="btn btn--text btn--sm"
            onClick={() => fileInput.current?.click()}
            disabled={assess.isPending}
          >
            <Icon name="upload" size={13} /> Or attach a file
          </button>
        </div>

        <input
          ref={fileInput}
          type="file"
          accept=".pdf,.doc,.docx,.md,.txt,.csv,.json,.html"
          style={{ display: "none" }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) assess.mutate({ file, kind: declared ?? undefined });
            // Cleared so re-attaching the same file after a fix fires onChange again.
            e.target.value = "";
          }}
        />

        <span className="assess__formats">PDF, Word, Markdown, text, CSV, JSON or HTML</span>
      </div>

      {error && (
        <div role="alert" className="assess__error">
          {error}
        </div>
      )}

      {/* What kind of work this is — typed, not picked from a fixed seven. */}
      {!result && !assess.isPending && (
        <section className="assess__rubric">
          <div className="assess__rubric-label">What kind of work is this?</div>

          <p className="assess__rubric-note">
            Optional. Leave it and Radar works it out from the text. Say, and it takes your word
            and shows you the standard first.
          </p>

          <input
            className="r-input assess__kind-search"
            type="text"
            placeholder="Type it — dissertation chapter, scholarship, README, caption…"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
          />

          <div className="assess__kinds">
            {matches.map((option) => (
              <button
                key={option.kind}
                className={`assess__kind ${declared === option.kind ? "active" : ""}`}
                title={option.covers}
                onClick={() => setDeclared(declared === option.kind ? null : option.kind)}
              >
                {option.label}
              </button>
            ))}
          </div>

          {/* Nothing rather than the nearest thing. Quietly judging a recipe book against the
              research-proposal standard is how a judgement nobody can account for happens. */}
          {matches.length === 0 && (
            <p className="assess__rubric-note">
              Radar has no written standard for that. Leave this blank and it will judge the work
              as whatever it reads it to be, or try another word for it.
            </p>
          )}

          {declared && rubric.data && (
            <div className="assess__rubric-list">
              <p className="assess__rubric-note">
                As a {rubric.data.assessedAs.replace("YoungProfessional", "professional")}, your{" "}
                {labelFor(declared).toLowerCase()} is read for:
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
            description={result.notAssessedReason ?? "Radar could not assess this work."}
          />

          {result.kind === "Unknown" && lastWork && (
            <div className="assess__kinds">
              {DOCUMENT_KINDS.map((option) => (
                <button
                  key={option.kind}
                  className="assess__kind"
                  title={option.covers}
                  onClick={() => declareAndReassess(option.kind)}
                  disabled={assess.isPending}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      {result?.wasAssessed && (
        <section className="assess__result">
          <div className="assess__result-head">
            <div>
              <div className="assess__detected">
                {result.kindWasDeclared ? "Assessed as a" : "Read as a"}{" "}
                <strong>{labelFor(result.kind).toLowerCase()}</strong>, for a{" "}
                {result.assessedAs.replace("YoungProfessional", "professional")}
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
            {/* A revision is the point of the bar, and the pasted text is still in the box. */}
            <button
              className="btn btn--text btn--sm"
              onClick={() => assess.reset()}
              disabled={assess.isPending}
            >
              <Icon name="next" size={13} /> Assess a revision
            </button>

            {/* A wrong detection is correctable without handing the work in again. */}
            {!result.kindWasDeclared && lastWork && (
              <details className="assess__wrong">
                <summary>Not a {labelFor(result.kind).toLowerCase()}?</summary>
                <div className="assess__kinds">
                  {DOCUMENT_KINDS.filter((option) => option.kind !== result.kind).map((option) => (
                    <button
                      key={option.kind}
                      className="assess__kind"
                      title={option.covers}
                      onClick={() => declareAndReassess(option.kind)}
                      disabled={assess.isPending}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </details>
            )}
          </div>
        </section>
      )}

      {/* Everything handed in before. Already stored, already served by an endpoint, and
          reachable from nowhere until now - so a learner read their feedback once and lost it
          when they closed the tab. */}
      <AssessmentHistory onOpen={setOpened} openId={opened?.id} />
    </div>
  );
}
