import { useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getContentBoard,
  getReferralBoard,
  getReviewQueue,
  judgeSubmission,
  type ContentSubmission,
} from "../lib/api";

/// The growth campaign, from the admin side.
///
/// Two things are being rewarded and they are counted entirely separately: bringing people in,
/// which Radar can see, and making something that explains Radar, which lives on somebody else's
/// platform and which Radar cannot see at all.
///
/// The two boards sit side by side and are never combined into one score. That would need an
/// exchange rate between a video and a user, and there is not an honest one — the question
/// "should an excellent video beat thirty real users" belongs to whoever runs the campaign,
/// answered in front of both numbers, not buried in a weighting nobody can inspect.

export function AdminCampaignSection() {
  return (
    <div className="r-admin-page">
      <ReviewQueuePanel />
      <div className="admin-split">
        <div className="admin-split__left"><AcquisitionBoard /></div>
        <div className="admin-split__right"><ContentBoardPanel /></div>
      </div>
    </div>
  );
}

/// <summary>Who brought people in, and how many of them stayed.</summary>
///
/// Three numbers rather than a score. A sign-up is not a user: somebody who gets thirty people to
/// create an account and walk away has produced thirty rows, and one number cannot tell that from
/// thirty people who come back every week. The server orders by the people who came back first,
/// which is the campaign's incentive made explicit.
function AcquisitionBoard() {
  const query = useQuery({ queryKey: ["admin", "referral-board"], queryFn: () => getReferralBoard() });

  return (
    <div className="admin-card">
      <div className="admin-card__header">
        <div className="admin-card__title">Bringing people in</div>
        <span className="admin-card__meta">Ordered by who came back</span>
      </div>

      {query.isError && <p className="admin-note">Could not read the acquisition board.</p>}
      {!query.isError && !query.data && <p className="admin-note">Counting…</p>}
      {query.data?.length === 0 && (
        <p className="admin-note">Nobody has brought anybody in yet. Participants get a link from their Settings page.</p>
      )}

      {query.data?.map((row) => (
        <div className="admin-table-row" key={row.profileId}>
          <div style={{ flex: 2, minWidth: 0 }}>
            <div style={{ fontSize: 12.5, fontWeight: 700 }}>{row.name || "Unnamed participant"}</div>
            <div style={{ fontSize: 11, color: "#8a91a0" }}>{row.code ?? "no code yet"}</div>
          </div>
          <Count label="signed up" value={row.signedUp} />
          <Count label="personalised" value={row.personalised} />
          <Count label="came back" value={row.cameBack} strong />
        </div>
      ))}

      {/* Said per board rather than per row, because it is the same fact about every row and a
          column of mostly-zeroes would crowd out the three that matter. */}
      {query.data && query.data.some((row) => row.awaitingConfirmation > 0) && (
        <p className="admin-note" style={{ marginTop: 12 }}>
          Waiting on a confirmed email: {query.data
            .filter((row) => row.awaitingConfirmation > 0)
            .map((row) => `${row.name || "Unnamed"} ${row.awaitingConfirmation}`)
            .join(", ")}. Those sign-ups are in none of the counts above.
        </p>
      )}

      <p className="admin-note" style={{ marginTop: 12 }}>
        Three numbers, not one. Thirty accounts that never came back is not thirty users, and a
        single score cannot tell those apart. Only sign-ups whose email address has been confirmed
        are counted at all — an address nobody has to own is how thirty of them get made in an
        afternoon.
      </p>
    </div>
  );
}

function Count({ label, value, strong }: { label: string; value: number; strong?: boolean }) {
  return (
    <div style={{ flex: 1, textAlign: "right" }}>
      <div style={{ fontSize: 13, fontWeight: strong ? 800 : 600, color: strong ? "#008c93" : "#535c6b" }}>{value}</div>
      <div style={{ fontSize: 10.5, color: "#8a91a0" }}>{label}</div>
    </div>
  );
}

/// <summary>Who made something, and what a reviewer thought of it.</summary>
///
/// Ranked on the best single piece and nothing else. Every tiebreak that was tried rewarded
/// volume in some form — the first version summed the marks, so one clip submitted five times
/// beat one good video — and the campaign is asking who made something good. Equal bests are left
/// equal, for a person to look at.
function ContentBoardPanel() {
  const query = useQuery({ queryKey: ["admin", "content-board"], queryFn: () => getContentBoard() });

  return (
    <div className="admin-card">
      <div className="admin-card__header">
        <div className="admin-card__title">Making something about Radar</div>
        <span className="admin-card__meta">Best single piece</span>
      </div>

      {query.isError && <p className="admin-note">Could not read the content board.</p>}
      {!query.isError && !query.data && <p className="admin-note">Counting…</p>}

      {query.data?.makers.length === 0 && (
        <p className="admin-note">
          {query.data.awaitingReview > 0
            // A board of nobody with work in the queue is not an empty campaign.
            ? `Nothing judged yet — ${query.data.awaitingReview} submission${query.data.awaitingReview === 1 ? "" : "s"} waiting above.`
            : "Nobody has submitted anything yet."}
        </p>
      )}

      {query.data?.makers.map((maker) => (
        <div className="admin-table-row" key={maker.profileId}>
          <div style={{ flex: 2, minWidth: 0 }}>
            <div style={{ fontSize: 12.5, fontWeight: 700 }}>{maker.name}</div>
            <div style={{ fontSize: 11, color: "#8a91a0" }}>
              {maker.judged} of {maker.submitted} reviewed
            </div>
          </div>
          <Count label="best" value={maker.best} strong />
        </div>
      ))}

      {query.data && query.data.makers.length > 0 && query.data.awaitingReview > 0 && (
        <p className="admin-note" style={{ marginTop: 12 }}>
          {query.data.awaitingReview} submission{query.data.awaitingReview === 1 ? " is" : "s are"} still
          waiting to be reviewed, so this board is not final.
        </p>
      )}

      <p className="admin-note" style={{ marginTop: 12 }}>
        {query.data?.rankedOn ?? "The best single piece."} This is reported beside the acquisition
        board and never averaged with it — there is no honest exchange rate between a video and a
        user, so which one wins is your call, made in front of both.
      </p>
    </div>
  );
}

/// <summary>The work waiting to be marked.</summary>
///
/// Radar cannot see a video on TikTok, so every number on the content board came from a person
/// who watched it. This is where that happens — and until it did, the board could only ever be
/// empty.
function ReviewQueuePanel() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ["admin", "review-queue"], queryFn: () => getReviewQueue() });
  const [openId, setOpenId] = useState<string | null>(null);

  const waiting = query.data?.waiting ?? [];
  const judged = query.data?.recentlyJudged ?? [];

  const afterJudging = async () => {
    setOpenId(null);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["admin", "review-queue"] }),
      // The board is built from these marks, so it is stale the moment one lands.
      queryClient.invalidateQueries({ queryKey: ["admin", "content-board"] }),
    ]);
  };

  return (
    <div className="admin-card">
      <div className="admin-card__header">
        <div className="admin-card__title">Waiting to be reviewed</div>
        <span className="admin-card__meta">{query.data ? `${waiting.length} waiting` : ""}</span>
      </div>

      {query.isError && <p className="admin-note">Could not read the review queue.</p>}
      {!query.isError && !query.data && <p className="admin-note">Loading…</p>}
      {query.data && waiting.length === 0 && (
        <p className="admin-note">Nothing is waiting. Submissions appear here as participants send them.</p>
      )}

      {waiting.map((submission) => (
        <Submission
          key={submission.id}
          submission={submission}
          open={openId === submission.id}
          onOpen={() => setOpenId(openId === submission.id ? null : submission.id)}
          onJudged={afterJudging}
        />
      ))}

      {judged.length > 0 && (
        <>
          <div className="admin-card__title" style={{ marginTop: 18 }}>Recently marked</div>
          {judged.slice(0, 10).map((submission) => (
            <Submission
              key={submission.id}
              submission={submission}
              open={openId === submission.id}
              onOpen={() => setOpenId(openId === submission.id ? null : submission.id)}
              onJudged={afterJudging}
            />
          ))}
        </>
      )}
    </div>
  );
}

function Submission({
  submission,
  open,
  onOpen,
  onJudged,
}: {
  submission: ContentSubmission;
  open: boolean;
  onOpen: () => void;
  onJudged: () => Promise<void>;
}) {
  const [score, setScore] = useState(submission.score ?? 7);
  const [verdict, setVerdict] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    // Checked here as well as on the server, so the reason for a refusal arrives while they are
    // still looking at the box they typed it in.
    if (verdict.trim().length < 10) {
      setError("Say why, in a sentence. A mark with no reason is a number nobody can argue with.");
      return;
    }

    setBusy(true);
    try {
      await judgeSubmission(submission.id, score, verdict.trim());
      setVerdict("");
      await onJudged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not record that.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="admin-flag-item">
      <div className="admin-flag-item__meta">
        <span className={`admin-tag ${submission.isJudged ? "admin-tag--tier1" : "admin-tag--pending"}`}>
          {submission.isJudged ? `Marked ${submission.score}` : "Not looked at"}
        </span>
        <span style={{ fontSize: 11.5, color: "#8a91a0" }}>
          {submission.profileName} · {submission.platform} · {new Date(submission.submittedAt).toLocaleDateString()}
        </span>
      </div>

      {/* Opened in a new tab and never fetched by Radar. Following a link a stranger submitted,
          from the server, is a request Radar's own address makes on somebody else's behalf. */}
      <a
        className="admin-flag-item__title"
        href={submission.link}
        target="_blank"
        rel="noopener noreferrer nofollow"
        style={{ display: "block", wordBreak: "break-all" }}
      >
        {submission.link}
      </a>

      {submission.note && <p className="admin-flag-item__desc">{submission.note}</p>}

      {submission.isJudged && submission.verdict && (
        <p className="admin-note">
          “{submission.verdict}”{submission.judgedBy ? ` — ${submission.judgedBy}` : ""}
        </p>
      )}

      {/* Every mark it has carried. A second judging replaces the first on the board but does not
          erase it: a number that decides a prize has to stay arguable. */}
      {submission.marks.length > 1 && (
        <p className="admin-note" style={{ fontSize: 11 }}>
          Marked {submission.marks.length} times. Earlier:{" "}
          {submission.marks.slice(0, -1).map((mark) => `${mark.score}`).join(", ")}.
        </p>
      )}

      <button className="btn btn--subtle btn--sm" onClick={onOpen}>
        {open ? "Close" : submission.isJudged ? "Change the mark" : "Mark it"}
      </button>

      {open && (
        <form onSubmit={submit} style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
          <label style={{ fontSize: 11.5, color: "#535c6b" }}>
            Out of ten
            <input
              type="number"
              min={1}
              max={10}
              className="admin-search"
              value={score}
              onChange={(event) => setScore(Number(event.target.value))}
              aria-label="Mark out of ten"
              style={{ marginTop: 4 }}
            />
          </label>

          <textarea
            className="admin-search"
            rows={2}
            placeholder="Why it got that mark"
            value={verdict}
            onChange={(event) => setVerdict(event.target.value)}
            aria-label="Why it got that mark"
          />

          {error && <p className="admin-note" style={{ color: "#c0392b" }}>{error}</p>}

          <div>
            <button className="btn btn--accent btn--sm" type="submit" disabled={busy}>
              {busy ? "Recording…" : "Record this mark"}
            </button>
          </div>

          <p className="admin-note" style={{ fontSize: 11 }}>
            You cannot mark your own submission, and the reason is kept with the mark — a number a
            participant cannot argue with is the thing this product refuses to produce anywhere
            else.
          </p>
        </form>
      )}
    </div>
  );
}
