import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ApiError, getTodaysClips, logEvent, saveClip } from "../lib/api";
import type { Clip } from "../lib/types";

export function Clips() {
  const clipsQuery = useQuery({ queryKey: ["clips", "today"], queryFn: getTodaysClips });
  const [currentIndex, setCurrentIndex] = useState(0);
  const clips = clipsQuery.data ?? [];

  const next = () => setCurrentIndex((i) => (i < clips.length - 1 ? i + 1 : 0));
  const prev = () => setCurrentIndex((i) => (i > 0 ? i - 1 : clips.length - 1));

  const saveCurrent = async (clip: Clip) => {
    logEvent("ClipSaved", { clipId: clip.id, contentItemId: clip.contentItemId ?? undefined });
    await saveClip(clip.id);
  };

  const errorMessage = clipsQuery.error instanceof ApiError ? clipsQuery.error.message : "Could not load clips.";

  return (
    <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", background: "var(--navy)" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: "14px clamp(18px,4vw,40px)",
          flex: "none",
          position: "sticky",
          top: 0,
          zIndex: 5,
          background: "var(--navy)",
        }}
      >
        <Link to="/" style={{ fontSize: 18, color: "#fff" }}>
          ←
        </Link>
        <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 15, flex: 1, color: "#fff" }}>Clips</span>
        {clips.length > 0 && (
          <span style={{ fontSize: 11.5, fontWeight: 600, color: "rgba(255,255,255,.5)" }}>
            {currentIndex + 1} / {clips.length}
          </span>
        )}
      </div>

      {clipsQuery.isLoading ? (
        <div style={{ flex: 1, width: "100%", maxWidth: 480, margin: "0 auto", padding: "0 clamp(14px,3vw,20px) 20px", display: "flex", flexDirection: "column" }}>
          <div
            style={{
              position: "relative",
              flex: 1,
              minHeight: 520,
              borderRadius: 20,
              overflow: "hidden",
              background: "linear-gradient(160deg,#1e2530 0%,#0d1b1d 100%)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              padding: "0 26px",
            }}
          >
            <div style={{ height: 14, width: 80, background: "rgba(0,194,203,.2)", borderRadius: 4, marginBottom: 20, animation: "r-clip-pulse 1.5s infinite" }} />
            <div style={{ height: 28, width: "90%", background: "rgba(255,255,255,.1)", borderRadius: 6, marginBottom: 20, animation: "r-clip-pulse 1.5s infinite .2s" }} />
            <div style={{ height: 14, width: 110, background: "rgba(255,255,255,.06)", borderRadius: 4, marginBottom: 12, animation: "r-clip-pulse 1.5s infinite .4s" }} />
            <div style={{ height: 16, width: "100%", background: "rgba(255,255,255,.06)", borderRadius: 4, marginBottom: 8, animation: "r-clip-pulse 1.5s infinite .6s" }} />
            <div style={{ height: 16, width: "75%", background: "rgba(255,255,255,.06)", borderRadius: 4, animation: "r-clip-pulse 1.5s infinite .8s" }} />
          </div>
          <style>{"@keyframes r-clip-pulse { 0%,100% { opacity: .4 } 50% { opacity: 1 } }"}</style>
        </div>
      ) : clipsQuery.isError ? (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 40 }}>
          <div style={{ textAlign: "center", maxWidth: 300 }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>⚠️</div>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 16, color: "#fff", marginBottom: 8 }}>Failed to load clips</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,.5)", marginBottom: 16 }}>{errorMessage}</div>
            <button
              className="btn"
              style={{ background: "var(--cyan-bright)", color: "#0d2b2d", borderColor: "transparent" }}
              onClick={() => clipsQuery.refetch()}
            >
              Try again
            </button>
          </div>
        </div>
      ) : clips.length === 0 ? (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 40 }}>
          <div style={{ textAlign: "center", maxWidth: 300 }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🎬</div>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 16, color: "#fff", marginBottom: 8 }}>No clips today</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,.5)", marginBottom: 16 }}>
              Radar is preparing your daily signals. Check back tomorrow.
            </div>
            <Link
              to="/"
              style={{ fontSize: 12.5, fontWeight: 700, background: "var(--cyan-bright)", color: "#0d2b2d", padding: "10px 16px", borderRadius: 8, textDecoration: "none" }}
            >
              Go to Today
            </Link>
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, width: "100%", maxWidth: 480, margin: "0 auto", padding: "0 clamp(14px,3vw,20px) 20px", display: "flex", flexDirection: "column" }}>
          <div
            style={{
              position: "relative",
              flex: 1,
              minHeight: 520,
              borderRadius: 20,
              overflow: "hidden",
              background: "linear-gradient(160deg,#1e2530 0%,#0d1b1d 100%)",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, display: "flex", gap: 3, padding: "11px 13px 0" }}>
              {clips.map((_, i) => (
                <div
                  key={i}
                  style={{ flex: 1, height: 2.5, borderRadius: 2, background: i <= currentIndex ? "var(--cyan-bright)" : "rgba(255,255,255,.18)" }}
                />
              ))}
            </div>

            <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 26px" }}>
              <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--cyan-bright)", marginBottom: 15 }}>
                {clips[currentIndex].tag}
              </div>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "clamp(1.3rem,4.5vw,1.55rem)", lineHeight: 1.32, marginBottom: 15, color: "#fff" }}>
                {clips[currentIndex].signal}
              </div>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "rgba(255,255,255,.4)", marginBottom: 7 }}>
                Why it matters
              </div>
              <div style={{ fontSize: 14, color: "rgba(255,255,255,.72)", lineHeight: 1.7 }}>{clips[currentIndex].whyItMatters}</div>
            </div>

            <div style={{ position: "relative", padding: "20px 26px 24px", background: "linear-gradient(180deg,rgba(18,22,29,0),rgba(18,22,29,.85))" }}>
              <div style={{ fontSize: 11.5, color: "rgba(255,255,255,.5)", fontWeight: 600, marginBottom: 15 }}>{clips[currentIndex].source}</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Link to="/" style={{ fontSize: 12.5, fontWeight: 700, background: "var(--cyan-bright)", color: "#0d2b2d", padding: "10px 16px", borderRadius: 8 }}>
                  Understand →
                </Link>
                <button
                  className="btn"
                  style={{ background: "rgba(255,255,255,.12)", color: "#fff", borderColor: "transparent", fontSize: 12.5, padding: "10px 16px" }}
                  onClick={() => saveCurrent(clips[currentIndex])}
                >
                  Save
                </button>
              </div>
            </div>

            <button style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: "32%", background: "none", border: "none", opacity: 0, cursor: "pointer" }} onClick={prev} />
            <button style={{ position: "absolute", top: 0, bottom: 0, right: 0, width: "32%", background: "none", border: "none", opacity: 0, cursor: "pointer" }} onClick={next} />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 14, flex: "none" }}>
            <button className="btn" style={{ borderColor: "rgba(255,255,255,.22)", color: "#fff", background: "none", fontSize: 13, padding: "12px 18px" }} onClick={prev}>
              Back
            </button>
            <button
              className="btn"
              style={{ flex: 1, background: "rgba(255,255,255,.12)", color: "#fff", borderColor: "transparent", fontSize: 13.5, padding: 12 }}
              onClick={next}
            >
              {currentIndex >= clips.length - 1 ? "Start over" : "Next clip →"}
            </button>
          </div>

          <div style={{ textAlign: "center", fontSize: 11.5, color: "rgba(255,255,255,.32)", marginTop: 12 }}>
            {currentIndex >= clips.length - 1 ? "That's all five. You're caught up." : "Five clips a day, each under a minute. Tap either side to move."}
          </div>
        </div>
      )}
    </div>
  );
}
