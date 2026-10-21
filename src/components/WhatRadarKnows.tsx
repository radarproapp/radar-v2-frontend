import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { correctLearningRecord, getLearningRecord, type LearningRecord } from "../lib/api";

/// What Radar has worked out about the user, and a way to argue with it.
///
/// Every surface is personalised now — the feed, the roadmap, the opportunity matches — and all of
/// it runs off one derived record the user has never been shown. That is the failure the reviewer
/// described in their own words: personalisation you cannot see is indistinguishable from
/// personalisation that is not happening, and personalisation you cannot correct is just a wrong
/// answer you have to live with.
///
/// Two kinds of thing are shown, deliberately not mixed. What the user *told* Radar is edited
/// where they said it, on the profile. What Radar *inferred* from their behaviour can be
/// disagreed with here, because they never said it in the first place.
export function WhatRadarKnows() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const recordQuery = useQuery({ queryKey: ["learning-record"], queryFn: getLearningRecord });

  const correct = useMutation({
    mutationFn: correctLearningRecord,
    // The endpoint returns the rebuilt record, so the corrected view is written straight into the
    // cache rather than refetching and briefly showing the old answer again.
    onSuccess: (updated) => queryClient.setQueryData(["learning-record"], updated),
  });

  if (recordQuery.isLoading) {
    return <Muted>Working out what Radar knows about you…</Muted>;
  }

  if (recordQuery.isError || !recordQuery.data) {
    return <Muted>Radar could not load this right now. Try again in a moment.</Muted>;
  }

  const record = recordQuery.data;
  const confidence = Math.round(record.confidence * 100);

  return (
    <div style={{ marginBottom: 24 }}>
      <SectionLabel>WHAT RADAR KNOWS ABOUT YOU</SectionLabel>

      <Card>
        <p style={{ fontSize: 13, margin: "0 0 16px", lineHeight: 1.5 }}>{plainSummary(record)}</p>

        <Block title="What you told us">
          <Fact label="Your goal" value={record.primaryGoal} />
          <Fact label="Role you want" value={record.targetRole} />
          <Fact label="Where you are" value={record.location} />
          <Fact label="Level you picked" value={record.declaredLevel} />
          <button className="btn btn--sm" style={{ marginTop: 10 }} onClick={() => navigate("/profile/edit")}>
            Edit these
          </button>
        </Block>

        <Block
          title="What Radar worked out"
          note="These come from what you open, save and finish — not from anything you typed. If one is wrong, say so and Radar stops using it."
        >
          {record.signals.length === 0 ? (
            <Muted>Nothing yet. Radar starts noticing once you read, save and finish a few things.</Muted>
          ) : (
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {record.signals.map((signal) => (
                <li
                  key={signal.term}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                    padding: "8px 0",
                    borderBottom: "1px solid rgba(20,24,31,.06)",
                  }}
                >
                  <span style={{ minWidth: 0 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, display: "block" }}>{signal.term}</span>
                    <span style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
                      {/* A count of zero is never worth printing: it reads as an accusation that
                          the user did something they did not do. The server already filters
                          rejected terms out, so this is the second line of defence. */}
                      {signal.timesEngaged <= 0
                        ? "Radar picked this up from how you browse"
                        : signal.timesEngaged === 1
                          ? "you looked at this once"
                          : `you came back to this ${signal.timesEngaged} times`}
                    </span>
                  </span>
                  <button
                    className="btn btn--sm"
                    onClick={() => correct.mutate(signal.term)}
                    disabled={correct.isPending}
                  >
                    Not me
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Block>

        {record.priorityTopics.length > 0 && (
          <Block title="What Radar thinks you should learn next">
            <Bullets items={record.priorityTopics} />
          </Block>
        )}

        {record.weakAreas.length > 0 && (
          <Block title="Where you are still building" note="From your quiz answers, not a judgement.">
            <Bullets items={record.weakAreas} />
          </Block>
        )}

        <Block title="How sure Radar is">
          {/* Said in words rather than as a bare percentage: a number on its own invites the user
              to read precision into what is really a rough confidence. */}
          <p style={{ fontSize: 13, margin: 0, lineHeight: 1.5 }}>
            {confidence < 35
              ? `Not very — about ${confidence}%. Radar is still going mostly on what you told it, so it is careful about changing your path.`
              : `Fairly — about ${confidence}%. Radar has enough of your activity to shape what it shows you.`}
          </p>
        </Block>
      </Card>
    </div>
  );
}

/// The record's own summary when the server wrote one, otherwise a sentence built from the counts.
///
/// Never claims activity that has not happened: a brand new user is told plainly that there is
/// nothing yet, rather than shown an encouraging line about progress they have not made.
function plainSummary(record: LearningRecord): string {
  if (record.summary) return record.summary;

  if (record.lessonsCompleted === 0 && record.quizzesTaken === 0) {
    return "Radar has not seen enough yet. Finish a lesson or two and this fills in.";
  }

  const parts: string[] = [];
  if (record.lessonsCompleted > 0) {
    parts.push(`${record.lessonsCompleted} ${record.lessonsCompleted === 1 ? "lesson" : "lessons"}`);
  }
  if (record.quizzesTaken > 0) {
    parts.push(`${record.quizzesTaken} ${record.quizzesTaken === 1 ? "quiz" : "quizzes"}`);
  }

  return `You have finished ${parts.join(" and ")}.`;
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: ".07em",
        textTransform: "uppercase",
        color: "var(--text-faint)",
        marginBottom: 10,
      }}
    >
      {children}
    </div>
  );
}

function Card({ children }: { children: ReactNode }) {
  return (
    <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 14, padding: "18px 20px" }}>
      {children}
    </div>
  );
}

function Block({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <div style={{ paddingTop: 14, borderTop: "1px solid rgba(20,24,31,.06)", marginTop: 14 }}>
      <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: note ? 4 : 8 }}>{title}</div>
      {note && <p style={{ fontSize: 11.5, color: "var(--text-muted)", margin: "0 0 10px", lineHeight: 1.5 }}>{note}</p>}
      {children}
    </div>
  );
}

function Bullets({ items }: { items: string[] }) {
  return (
    <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.7 }}>
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

function Muted({ children }: { children: ReactNode }) {
  return <p style={{ fontSize: 12.5, color: "var(--text-muted)", margin: 0, lineHeight: 1.5 }}>{children}</p>;
}

/// A single stated fact. Renders an honest blank rather than hiding the row, so the user can see
/// that Radar has nothing for it — which is usually what explains weak personalisation.
function Fact({ label, value }: { label: string; value: string }) {
  return (
    <p style={{ fontSize: 13, margin: "0 0 6px" }}>
      <span style={{ color: "var(--text-muted)" }}>{label}:</span>{" "}
      {value ? (
        <strong>{value}</strong>
      ) : (
        <em style={{ color: "var(--text-muted)" }}>you have not said yet</em>
      )}
    </p>
  );
}
