import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LoadingSkeleton } from "../components/LoadingSkeleton";
import { EmptyState } from "../components/EmptyState";
import { captureItem, getRecentCaptures, logEvent } from "../lib/api";
import type { CaptureMode, CapturedItem } from "../lib/types";

const MODES: CaptureMode[] = ["Link", "Note", "Voice", "Photo"];

export function Capture() {
  const queryClient = useQueryClient();
  const [input, setInput] = useState("");
  const [activeMode, setActiveMode] = useState<CaptureMode>("Link");
  const [saving, setSaving] = useState(false);
  const [justCaptured, setJustCaptured] = useState<CapturedItem | null>(null);
  const [captureError, setCaptureError] = useState<string | null>(null);

  const recentQuery = useQuery({ queryKey: ["capture", "recent"], queryFn: getRecentCaptures });
  const recentCaptures = recentQuery.data ?? [];

  const handleCapture = async () => {
    if (!input.trim() || saving) return;
    setSaving(true);
    setCaptureError(null);
    try {
      const item = await captureItem(activeMode, input.trim());
      logEvent("CaptureCreated", { metadata: { mode: activeMode } });
      setJustCaptured(item);
      setInput("");
      queryClient.invalidateQueries({ queryKey: ["capture", "recent"] });
    } catch (err) {
      setCaptureError(err instanceof Error ? err.message : "Could not save your capture.");
    }
    setSaving(false);
  };

  return (
    <div className="r-page">
      <div className="r-page-head">
        <h1 className="r-page-title">Capture</h1>
        <p className="r-page-sub">
          Anything you save gets the same treatment as everything else in Radar — a signal headline, why it matters,
          and a route into your roadmap.
        </p>
      </div>

      <div style={{ background: "#fff", border: "1.5px solid rgba(20,24,31,.12)", borderRadius: 16, padding: 16, marginBottom: 22 }}>
        <input
          type="text"
          placeholder="Paste a link, or start typing a note…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          style={{ width: "100%", fontSize: 14.5, padding: "12px 4px", border: "none", outline: "none", fontFamily: "inherit" }}
        />
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", borderTop: "1px solid rgba(20,24,31,.08)", paddingTop: 12 }}>
          {MODES.map((mode) => {
            const isActive = activeMode === mode;
            return (
              <button
                key={mode}
                style={{
                  fontSize: 12.5,
                  fontWeight: 700,
                  padding: "9px 15px",
                  borderRadius: 99,
                  border: "none",
                  cursor: "pointer",
                  background: isActive ? "#e7f5f4" : "#f6f8f9",
                  color: isActive ? "#046b70" : "#12161d",
                }}
                onClick={() => setActiveMode(mode)}
              >
                {mode}
              </button>
            );
          })}
          <button
            style={{ marginLeft: "auto", fontSize: 12.5, fontWeight: 700, padding: "9px 18px", borderRadius: 99, background: "var(--cyan)", color: "#fff", border: "none", cursor: "pointer" }}
            onClick={handleCapture}
            disabled={!input.trim() || saving}
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      {captureError && (
        <div style={{ background: "#fdf3f2", border: "1px solid rgba(192,57,43,.15)", borderRadius: 12, padding: "14px 16px", marginBottom: 22, display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 16 }}>⚠️</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#c0392b" }}>Capture failed</div>
            <div style={{ fontSize: 12, color: "#8a4b44" }}>{captureError}</div>
          </div>
          <button style={{ fontSize: 12, fontWeight: 700, color: "var(--cyan-deep)", background: "none", border: "none", cursor: "pointer" }} onClick={() => setCaptureError(null)}>
            Dismiss
          </button>
        </div>
      )}

      {justCaptured && (
        <>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".07em", textTransform: "uppercase", color: "var(--cyan)", marginBottom: 11 }}>
            JUST CAPTURED
          </div>
          <div style={{ background: "#fff", border: "1px solid rgba(20,24,31,.1)", borderRadius: 16, padding: "20px 22px", marginBottom: 22 }}>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "clamp(1rem,1.8vw,1.14rem)", lineHeight: 1.38, marginBottom: 13 }}>
              {justCaptured.signal}
            </div>
            <div className="feed-section-label">WHY IT MATTERS</div>
            <div style={{ fontSize: 13.5, color: "#374151", lineHeight: 1.7, marginBottom: 13 }}>{justCaptured.whyItMatters}</div>
            <div className="feed-edge">
              <div className="feed-edge-label">YOUR EDGE</div>
              <div className="feed-edge-text">{justCaptured.aiSummary}</div>
            </div>
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap", alignItems: "center" }}>
              <a className="btn btn--primary btn--sm" href="/">
                Understand →
              </a>
              <span style={{ fontSize: 11.5, color: "var(--text-faint)", fontWeight: 600, marginLeft: "auto" }}>{justCaptured.source}</span>
            </div>
          </div>
        </>
      )}

      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".07em", textTransform: "uppercase", color: "var(--text-faint)", marginBottom: 11 }}>
        RECENT CAPTURES
      </div>
      {recentQuery.isLoading ? (
        <LoadingSkeleton variant="text" lines={3} />
      ) : recentCaptures.length === 0 ? (
        <EmptyState icon="📥" title="No captures yet" description="Paste a link or type a note above to get started." compact />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {recentCaptures.map((item) => (
            <div className="saved-item" key={item.id}>
              <span
                className="saved-item-kind"
                style={{ background: item.isProcessing ? "#f0f2f4" : "#e7f5f4", color: item.isProcessing ? "#8a91a0" : "#046b70" }}
              >
                {item.mode}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, lineHeight: 1.4 }}>{item.signal}</div>
                <div style={{ fontSize: 11.5, color: item.isProcessing ? "#00838a" : "#8a91a0", fontWeight: 600 }}>{item.source}</div>
              </div>
              <span style={{ color: "var(--text-faint)", flex: "none" }}>→</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
