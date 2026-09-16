import { useAuth } from "../auth/AuthContext";
import { LoadingSkeleton } from "../components/LoadingSkeleton";
import { humanize } from "../lib/date";

export function GrowthTracker() {
  const { profile, isLoading } = useAuth();
  const stats = profile?.stats;

  return (
    <div className="r-page" style={{ maxWidth: 780 }}>
      <div className="r-page-head">
        <h1 className="r-page-title">Growth Tracker</h1>
        <p className="r-page-sub">Your learning journey, quantified.</p>
      </div>

      {isLoading || !stats ? (
        <LoadingSkeleton variant="stats" />
      ) : (
        <>
          <div style={{ background: "var(--navy)", borderRadius: 16, padding: "20px 22px", color: "#fff", marginBottom: 20 }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".09em", textTransform: "uppercase", color: "var(--cyan-bright)", marginBottom: 10 }}>
              LEARNING STREAK
            </div>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "2.4rem", lineHeight: 1, color: "var(--cyan-bright)", marginBottom: 4 }}>
              {stats.learningStreakDays}-day
            </div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,.6)" }}>Keep going — consistency compounds.</div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 10, marginBottom: 24 }}>
            <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 14, padding: "18px 20px" }}>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.8rem", color: "var(--cyan-deep)", lineHeight: 1, marginBottom: 4 }}>
                {stats.roadmapProgressPercent}%
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600 }}>Roadmap complete</div>
              <div style={{ height: 5, background: "var(--bg-hover)", borderRadius: 99, marginTop: 8, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${stats.roadmapProgressPercent}%`, background: "var(--cyan)", borderRadius: 99 }} />
              </div>
            </div>
            <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 14, padding: "18px 20px" }}>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.8rem", color: "var(--cyan-deep)", lineHeight: 1, marginBottom: 4 }}>
                {stats.lessonsCompleted}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600 }}>Lessons completed</div>
            </div>
            <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 14, padding: "18px 20px" }}>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.8rem", color: "var(--cyan-deep)", lineHeight: 1, marginBottom: 4 }}>
                {stats.articlesRead}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600 }}>Articles read</div>
            </div>
            <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 14, padding: "18px 20px" }}>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.8rem", color: "var(--cyan-deep)", lineHeight: 1, marginBottom: 4 }}>
                {stats.podcastsFinished}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600 }}>Podcasts finished</div>
            </div>
            <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 14, padding: "18px 20px" }}>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.8rem", color: "var(--cyan-deep)", lineHeight: 1, marginBottom: 4 }}>
                {stats.videosWatched}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600 }}>Videos watched</div>
            </div>
            <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 14, padding: "18px 20px" }}>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.8rem", color: "var(--cyan-deep)", lineHeight: 1, marginBottom: 4 }}>
                {stats.researchPapersRead}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600 }}>Papers read</div>
            </div>
            <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 14, padding: "18px 20px" }}>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.8rem", color: "var(--cyan-deep)", lineHeight: 1, marginBottom: 4 }}>
                {stats.projectsCompleted}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600 }}>Projects completed</div>
            </div>
            <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 14, padding: "18px 20px" }}>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.8rem", color: "var(--cyan-deep)", lineHeight: 1, marginBottom: 4 }}>
                {stats.savedResourcesCount}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600 }}>Resources saved</div>
            </div>
            <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 14, padding: "18px 20px" }}>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.8rem", color: "var(--cyan-deep)", lineHeight: 1, marginBottom: 4 }}>
                {stats.opportunitiesApplied}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600 }}>Opportunities explored</div>
            </div>
          </div>

          {stats.lastActivityDate && (
            <div style={{ fontSize: 12, color: "var(--text-faint)", textAlign: "center" }}>Last activity: {humanize(stats.lastActivityDate)}</div>
          )}
        </>
      )}
    </div>
  );
}
