import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { LoadingSkeleton } from "../components/LoadingSkeleton";
import { ErrorState } from "../components/ErrorState";
import { ApiError, getEventsSummary, getAiEngineStatus } from "../lib/api";

const DAY_OPTIONS = [7, 30, 90];

const EVENT_LABELS: Record<string, string> = {
  Impression: "Impressions",
  Open: "Opens",
  Save: "Saves",
  Unsave: "Unsaves",
  NotRelevant: "Marked not relevant",
  AddToRoadmap: "Added to roadmap",
  CaptureCreated: "Captures created",
  ClipSaved: "Clips saved",
  WhyRatedHelpful: "\"Why\" rated helpful",
  WhyRatedNotHelpful: "\"Why\" rated not helpful",
};

export function Metrics() {
  const [days, setDays] = useState(7);
  const query = useQuery({ queryKey: ["events-summary", days], queryFn: () => getEventsSummary(days) });
  const aiQuery = useQuery({ queryKey: ["ai-engine-status"], queryFn: getAiEngineStatus });
  const summary = query.data;
  const aiStats = aiQuery.data;
  const errorMessage = query.error instanceof ApiError ? query.error.message : "Could not load metrics.";

  const counts = summary
    ? Object.entries(summary.eventCounts).filter(([, count]) => count > 0).sort((a, b) => b[1] - a[1])
    : [];
  const totalEvents = counts.reduce((sum, [, count]) => sum + count, 0);
  const helpfulRate = summary?.whyHelpfulRatings.helpfulRatePercent ?? null;

  return (
    <div className="r-page" style={{ maxWidth: 640 }}>
      <div className="r-page-head">
        <h1 className="r-page-title">Quality & AI Engine Metrics</h1>
        <p className="r-page-sub">
          Monitor the Central AI Engine activities, feedback scores, and operational performance.
        </p>
      </div>

      {/* Central AI Engine Card */}
      <div style={{ background: "var(--navy)", borderRadius: 16, padding: "20px 22px", color: "#fff", marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--cyan-bright)" }}>
            CENTRAL AI ENGINE · CORE PROCESSOR
          </div>
          <span style={{ fontSize: 11, padding: "3px 8px", borderRadius: 10, background: aiStats?.isCloudLlmActive ? "rgba(0,210,180,0.2)" : "rgba(255,200,0,0.2)", color: aiStats?.isCloudLlmActive ? "var(--cyan-bright)" : "var(--amber)" }}>
            {aiStats?.isCloudLlmActive ? "● Cloud LLM Active" : aiStats?.isBudgetExhausted ? "● Spend cap reached — degraded" : "● Resilient Deterministic Brain"}
          </span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)" }}>Activities Processed</div>
            <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "var(--font-display)" }}>{aiStats?.totalActivitiesProcessed ?? "—"}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)" }}>Monthly Spend</div>
            <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "var(--font-display)" }}>${(aiStats?.monthlySpendUsd ?? 0).toFixed(2)}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)" }}>Spend Cap</div>
            <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "var(--font-display)" }}>${(aiStats?.monthlySpendCapUsd ?? 25).toFixed(0)}</div>
          </div>
        </div>
        {aiStats?.degradedReason && (
          <div style={{ fontSize: 12, color: "var(--amber)", fontWeight: 600, marginBottom: 10 }}>
            {aiStats.degradedReason}
          </div>
        )}
        <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.8)", borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: 10 }}>
          Central Processor: <strong>Feed Intelligence, Learning Paths, Learn Hub, Opportunities, Academic Research, AI Mentor</strong>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {DAY_OPTIONS.map((d) => (
          <button key={d} className={`r-chip ${days === d ? "active" : ""}`} onClick={() => setDays(d)}>
            Last {d} days
          </button>
        ))}
      </div>

      {query.isLoading ? (
        <LoadingSkeleton variant="card" count={2} />
      ) : query.isError ? (
        <ErrorState title="Failed to load metrics" description={errorMessage} onRetry={() => query.refetch()} />
      ) : (
        <>
          <div style={{ background: "var(--navy)", borderRadius: 16, padding: "20px 22px", color: "#fff", marginBottom: 16 }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--cyan-bright)", marginBottom: 9 }}>
              "WHY" HELPFUL RATE
            </div>
            {helpfulRate === null ? (
              <div style={{ fontSize: 13.5, color: "rgba(255,255,255,.7)" }}>No ratings yet in this window.</div>
            ) : (
              <>
                <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "2.2rem", lineHeight: 1 }}>
                  {helpfulRate}%
                </div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,.6)", marginTop: 6 }}>
                  {summary!.whyHelpfulRatings.helpful} helpful · {summary!.whyHelpfulRatings.notHelpful} not helpful
                  {" · target >70%"}
                </div>
              </>
            )}
          </div>

          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".07em", textTransform: "uppercase", color: "var(--text-faint)", marginBottom: 10 }}>
            EVENT COUNTS · {totalEvents} TOTAL
          </div>

          {counts.length === 0 ? (
            <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 14, padding: "18px 20px", fontSize: 13.5, color: "var(--text-dim)" }}>
              No events logged in this window yet.
            </div>
          ) : (
            <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
              {counts.map(([type, count], i) => (
                <div
                  key={type}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "13px 18px", borderBottom: i < counts.length - 1 ? "1px solid rgba(20,24,31,.06)" : "none",
                  }}
                >
                  <span style={{ fontSize: 13.5, fontWeight: 600 }}>{EVENT_LABELS[type] ?? type}</span>
                  <span style={{ fontSize: 13.5, fontWeight: 700, color: "var(--cyan-deep)" }}>{count}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
