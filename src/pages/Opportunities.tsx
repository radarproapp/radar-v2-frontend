import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { LoadingSkeleton } from "../components/LoadingSkeleton";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import {
  getDailyOpportunities,
  getOpportunities,
  getOpportunityPipeline,
  updateOpportunityStatus,
  toggleOpportunityReminder,
  logEvent,
  markOpportunityApplied,
} from "../lib/api";
import type { Opportunity, OpportunityType, OpportunityTrackingStatus } from "../lib/types";

const TYPE_FILTERS: { label: string; value: OpportunityType | "All" }[] = [
  { label: "All Types", value: "All" },
  { label: "Jobs", value: "Job" },
  { label: "Internships", value: "Internship" },
  { label: "Fellowships", value: "Fellowship" },
  { label: "Scholarships", value: "Scholarship" },
  { label: "Grants & Funding", value: "ResearchGrant" },
  { label: "Competitions & CTFs", value: "Competition" },
  { label: "Conferences", value: "Conference" },
  { label: "Accelerators", value: "StartupAccelerator" },
];

const REGION_FILTERS = [
  { label: "All Regions", value: "All" },
  { label: "🇳🇬 Nigeria", value: "Nigeria" },
  { label: "🇬🇭 Ghana", value: "Ghana" },
  { label: "🌍 Pan-Africa", value: "Africa" },
  { label: "🌐 Remote", value: "Remote" },
  { label: "Global", value: "Global" },
];

const URGENCY_FILTERS = [
  { label: "All Deadlines", value: "All" },
  { label: "🔴 3–7 Days Left (Urgent)", value: "urgent" },
  { label: "🟡 Within 2 Weeks", value: "2weeks" },
  { label: "🟢 Open / Recently Added", value: "open" },
];

const TIER_FILTERS = [
  { label: "All Match Scores", value: "All" },
  { label: "🟢 Strong Match (80–100%)", value: "StrongMatch" },
  { label: "🔵 Relevant (60–79%)", value: "Relevant" },
  { label: "🟣 Explore (40–59%)", value: "Explore" },
];

export function Opportunities() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Navigation / View modes
  const [viewMode, setViewMode] = useState<"daily" | "all" | "pipeline">("daily");
  const [activeTier, setActiveTier] = useState<string>("All");
  const [activeType, setActiveType] = useState<OpportunityType | "All">("All");
  const [activeRegion, setActiveRegion] = useState<string>("All");
  const [activeUrgency, setActiveUrgency] = useState<string>("All");
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Selected opportunity for the deep Intelligence Detail Drawer
  const [selectedOpp, setSelectedOpp] = useState<Opportunity | null>(null);

  // Queries
  const dailyQuery = useQuery({
    queryKey: ["opportunities", "daily"],
    queryFn: getDailyOpportunities,
    staleTime: 1000 * 60 * 15,
  });

  const allQuery = useQuery({
    queryKey: ["opportunities", "all", activeType, activeRegion, activeUrgency, activeTier],
    queryFn: () =>
      getOpportunities(activeType === "All" ? null : activeType, {
        region: activeRegion === "All" ? null : activeRegion,
        urgency: activeUrgency === "All" ? null : activeUrgency,
        matchTier: activeTier === "All" ? null : activeTier,
        page: 1,
        pageSize: 30,
      }),
    enabled: viewMode === "all",
  });

  const pipelineQuery = useQuery({
    queryKey: ["opportunities", "pipeline"],
    queryFn: getOpportunityPipeline,
    enabled: viewMode === "pipeline",
  });

  // Which filters are actually narrowing the list, so the collapsed bar can say so without
  // making the user expand it to find out.
  const activeFilterSummary = useMemo(() => {
    const labelFor = (list: { label: string; value: string }[], value: string) =>
      list.find((o) => o.value === value)?.label ?? value;
    const parts: string[] = [];
    if (activeTier !== "All") parts.push(labelFor(TIER_FILTERS, activeTier));
    if (activeType !== "All") parts.push(labelFor(TYPE_FILTERS as { label: string; value: string }[], activeType));
    if (activeRegion !== "All") parts.push(labelFor(REGION_FILTERS, activeRegion));
    if (activeUrgency !== "All") parts.push(labelFor(URGENCY_FILTERS, activeUrgency));
    return parts;
  }, [activeTier, activeType, activeRegion, activeUrgency]);

  const activeFilterCount = activeFilterSummary.length;

  const clearFilters = () => {
    setActiveTier("All");
    setActiveType("All");
    setActiveRegion("All");
    setActiveUrgency("All");
  };

  // Items resolution
  const items = useMemo(() => {
    if (viewMode === "daily") {
      let dailyItems = dailyQuery.data?.items ?? [];
      if (activeTier !== "All") {
        dailyItems = dailyItems.filter((i) => i.matchTier === activeTier);
      }
      if (activeType !== "All") {
        dailyItems = dailyItems.filter((i) => i.type === activeType);
      }
      if (activeRegion !== "All") {
        dailyItems = dailyItems.filter(
          (i) =>
            i.regionTag?.toLowerCase() === activeRegion.toLowerCase() ||
            i.location?.toLowerCase().includes(activeRegion.toLowerCase()) ||
            (activeRegion === "Remote" && i.isRemote),
        );
      }
      if (activeUrgency !== "All") {
        dailyItems = dailyItems.filter((i) => {
          if (activeUrgency === "urgent") return i.daysUntilDeadline <= 7;
          if (activeUrgency === "2weeks") return i.daysUntilDeadline > 7 && i.daysUntilDeadline <= 21;
          if (activeUrgency === "open") return i.daysUntilDeadline > 21;
          return true;
        });
      }
      return dailyItems;
    }
    if (viewMode === "pipeline") {
      return pipelineQuery.data ?? [];
    }
    return allQuery.data ?? [];
  }, [viewMode, dailyQuery.data, allQuery.data, pipelineQuery.data, activeTier, activeType, activeRegion, activeUrgency]);

  // Status updates
  const handleStatusChange = async (oppId: string, status: OpportunityTrackingStatus) => {
    logEvent("Open", { opportunityId: oppId });
    // Optimistic UI updates
    const updateInList = (list: Opportunity[]) =>
      list.map((o) => (o.id === oppId ? { ...o, userTrackingStatus: status, isSaved: status === "Saved" || status === "Interested" } : o));

    queryClient.setQueryData(["opportunities", "daily"], (old: any) =>
      old ? { ...old, items: updateInList(old.items) } : old,
    );
    queryClient.setQueryData(["opportunities", "pipeline"], (old: any) => (old ? updateInList(old) : old));

    if (selectedOpp && selectedOpp.id === oppId) {
      setSelectedOpp((prev) => (prev ? { ...prev, userTrackingStatus: status, isSaved: status === "Saved" || status === "Interested" } : null));
    }

    try {
      await updateOpportunityStatus(oppId, status);
    } catch {
      queryClient.invalidateQueries({ queryKey: ["opportunities"] });
    }
  };

  // Toggle Reminder
  const handleToggleReminder = async (opp: Opportunity) => {
    const nextVal = !opp.reminderSet;
    const updateInList = (list: Opportunity[]) =>
      list.map((o) => (o.id === opp.id ? { ...o, reminderSet: nextVal } : o));

    queryClient.setQueryData(["opportunities", "daily"], (old: any) =>
      old ? { ...old, items: updateInList(old.items) } : old,
    );
    if (selectedOpp && selectedOpp.id === opp.id) {
      setSelectedOpp((prev) => (prev ? { ...prev, reminderSet: nextVal } : null));
    }

    try {
      await toggleOpportunityReminder(opp.id, nextVal);
    } catch {
      queryClient.invalidateQueries({ queryKey: ["opportunities"] });
    }
  };

  // Direct AI Mentor Helper
  const openMentorForOpp = (opp: Opportunity) => {
    const prompt = `I am applying for "${opp.title}" at "${opp.organisation}".\n\nRequirements:\n${opp.requirements.join(
      ", ",
    )}\n\nBenefits: ${opp.benefits}\n\nHelp me prepare my application: 1) Tailor my CV to match their key requirements, 2) Draft a compelling 1-page personal statement, and 3) List interview questions I should prepare for.`;
    navigate(`/mentor?mode=chat&topic=${encodeURIComponent(opp.title)}&prompt=${encodeURIComponent(prompt)}`);
  };

  const isLoading =
    (viewMode === "daily" && dailyQuery.isLoading) ||
    (viewMode === "all" && allQuery.isLoading) ||
    (viewMode === "pipeline" && pipelineQuery.isLoading);

  const isError =
    (viewMode === "daily" && dailyQuery.isError) ||
    (viewMode === "all" && allQuery.isError) ||
    (viewMode === "pipeline" && pipelineQuery.isError);

  const dailyData = dailyQuery.data;

  return (
    <div className="r-page">
      {/* Page Header */}
      <div className="r-page-head">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(0,210,219,0.1)", color: "var(--cyan-deep)", padding: "4px 10px", borderRadius: 99, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
              <span>🎯</span> Opportunity Intelligence
            </div>
            <h1 className="r-page-title" style={{ margin: 0 }}>Radar Opportunity Hub</h1>
            <p className="r-page-sub" style={{ marginTop: 6, maxWidth: 640 }}>
              Curated daily against your goals and roadmap. Discover high-leverage jobs, fellowships, grants, and scholarships before deadlines pass.
            </p>
          </div>

          {/* View Mode Switcher */}
          <div style={{ display: "flex", background: "var(--canvas)", border: "1px solid var(--border)", padding: 4, borderRadius: 12, gap: 4 }}>
            <button
              className={`btn btn--sm ${viewMode === "daily" ? "btn--primary" : ""}`}
              style={{ borderRadius: 8, padding: "6px 14px" }}
              onClick={() => setViewMode("daily")}
            >
              📅 Today's Curated Batch (12)
            </button>
            <button
              className={`btn btn--sm ${viewMode === "all" ? "btn--primary" : ""}`}
              style={{ borderRadius: 8, padding: "6px 14px" }}
              onClick={() => setViewMode("all")}
            >
              🔎 Explore All
            </button>
            <button
              className={`btn btn--sm ${viewMode === "pipeline" ? "btn--primary" : ""}`}
              style={{ borderRadius: 8, padding: "6px 14px" }}
              onClick={() => setViewMode("pipeline")}
            >
              📋 My Pipeline
            </button>
          </div>
        </div>
      </div>

      {/* Hero Card: 12 New Opportunities for You Today */}
      {viewMode === "daily" && dailyData && (
        <div className="opp-daily-banner">
          <div className="opp-daily-tag">
            <span>⚡</span>
            <span>Personalized Batch · Refreshed Today</span>
          </div>
          <h2 className="opp-daily-title">{dailyData.message}</h2>
          {/* The focus is named only when there is one. It used to default to "Cybersecurity"
              on the server, so a new user was told Radar had matched against a focus they never
              chose; with that default removed the sentence would otherwise trail off into an
              empty bold tag. */}
          <p className="opp-daily-sub">
            {dailyData.primaryFocus ? (
              <>
                Radar matched these against your focus: <strong>{dailyData.primaryFocus}</strong>.{" "}
              </>
            ) : (
              <>Tell Radar what you are working on and it will match these against it. </>
            )}
            Every opportunity includes match confidence, practical advice, and next moves.
          </p>

          <div className="opp-daily-stats">
            <span className="opp-daily-stat-pill strong">
              <span>🟢</span>
              <span>{dailyData.tierCounts["StrongMatch"] || 0} Strong Matches (80–100%)</span>
            </span>
            <span className="opp-daily-stat-pill">
              <span>🔵</span>
              <span>{dailyData.tierCounts["Relevant"] || 0} Relevant Opportunities</span>
            </span>
            <span className="opp-daily-stat-pill">
              <span>🟣</span>
              <span>{dailyData.tierCounts["Explore"] || 0} Serendipitous Explore</span>
            </span>
            {dailyData.urgencyCounts["Urgent"] > 0 && (
              <span className="opp-daily-stat-pill urgent">
                <span>🔴</span>
                <span>{dailyData.urgencyCounts["Urgent"]} Closing in ≤ 7 Days</span>
              </span>
            )}
          </div>
        </div>
      )}

      {/* Filter Controls Bar — collapsed by default. Four rows of chips between the user and the
          opportunities was the single loudest "this is confusing" signal on this page, so the
          default state is now "show me the opportunities", not "configure a query first". */}
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14, padding: "12px 18px", marginBottom: 22, display: "flex", flexDirection: "column", gap: filtersOpen ? 12 : 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <button
            className={`r-chip ${activeFilterCount > 0 ? "active" : ""}`}
            style={{ fontSize: 12.5, fontWeight: 700 }}
            onClick={() => setFiltersOpen((open) => !open)}
            aria-expanded={filtersOpen}
          >
            Filters{activeFilterCount > 0 ? ` · ${activeFilterCount}` : ""} {filtersOpen ? "▲" : "▼"}
          </button>

          {!filtersOpen && activeFilterSummary.length > 0 && (
            <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600 }}>
              {activeFilterSummary.join(" · ")}
            </span>
          )}

          {activeFilterCount > 0 && (
            <button
              style={{ marginLeft: "auto", fontSize: 12, fontWeight: 700, color: "var(--cyan)", background: "none", border: "none", cursor: "pointer", padding: 0 }}
              onClick={clearFilters}
            >
              Clear all
            </button>
          )}
        </div>

        {filtersOpen && (
        <>
        {/* Match Tiers */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-faint)", width: 75 }}>
            Tier:
          </span>
          {TIER_FILTERS.map((t) => (
            <button
              key={t.value}
              className={`r-chip ${activeTier === t.value ? "active" : ""}`}
              style={{ fontSize: 12 }}
              onClick={() => setActiveTier(t.value)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Categories / Types */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-faint)", width: 75 }}>
            Type:
          </span>
          {TYPE_FILTERS.map((f) => (
            <button
              key={f.value}
              className={`r-chip ${activeType === f.value ? "active" : ""}`}
              style={{ fontSize: 12 }}
              onClick={() => setActiveType(f.value)}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Location & Deadlines */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, borderTop: "1px solid var(--border)", paddingTop: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-faint)", width: 75 }}>
              Region:
            </span>
            {REGION_FILTERS.map((r) => (
              <button
                key={r.value}
                className={`r-chip ${activeRegion === r.value ? "active" : ""}`}
                style={{ fontSize: 12 }}
                onClick={() => setActiveRegion(r.value)}
              >
                {r.label}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-faint)" }}>
              Deadline:
            </span>
            {URGENCY_FILTERS.map((u) => (
              <button
                key={u.value}
                className={`r-chip ${activeUrgency === u.value ? "active" : ""}`}
                style={{ fontSize: 12 }}
                onClick={() => setActiveUrgency(u.value)}
              >
                {u.label}
              </button>
            ))}
          </div>
        </div>
        </>
        )}
      </div>

      {/* Feed List */}
      {isLoading ? (
        <LoadingSkeleton variant="feed" count={4} />
      ) : isError ? (
        <ErrorState
          title="Could not load opportunities"
          description="Radar could not sync today's opportunity batch. Please try again."
          onRetry={() => {
            dailyQuery.refetch();
            allQuery.refetch();
          }}
        />
      ) : items.length === 0 ? (
        <EmptyState
          icon="🎯"
          title={viewMode === "pipeline" ? "No tracked opportunities in your pipeline" : "No opportunities match your filters"}
          description={
            viewMode === "pipeline"
              ? "As you save, mark interest, or apply to opportunities, they will appear in your pipeline tracker."
              : "Try adjusting your filter criteria to discover more opportunities across Africa and globally."
          }
        >
          {viewMode !== "daily" && (
            <button className="btn btn--primary btn--sm" onClick={() => setViewMode("daily")}>
              View Today's Batch
            </button>
          )}
        </EmptyState>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {items.map((opp) => {
            const tierClass =
              opp.matchTier === "StrongMatch"
                ? "opp-tier-pill--strong"
                : opp.matchTier === "Relevant"
                ? "opp-tier-pill--relevant"
                : "opp-tier-pill--explore";

            const urgencyClass =
              opp.daysUntilDeadline <= 7
                ? "opp-deadline--urgent"
                : opp.daysUntilDeadline <= 21
                ? "opp-deadline--warn"
                : "opp-deadline--safe";

            const urgencyText =
              opp.daysUntilDeadline <= 3
                ? `🔴 ${opp.daysUntilDeadline} days left`
                : opp.daysUntilDeadline <= 7
                ? `🔴 1 week left`
                : opp.daysUntilDeadline <= 21
                ? `🟡 2 weeks left`
                : `🟢 Open · ${opp.daysUntilDeadline}d`;

            return (
              <div
                className="opp-card"
                key={opp.id}
                style={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--border)",
                  borderRadius: 16,
                  padding: "20px 24px",
                  boxShadow: "var(--shadow-sm)",
                  position: "relative",
                  transition: "all var(--t-fast)",
                }}
              >
                {/* Card Top Header */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span className={`opp-tier-pill ${tierClass}`}>
                      <span>{opp.matchScorePercent}% Match</span>
                      <span>·</span>
                      <span>{opp.matchTier === "StrongMatch" ? "Strong Match" : opp.matchTier === "Relevant" ? "Relevant" : "Explore"}</span>
                    </span>

                    <span className="opp-type-badge">{opp.type}</span>

                    {opp.regionTag && (
                      <span style={{ fontSize: 11, fontWeight: 700, background: "var(--canvas)", color: "var(--text-muted)", padding: "3px 8px", borderRadius: 6, border: "1px solid var(--border)" }}>
                        {opp.regionTag}
                      </span>
                    )}

                    <span style={{ fontSize: 11, fontWeight: 700, color: "#10b981", background: "#ecfdf5", padding: "3px 8px", borderRadius: 6 }}>
                      {opp.status || "Open"}
                    </span>
                  </div>

                  {/* Deadline badge */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span className={`opp-deadline ${urgencyClass}`} style={{ fontSize: 12, fontWeight: 800 }}>
                      {urgencyText}
                    </span>
                    <button
                      className={`opp-reminder-btn ${opp.reminderSet ? "active" : ""}`}
                      onClick={() => handleToggleReminder(opp)}
                      title={opp.reminderSet ? "Reminder active" : "Set deadline reminder"}
                    >
                      {opp.reminderSet ? "🔔 Reminded" : "🔔 Remind"}
                    </button>
                  </div>
                </div>

                {/* Title & Organisation */}
                <h3 className="opp-title" style={{ fontSize: 17, marginBottom: 4 }}>
                  {opp.title}
                </h3>
                <div className="opp-org" style={{ fontSize: 13, marginBottom: 10 }}>
                  <span>{opp.organisation}</span>
                  {opp.location && <span> · 📍 {opp.location}</span>}
                  {opp.isRemote && <span> · 🌐 Remote Friendly</span>}
                </div>

                {/* Explanation: Why Radar Matched You */}
                {opp.whyItFits && (
                  <div className="opp-why-matched">
                    <div className="opp-why-matched-label">
                      <span>🎯</span>
                      <span>Why Radar Matched You</span>
                    </div>
                    <p className="opp-why-matched-text">{opp.whyItFits}</p>
                  </div>
                )}

                {/* Description snippet */}
                <div className="opp-desc" style={{ marginBottom: 12 }}>
                  {opp.description}
                </div>

                {/* Metadata Pills: Benefits & Cost */}
                <div className="opp-meta-row">
                  {opp.benefits && (
                    <span className="opp-meta-pill benefit">
                      <span>🎁</span>
                      <span>{opp.benefits}</span>
                    </span>
                  )}
                  {opp.cost && (
                    <span className="opp-meta-pill cost">
                      <span>🏷️</span>
                      <span>{opp.cost}</span>
                    </span>
                  )}
                  {opp.deadline && (
                    <span className="opp-meta-pill">
                      <span>📅</span>
                      <span>Deadline: {new Date(opp.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                    </span>
                  )}
                </div>

                {/* Requirements Peek */}
                {opp.requirements.length > 0 && (
                  <div style={{ background: "var(--canvas)", padding: "10px 14px", borderRadius: 10, border: "1px solid var(--border)", marginBottom: 16 }}>
                    <div style={{ fontSize: 10.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-faint)", marginBottom: 6 }}>
                      Key Prerequisites
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {opp.requirements.slice(0, 3).map((r, i) => (
                        <span key={i} style={{ fontSize: 11.5, background: "var(--bg-card)", border: "1px solid var(--border)", padding: "3px 8px", borderRadius: 6, color: "var(--text-dim)" }}>
                          ✓ {r}
                        </span>
                      ))}
                      {opp.requirements.length > 3 && (
                        <span style={{ fontSize: 11.5, color: "var(--text-faint)", alignSelf: "center" }}>
                          +{opp.requirements.length - 3} more in detail
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Actions Row */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, borderTop: "1px solid var(--border)", paddingTop: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    {/* View Opportunity details button */}
                    <button
                      className="btn btn--secondary btn--sm"
                      onClick={() => setSelectedOpp(opp)}
                    >
                      View Details & Advice ↗
                    </button>

                    {/* Help Me Apply with AI Learning Mentor */}
                    <button
                      className="btn btn--sm"
                      style={{ background: "#f5f3ff", color: "#6d28d9", border: "1px solid #ddd6fe" }}
                      onClick={() => openMentorForOpp(opp)}
                      title="Draft statement, tailor CV, or prep with AI Mentor"
                    >
                      <span>💡</span> Help Me Apply
                    </button>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    {/* Status Tracking dropdown */}
                    <select
                      className={`opp-status-select ${
                        opp.userTrackingStatus === "Applied"
                          ? "applied"
                          : opp.userTrackingStatus === "Accepted"
                          ? "accepted"
                          : opp.userTrackingStatus === "Rejected"
                          ? "rejected"
                          : ""
                      }`}
                      value={opp.userTrackingStatus || "None"}
                      onChange={(e) => handleStatusChange(opp.id, e.target.value as OpportunityTrackingStatus)}
                    >
                      <option value="None">Pipeline: None</option>
                      <option value="Saved">🔖 Save for later</option>
                      <option value="Interested">💡 Interested</option>
                      <option value="Applied">📤 Applied</option>
                      <option value="Accepted">🟢 Accepted!</option>
                      <option value="Rejected">🔴 Rejected</option>
                      <option value="NotRelevant">❌ Not relevant</option>
                    </select>

                    {/* Official Apply Link */}
                    {opp.url && /^https?:\/\//i.test(opp.url) ? (
                      <a
                        className="btn btn--primary btn--sm"
                        href={opp.url}
                        target="_blank"
                        rel="noreferrer"
                        onClick={() => {
                          logEvent("Open", { opportunityId: opp.id });
                          markOpportunityApplied(opp.id);
                          handleStatusChange(opp.id, "Applied");
                        }}
                      >
                        Apply Now →
                      </a>
                    ) : (
                      <span className="btn btn--primary btn--sm" style={{ opacity: 0.5, cursor: "not-allowed" }}>
                        Apply Now →
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Deep Opportunity Intelligence Slide-Over / Modal */}
      {selectedOpp && (
        <div className="opp-drawer-overlay" onClick={() => setSelectedOpp(null)}>
          <div className="opp-drawer" onClick={(e) => e.stopPropagation()}>
            {/* Drawer Header */}
            <div className="opp-drawer-header">
              <div>
                <span className={`opp-tier-pill ${selectedOpp.matchTier === "StrongMatch" ? "opp-tier-pill--strong" : "opp-tier-pill--relevant"}`} style={{ marginBottom: 6 }}>
                  {selectedOpp.matchScorePercent}% Match · {selectedOpp.type}
                </span>
                <h2 style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 800, margin: 0, color: "var(--text)" }}>
                  {selectedOpp.title}
                </h2>
                <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>
                  {selectedOpp.organisation} · 📍 {selectedOpp.location || "Remote"}
                </div>
              </div>

              <button className="opp-drawer-close" onClick={() => setSelectedOpp(null)} aria-label="Close">
                ✕
              </button>
            </div>

            {/* Drawer Body */}
            <div className="opp-drawer-body">
              {/* Why It Matches You */}
              {selectedOpp.whyItFits && (
                <div className="opp-why-matched" style={{ margin: 0 }}>
                  <div className="opp-why-matched-label">
                    <span>🎯</span>
                    <span>Why Radar Matched You</span>
                  </div>
                  <p className="opp-why-matched-text">{selectedOpp.whyItFits}</p>
                </div>
              )}

              {/* What It Is */}
              <div>
                <h4 style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--cyan-deep)", marginBottom: 6 }}>
                  What It Is
                </h4>
                <p style={{ fontSize: 13.5, color: "var(--text-dim)", lineHeight: 1.65, margin: 0 }}>
                  {selectedOpp.description}
                </p>
              </div>

              {/* Benefits & Funding */}
              <div style={{ background: "#fefce8", border: "1px solid #fef08a", borderRadius: 12, padding: "14px 18px" }}>
                <h4 style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.07em", color: "#854d0e", marginBottom: 6 }}>
                  🎁 What You Get / Benefits
                </h4>
                <div style={{ fontSize: 13, color: "#713f12", fontWeight: 600 }}>
                  {selectedOpp.benefits || "Competitive stipend / grant / fully funded position"}
                </div>
                <div style={{ fontSize: 12, color: "#a16207", marginTop: 4 }}>
                  Cost: <strong>{selectedOpp.cost}</strong> · Status: <strong>{selectedOpp.status}</strong>
                </div>
              </div>

              {/* Key Requirements: You Have vs Missing */}
              <div>
                <h4 style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--text-faint)", marginBottom: 10 }}>
                  Prerequisites & Eligibility
                </h4>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {selectedOpp.requirements.map((r, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 13, color: "var(--text)" }}>
                      <span style={{ color: "var(--lime)", fontWeight: 800 }}>✓</span>
                      <span>{r}</span>
                    </div>
                  ))}
                  {selectedOpp.whoIsEligible?.map((e, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 12.5, color: "var(--text-muted)" }}>
                      <span style={{ color: "var(--cyan)" }}>ℹ</span>
                      <span>Target applicant: {e}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Radar's Advice: How to Get Ahead */}
              <div className="opp-advice-box">
                <div className="opp-advice-title">
                  <span>💡</span>
                  <span>Radar's Advice · How to Get Ahead</span>
                </div>
                <ol className="opp-advice-list">
                  {selectedOpp.radarsAdvice?.map((adv, i) => (
                    <li key={i}>{adv}</li>
                  ))}
                </ol>
              </div>

              {/* "What Should I Do?" Action Timeline */}
              <div>
                <h4 style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--text-faint)", marginBottom: 10 }}>
                  What Should I Do Next? (Action Path)
                </h4>
                <div className="opp-timeline-steps">
                  {selectedOpp.nextMoveSteps?.map((step, i) => (
                    <div key={i} className="opp-timeline-step">
                      <span className="opp-timeline-step-num">{i + 1}</span>
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Selection Process */}
              {selectedOpp.selectionProcess && (
                <div style={{ background: "var(--canvas)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 14px" }}>
                  <span style={{ fontSize: 10.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-faint)", display: "block", marginBottom: 4 }}>
                    Selection Process
                  </span>
                  <span style={{ fontSize: 12.5, color: "var(--text-dim)" }}>
                    {selectedOpp.selectionProcess}
                  </span>
                </div>
              )}
            </div>

            {/* Drawer Footer Actions */}
            <div className="opp-drawer-footer">
              <button
                className="btn btn--sm"
                style={{ background: "#f5f3ff", color: "#6d28d9", border: "1px solid #ddd6fe", fontWeight: 700 }}
                onClick={() => openMentorForOpp(selectedOpp)}
              >
                <span>💡</span> Prepare Application with AI Mentor
              </button>

              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <select
                  className="opp-status-select"
                  value={selectedOpp.userTrackingStatus || "None"}
                  onChange={(e) => handleStatusChange(selectedOpp.id, e.target.value as OpportunityTrackingStatus)}
                >
                  <option value="None">Pipeline: None</option>
                  <option value="Saved">🔖 Save for later</option>
                  <option value="Interested">💡 Interested</option>
                  <option value="Applied">📤 Applied</option>
                  <option value="Accepted">🟢 Accepted!</option>
                  <option value="Rejected">🔴 Rejected</option>
                  <option value="NotRelevant">❌ Not relevant</option>
                </select>

                {selectedOpp.url && /^https?:\/\//i.test(selectedOpp.url) ? (
                  <a
                    className="btn btn--primary btn--sm"
                    href={selectedOpp.url}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => {
                      logEvent("Open", { opportunityId: selectedOpp.id });
                      markOpportunityApplied(selectedOpp.id);
                      handleStatusChange(selectedOpp.id, "Applied");
                    }}
                  >
                    Official Portal →
                  </a>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
