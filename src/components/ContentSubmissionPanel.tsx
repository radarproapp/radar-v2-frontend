import { useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getMySubmissions, submitContent, withdrawSubmission, type ContentSubmission } from "../lib/api";
import { Icon } from "./Icon";

/// The half of the campaign a person has to judge.
///
/// A video lives on TikTok or WhatsApp. Nothing inside Radar can see it, count its views, or know
/// whether it is any good — so a submission is a claim, and it stays a claim until somebody
/// watches it and says otherwise. Every number here came from a person.
///
/// Sits beside the referral panel because the two are the campaign's two halves and are rewarded
/// separately: an excellent video that brings nobody is not the same contribution as introducing
/// Radar to thirty people who stay.
const PLATFORMS = ["TikTok", "YouTube", "Instagram", "X", "WhatsApp", "LinkedIn", "Facebook", "Other"];

export function ContentSubmissionPanel() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ["campaign", "mine"], queryFn: getMySubmissions });

  const [link, setLink] = useState("");
  const [platform, setPlatform] = useState(PLATFORMS[0]);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["campaign", "mine"] });

  const send = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setDone(null);
    setBusy(true);

    try {
      await submitContent(link.trim(), platform, note.trim());
      setLink("");
      setNote("");
      setDone("Sent. Somebody will watch it and leave a mark with their reasons.");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send that.");
    } finally {
      setBusy(false);
    }
  };

  const takeBack = async (submission: ContentSubmission) => {
    setError(null);
    setDone(null);

    try {
      await withdrawSubmission(submission.id);
      setDone("Taken back.");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not take that back.");
    }
  };

  const mine = query.data ?? [];

  return (
    <section className="referral">
      <h2 className="referral__title">Made something about Radar?</h2>

      <p className="referral__note">
        Send the link and somebody will watch it. This is counted separately from the people you
        bring in — they are two different ways to take part, and neither is a substitute for the
        other.
      </p>

      <form onSubmit={send} style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 14 }}>
        <input
          className="r-input"
          placeholder="Link to what you made"
          value={link}
          onChange={(event) => setLink(event.target.value)}
          aria-label="Link to what you made"
          autoComplete="off"
        />

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <select
            className="r-input"
            style={{ flex: "1 1 140px" }}
            value={platform}
            onChange={(event) => setPlatform(event.target.value)}
            aria-label="Where you posted it"
          >
            {PLATFORMS.map((name) => <option key={name} value={name}>{name}</option>)}
          </select>

          <input
            className="r-input"
            style={{ flex: "2 1 200px" }}
            placeholder="What it shows (optional)"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            aria-label="What it shows"
          />
        </div>

        <div>
          <button className="btn btn--primary btn--sm" type="submit" disabled={busy || link.trim().length === 0}>
            {busy ? "Sending…" : "Send it in"}
          </button>
        </div>
      </form>

      {error && <p className="referral__note" style={{ color: "var(--danger, #c0392b)" }}>{error}</p>}
      {done && <p className="referral__note">{done}</p>}

      {/* Radar never opens the link itself. Following a link somebody submitted, from the server,
          is a request Radar's own address makes on their behalf — and the only thing it would buy
          is confirming the page exists, which the person watching it does anyway. */}
      <p className="referral__note" style={{ fontSize: 11.5 }}>
        Radar does not open the link — a person does. You can take a submission back any time
        before somebody has marked it.
      </p>

      {query.isError && <p className="referral__note">Could not load what you have sent.</p>}

      {mine.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".07em", textTransform: "uppercase", color: "var(--text-faint)", marginBottom: 8 }}>
            What you have sent
          </div>

          {mine.map((submission) => (
            <div key={submission.id} style={{ padding: "10px 0", borderTop: "1px solid rgba(20,24,31,.06)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, wordBreak: "break-all" }}>{submission.link}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                    {submission.platform} · {new Date(submission.submittedAt).toLocaleDateString()}
                  </div>
                </div>

                {/* Null is "nobody has looked yet", which is not a low mark. Said in words so the
                    two can never read the same. */}
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  {submission.isJudged ? (
                    <div style={{ fontSize: 14, fontWeight: 800, color: "var(--accent, #008c93)" }}>{submission.score}/10</div>
                  ) : (
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Not looked at yet</div>
                  )}
                </div>
              </div>

              {submission.isJudged && submission.verdict && (
                <p style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 6 }}>“{submission.verdict}”</p>
              )}

              {!submission.isJudged && (
                <button
                  className="btn btn--sm"
                  style={{ marginTop: 8 }}
                  onClick={() => takeBack(submission)}
                >
                  <Icon name="close" size={12} /> Take it back
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
