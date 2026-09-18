import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LoadingSkeleton } from "../components/LoadingSkeleton";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { ApiError, getOpenReports, getSourceReportSummary, resolveReport } from "../lib/api";
import { humanize } from "../lib/date";
import type { ContentReport } from "../lib/types";

const REASON_LABELS: Record<string, string> = {
  Incorrect: "Incorrect / misleading",
  LowQuality: "Low quality",
  BrokenLink: "Broken link",
  NotRelevantToLayer: "Wrong topic/category",
  Other: "Other",
};

export function SourceQuality() {
  const queryClient = useQueryClient();
  const summaryQuery = useQuery({ queryKey: ["reports", "sources"], queryFn: () => getSourceReportSummary(30) });
  const openQuery = useQuery({ queryKey: ["reports", "open"], queryFn: getOpenReports });

  const summary = summaryQuery.data ?? [];
  const openReports = openQuery.data ?? [];
  const errorMessage = openQuery.error instanceof ApiError ? openQuery.error.message : "Could not load reports.";

  const handleResolve = async (report: ContentReport) => {
    queryClient.setQueryData<ContentReport[]>(["reports", "open"], (old) => old?.filter((r) => r.id !== report.id));
    try {
      await resolveReport(report.id);
    } catch {
      queryClient.invalidateQueries({ queryKey: ["reports", "open"] });
    }
  };

  return (
    <div className="r-page" style={{ maxWidth: 700 }}>
      <div className="r-page-head">
        <h1 className="r-page-title">Source Quality</h1>
        <p className="r-page-sub">Manual review of user-reported problems, grouped by source — last 30 days.</p>
      </div>

      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".07em", textTransform: "uppercase", color: "var(--text-faint)", marginBottom: 10 }}>
        REPORTS BY SOURCE
      </div>

      {summaryQuery.isLoading ? (
        <LoadingSkeleton variant="card" count={1} />
      ) : summary.length === 0 ? (
        <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 14, padding: "18px 20px", fontSize: 13.5, color: "var(--text-dim)", marginBottom: 24 }}>
          No reports in the last 30 days.
        </div>
      ) : (
        <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden", marginBottom: 24 }}>
          {summary.map((s, i) => (
            <div
              key={s.source}
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
                padding: "13px 18px", borderBottom: i < summary.length - 1 ? "1px solid rgba(20,24,31,.06)" : "none",
              }}
            >
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 700 }}>{s.source}</div>
                <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
                  Tier {s.credibilityTier || "—"} · last reported {humanize(s.lastReportedAt)}
                </div>
              </div>
              <span style={{ fontSize: 13.5, fontWeight: 700, color: s.reportCount >= 5 ? "var(--red)" : "var(--cyan-deep)" }}>
                {s.reportCount} report{s.reportCount === 1 ? "" : "s"}
              </span>
            </div>
          ))}
        </div>
      )}

      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".07em", textTransform: "uppercase", color: "var(--text-faint)", marginBottom: 10 }}>
        OPEN REPORTS
      </div>

      {openQuery.isLoading ? (
        <LoadingSkeleton variant="card" count={2} />
      ) : openQuery.isError ? (
        <ErrorState title="Failed to load reports" description={errorMessage} onRetry={() => openQuery.refetch()} />
      ) : openReports.length === 0 ? (
        <EmptyState icon="✅" title="Nothing to review" description="No open reports right now." compact />
      ) : (
        openReports.map((report) => (
          <div key={report.id} style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 14, padding: "15px 18px", marginBottom: 8 }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--cyan-deep)", background: "var(--cyan-light)", borderRadius: 99, padding: "3px 9px", display: "inline-block", marginBottom: 6 }}>
                  {REASON_LABELS[report.reason] ?? report.reason}
                </div>
                <div style={{ fontSize: 13.5, fontWeight: 600, lineHeight: 1.4 }}>{report.itemSignal}</div>
                <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 4 }}>
                  {report.source} · {humanize(report.createdAt)}
                </div>
                {report.note && <div style={{ fontSize: 12.5, color: "#374151", marginTop: 6, fontStyle: "italic" }}>"{report.note}"</div>}
              </div>
              <button className="btn btn--sm" onClick={() => handleResolve(report)}>
                Resolve
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
