import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { LoadingSkeleton } from "../components/LoadingSkeleton";
import { ErrorState } from "../components/ErrorState";
import { ApiError, getComparison } from "../lib/api";

export function Compare() {
  const { comparisonId = "cmp1" } = useParams<{ comparisonId: string }>();
  const query = useQuery({ queryKey: ["comparison", comparisonId], queryFn: () => getComparison(comparisonId) });

  const comparison = query.data;
  const errorMessage = query.error instanceof ApiError ? query.error.message : "Could not load comparison.";

  return (
    <div className="r-page" style={{ maxWidth: 820 }}>
      {query.isError ? (
        <ErrorState title="Failed to load comparison" description={errorMessage} onRetry={() => query.refetch()} />
      ) : !comparison ? (
        <LoadingSkeleton variant="card" count={2} />
      ) : (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
            <div style={{ flex: 1 }}>
              <div className="r-kicker">SIDE BY SIDE</div>
              <h1 className="r-page-title">{comparison.title}</h1>
            </div>
            <button className="btn btn--tonal btn--sm">Save</button>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
            {comparison.items.map((item) => (
              <div
                key={item}
                style={{ display: "flex", alignItems: "center", gap: 8, background: "#fff", border: "1.5px solid rgba(20,24,31,.12)", borderRadius: 99, padding: "7px 8px 7px 14px" }}
              >
                <span style={{ fontSize: 12.5, fontWeight: 700 }}>{item}</span>
                <span style={{ fontSize: 14, color: "var(--text-faint)", cursor: "pointer" }}>×</span>
              </div>
            ))}
            <button className="btn btn--sm" style={{ background: "#f0f2f4", borderColor: "transparent" }}>
              + Add a third
            </button>
          </div>

          <div style={{ background: "var(--navy)", borderRadius: 16, padding: "20px 22px", color: "#fff", marginBottom: 14 }}>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "clamp(1.02rem,1.9vw,1.18rem)", lineHeight: 1.4, marginBottom: 13 }}>
              {comparison.summary}
            </div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--cyan-bright)", marginBottom: 6 }}>
              WHY IT MATTERS
            </div>
            <div style={{ fontSize: 13.5, color: "rgba(255,255,255,.78)", lineHeight: 1.75 }}>{comparison.whyItMatters}</div>
          </div>

          {comparison.aiEdge && (
            <div style={{ background: "var(--cyan-light)", borderRadius: 14, padding: "17px 19px", marginBottom: 20 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--cyan-deep)", marginBottom: 6 }}>
                YOUR EDGE
              </div>
              <div style={{ fontSize: 13, color: "#0d3d40", lineHeight: 1.7 }}>{comparison.aiEdge}</div>
            </div>
          )}

          {comparison.rows.map((row, i) => (
            <div key={i} style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 9 }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--text-faint)" }}>{row.label}</div>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: ".05em",
                    textTransform: "uppercase",
                    padding: "3px 9px",
                    borderRadius: 99,
                    color: row.tag === "Differs" ? "#c0392b" : row.tag === "Same" ? "#046b70" : "#8a91a0",
                    background: row.tag === "Differs" ? "#fdf3f2" : row.tag === "Same" ? "#e7f5f4" : "#f0f2f4",
                  }}
                >
                  {row.tag === "Differs" ? "Differs" : row.tag === "Same" ? "Same" : "Context"}
                </span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div style={{ background: "#fff", border: "1px solid rgba(20,24,31,.1)", borderRadius: 14, padding: "15px 17px" }}>
                  <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".05em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 7 }}>
                    {row.labelA ?? comparison.items[0] ?? "A"}
                  </div>
                  <div style={{ fontSize: 13.5, color: "#374151", lineHeight: 1.65 }}>{row.valueA}</div>
                </div>
                <div style={{ background: "#fff", border: "1px solid rgba(20,24,31,.1)", borderRadius: 14, padding: "15px 17px" }}>
                  <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".05em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 7 }}>
                    {row.labelB ?? comparison.items[1] ?? "B"}
                  </div>
                  <div style={{ fontSize: 13.5, color: "#374151", lineHeight: 1.65 }}>{row.valueB}</div>
                </div>
              </div>
            </div>
          ))}

          {comparison.disclaimer && <div style={{ fontSize: 12, color: "var(--text-faint)", lineHeight: 1.65, marginTop: 8 }}>{comparison.disclaimer}</div>}
        </>
      )}
    </div>
  );
}
