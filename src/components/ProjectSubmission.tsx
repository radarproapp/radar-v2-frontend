import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Icon } from "./Icon";
import { ApiError, completeProject, submitProject } from "../lib/api";
import { SUBMISSION_KINDS } from "../lib/types";
import type { StudioProject, SubmissionKind } from "../lib/types";

/// Handing a project in, and what Radar made of it.
///
/// The whole of this existed on the server and nowhere a learner could reach it. Submissions,
/// the five kinds, the standards per stage, the mark out of ten and the bar at six were all
/// built and proven, and the screen offered a plan, some tips and a share link — so a project
/// could be started and never handed in.
///
/// Five kinds, as specified: code, image, video, document or link. Radar reads the text of a
/// document or source file. It cannot read an image or a video at all, and says so rather than
/// guessing from a filename — which is why the notes are asked for every time and are the whole
/// of what those two are judged on.
///
/// Nothing is accepted automatically. The mark is arithmetic over named criteria, each with the
/// evidence for it, and six out of ten is the bar.

const KIND_LABEL: Record<SubmissionKind, string> = {
  Code: "Code",
  Image: "Image",
  Video: "Video",
  Document: "Document",
  Link: "Link",
};

/// What each kind actually asks for.
const KIND_ASKS: Record<SubmissionKind, string> = {
  Code: "Source files Radar can read.",
  Image: "Radar cannot read an image, so your notes are what it judges.",
  Video: "Radar cannot watch a video, so your notes are what it judges.",
  Document: "A report, an essay, a plan — anything readable as text.",
  Link: "Something already published: a site, a repo, a deployed thing.",
};

const NEEDS_FILE: SubmissionKind[] = ["Code", "Image", "Video", "Document"];

const VERDICT_LABEL: Record<string, string> = {
  Met: "Met",
  Partly: "Partly",
  NotMet: "Not met",
  Unjudged: "Not assessed",
};

export function ProjectSubmissionPanel({ project }: { project: StudioProject }) {
  const queryClient = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);

  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<SubmissionKind>("Document");
  const [notes, setNotes] = useState("");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const latest = project.submissions?.[project.submissions.length - 1];
  const assessment = latest?.assessment ?? null;

  const refresh = (updated: StudioProject) => {
    queryClient.setQueryData<StudioProject[]>(["projects", "mine"], (old) =>
      old?.map((p) => (p.id === updated.id ? updated : p)),
    );
    queryClient.invalidateQueries({ queryKey: ["projects", "mine"] });
  };

  const submit = useMutation({
    mutationFn: () =>
      submitProject(project.id, {
        kind,
        notes: notes.trim(),
        file: file ?? undefined,
        url: url.trim() || undefined,
      }),
    onMutate: () => setError(null),
    onSuccess: (updated) => {
      setFile(null);
      setUrl("");
      setNotes("");
      setOpen(false);
      refresh(updated);
    },
    onError: (e) =>
      setError(e instanceof ApiError ? e.message : "Could not hand that in. Try again shortly."),
  });

  /// Marking it finished, which the server refuses unless the latest attempt cleared the bar.
  const finish = useMutation({
    mutationFn: () => completeProject(project.id),
    onMutate: () => setError(null),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["projects", "mine"] }),
    onError: (e) =>
      setError(e instanceof ApiError ? e.message : "Could not mark that finished."),
  });

  const needsFile = NEEDS_FILE.includes(kind);
  const ready = notes.trim().length > 1 && (needsFile ? file !== null : url.trim().length > 4);
  const busy = submit.isPending || finish.isPending;

  return (
    <div className="submit">
      {assessment && (
        <div className="submit__mark">
          {assessment.score === null ? (
            // Not a mark of zero. Nothing was assessed, and saying so is the honest answer.
            //
            // The standards still come back, so they are still shown: somebody waiting to be
            // marked can see what the work will be measured against, which is the more useful
            // half of an assessment and the half that does not need a model to produce.
            <>
              <div className="submit__notassessed">
                {assessment.notAssessedReason ?? "This has not been assessed yet."}
              </div>

              {assessment.criteria.length > 0 && (
                <>
                  <div className="submit__label" style={{ marginTop: 14 }}>
                    What it will be judged against
                  </div>
                  <div className="submit__criteria">
                    {assessment.criteria.map((criterion) => (
                      <div key={criterion.name} className="submit__standard">
                        <span className="submit__standard-name">{criterion.name}</span>
                        {criterion.asks && (
                          <span className="submit__standard-asks">{criterion.asks}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          ) : (
            <>
              <div className="submit__score-row">
                <span
                  className={`submit__score ${assessment.isAccepted ? "accepted" : "under"}`}
                >
                  {assessment.score} / 10
                </span>
                <span className="submit__verdict">{assessment.verdict}</span>
              </div>

              {/* What it was judged on. A mark without the criteria is a number nobody can
                  argue with, which is the thing this product refuses to produce. */}
              <div className="submit__criteria">
                {assessment.criteria.map((criterion) => (
                  <div
                    key={criterion.name}
                    className={`crit crit--${criterion.verdict.toLowerCase()}`}
                  >
                    <div className="crit__head">
                      <span className="crit__name">{criterion.name}</span>
                      <span className="crit__verdict">
                        {VERDICT_LABEL[criterion.verdict] ?? criterion.verdict}
                      </span>
                    </div>
                    {criterion.asks && <p className="crit__asks">{criterion.asks}</p>}
                    {criterion.evidence && <p className="crit__evidence">{criterion.evidence}</p>}
                    {criterion.fix && (
                      <p className="crit__fix">
                        <Icon name="next" size={12} /> {criterion.fix}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              {assessment.judgedFrom && (
                <p className="submit__judged">Judged from {assessment.judgedFrom}</p>
              )}
            </>
          )}
        </div>
      )}

      <div className="submit__actions">
        <button className="btn btn--sm" onClick={() => setOpen((v) => !v)} disabled={busy}>
          <Icon name="upload" size={13} />{" "}
          {project.submissions?.length ? "Hand in a revision" : "Hand in your work"}
        </button>

        {/* Offered only once the work has earned it. The server refuses otherwise, and a
            button that is always there teaches people to press it and be told no. */}
        {assessment?.isAccepted && !project.isCompleted && (
          <button
            className="btn btn--primary btn--sm"
            onClick={() => finish.mutate()}
            disabled={busy}
          >
            {finish.isPending ? "Finishing…" : "Mark it finished"}
          </button>
        )}
      </div>

      {open && (
        <div className="submit__form">
          <div className="submit__label">What are you handing in?</div>

          <div className="submit__kinds">
            {SUBMISSION_KINDS.map((option) => (
              <button
                key={option}
                className={`submit__kind ${kind === option ? "active" : ""}`}
                onClick={() => {
                  setKind(option);
                  setFile(null);
                  setUrl("");
                }}
                disabled={busy}
              >
                {KIND_LABEL[option]}
              </button>
            ))}
          </div>

          <p className="submit__asks">{KIND_ASKS[kind]}</p>

          {needsFile ? (
            <div className="submit__file">
              <input
                ref={fileInput}
                type="file"
                style={{ display: "none" }}
                onChange={(e) => {
                  setFile(e.target.files?.[0] ?? null);
                  e.target.value = "";
                }}
              />
              <button
                className="btn btn--sm"
                onClick={() => fileInput.current?.click()}
                disabled={busy}
              >
                {file ? file.name : "Choose a file"}
              </button>
            </div>
          ) : (
            <input
              className="r-input"
              placeholder="https://…"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={busy}
            />
          )}

          <textarea
            className="r-textarea submit__notes"
            placeholder="What did you build, and what were you trying to show?"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={busy}
          />

          <div className="submit__submit">
            <button
              className="btn btn--primary btn--sm"
              onClick={() => submit.mutate()}
              disabled={busy || !ready}
            >
              {submit.isPending ? "Assessing…" : "Hand it in"}
            </button>

            <span className="submit__note">
              It is assessed against the standards for your stage. Six out of ten is the bar.
            </span>
          </div>
        </div>
      )}

      {error && (
        <div role="alert" className="submit__error">
          {error}
        </div>
      )}

      {/* Earlier attempts, because a project under the bar is meant to be revised — and the
          attempts are the evidence somebody improved. */}
      {(project.submissions?.length ?? 0) > 1 && (
        <details className="submit__history">
          <summary>{project.submissions!.length} attempts</summary>
          {project.submissions!.map((attempt, i) => (
            <div key={attempt.id} className="submit__attempt">
              <span>
                #{i + 1} · {KIND_LABEL[attempt.kind] ?? attempt.kind}
              </span>
              <span>
                {attempt.assessment?.score != null
                  ? `${attempt.assessment.score} / 10`
                  : "not assessed"}
              </span>
            </div>
          ))}
        </details>
      )}
    </div>
  );
}
