import { useQuery } from "@tanstack/react-query";
import { Icon } from "./Icon";
import { getAssessments } from "../lib/api";
import { DOCUMENT_KINDS } from "../lib/document-kinds";
import { humanize } from "../lib/date";
import type { DocumentAssessment } from "../lib/types";

/// Everything Radar has assessed for this reader, and what it made of each one.
///
/// Every assessment was already being stored, and `getAssessments` was already written against
/// an endpoint that already existed - and nothing in the product called it. So a learner could
/// hand in a CV, read the feedback, close the tab, and it was gone: no way to see what they had
/// been told last time, and no way to tell whether the rewrite was better than the draft.
///
/// Which is most of the point. A single assessment is an opinion; two of the same work a week
/// apart is evidence that something improved, and improving is what somebody came here to do.

const KIND_LABEL = new Map(DOCUMENT_KINDS.map((k) => [k.kind, k.label]));

export function AssessmentHistory({
  onOpen,
  openId,
}: {
  onOpen: (assessment: DocumentAssessment) => void;
  openId?: string | null;
}) {
  const history = useQuery({ queryKey: ["assessments"], queryFn: getAssessments });

  const assessments = history.data ?? [];

  // Nothing yet is not a state worth a panel. The first assessment makes this appear.
  if (history.isLoading || assessments.length === 0) return null;

  return (
    <section className="assess-history">
      <h2 className="assess-history__title">What you have handed in before</h2>
      <p className="assess-history__note">
        Open any of these to read the feedback again. Handing the same work in after a rewrite is
        how you see whether it improved.
      </p>

      <div className="assess-history__list">
        {assessments.map((assessment) => (
          <button
            key={assessment.id}
            className={`assess-history__item ${openId === assessment.id ? "active" : ""}`}
            onClick={() => onOpen(assessment)}
          >
            <span className="assess-history__name">{assessment.fileName || "Pasted text"}</span>

            <span className="assess-history__meta">
              <span>{KIND_LABEL.get(assessment.kind) ?? assessment.kind}</span>
              <span>·</span>
              <span>{humanize(assessment.assessedAt)}</span>
            </span>

            {/* What it said, in one line. An assessment Radar could not complete says so rather
                than showing a summary of nothing. */}
            <span className="assess-history__summary">
              {assessment.wasAssessed
                ? (assessment.mostValuableChange ?? assessment.summary ?? "Read the feedback")
                : "Not assessed"}
            </span>

            <Icon name="next" size={13} />
          </button>
        ))}
      </div>
    </section>
  );
}
