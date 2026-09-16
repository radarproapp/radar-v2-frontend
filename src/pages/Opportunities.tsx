import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../auth/AuthContext";
import { LoadingSkeleton } from "../components/LoadingSkeleton";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { ApiError, getOpportunities, saveOpportunity, unsaveOpportunity } from "../lib/api";
import type { Opportunity, OpportunityType } from "../lib/types";

const TYPE_FILTERS: [string, OpportunityType][] = [
  ["Jobs", "Job"],
  ["Internships", "Internship"],
  ["Scholarships", "Scholarship"],
  ["Fellowships", "Fellowship"],
  ["Remote Jobs", "RemoteJob"],
  ["Grants", "ResearchGrant"],
];

function deadlineClass(days: number): string {
  if (days <= 7) return "opp-deadline--urgent";
  if (days <= 21) return "opp-deadline--warn";
  return "opp-deadline--safe";
}

export function Opportunities() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [activeType, setActiveType] = useState<OpportunityType | null>(null);

  const oppsQuery = useQuery({
    queryKey: ["opportunities", activeType],
    queryFn: () => getOpportunities(activeType),
  });

  const items = oppsQuery.data ?? [];
  const errorMessage = oppsQuery.error instanceof ApiError ? oppsQuery.error.message : "Could not load opportunities.";

  const toggleSave = async (opp: Opportunity) => {
    const queryKey = ["opportunities", activeType] as const;
    const nextSaved = !opp.isSaved;
    queryClient.setQueryData<Opportunity[]>(queryKey, (old) => old?.map((o) => (o.id === opp.id ? { ...o, isSaved: nextSaved } : o)));
    try {
      if (nextSaved) await saveOpportunity(opp.id);
      else await unsaveOpportunity(opp.id);
    } catch {
      queryClient.setQueryData<Opportunity[]>(queryKey, (old) => old?.map((o) => (o.id === opp.id ? { ...o, isSaved: !nextSaved } : o)));
    }
  };

  return (
    <div className="r-page">
      <div className="r-page-head">
        <h1 className="r-page-title">Opportunity Hub</h1>
        <p className="r-page-sub">Curated against your profile and goal. Every one includes what you have and what you are missing.</p>
      </div>

      <div className="opp-filters">
        <button className={`r-chip ${activeType === null ? "active" : ""}`} onClick={() => setActiveType(null)}>
          All
        </button>
        {TYPE_FILTERS.map(([label, type]) => (
          <button key={type} className={`r-chip ${activeType === type ? "active" : ""}`} onClick={() => setActiveType(type)}>
            {label}
          </button>
        ))}
      </div>

      {oppsQuery.isLoading ? (
        <LoadingSkeleton variant="feed" count={3} />
      ) : oppsQuery.isError ? (
        <ErrorState title="Failed to load opportunities" description={errorMessage} onRetry={() => oppsQuery.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState icon="🎯" title="No opportunities found" description="Try a different filter or check back tomorrow — Radar updates daily.">
          <button className="btn btn--sm" onClick={() => setActiveType(null)}>
            Show all
          </button>
        </EmptyState>
      ) : (
        items.map((opp) => (
          <div className="opp-card" key={opp.id}>
            <div className="opp-card-top">
              <span className="opp-type-badge">{opp.type}</span>
              <span className={`opp-deadline ${deadlineClass(opp.daysUntilDeadline)}`}>Deadline · {opp.daysUntilDeadline} days</span>
            </div>

            <div className="opp-title">{opp.title}</div>
            <div className="opp-org">{opp.organisation}</div>
            <div className="opp-desc">{opp.description}</div>

            {profile && (
              <div className="opp-match-section">
                <div className="opp-match-label">WHY RADAR MATCHED YOU</div>
                <div className="opp-match-row">Your goal · {profile.primaryGoal}</div>
                <div className="opp-match-row">Your interests · {profile.interests.slice(0, 2).join(" + ")}</div>
                <div className="opp-match-row">Your profile · {profile.persona}</div>
              </div>
            )}

            {opp.requirements.length > 0 && (
              <div className="opp-have-miss">
                <div>
                  <div className="opp-have-label">YOU HAVE</div>
                  {opp.requirements.slice(0, 3).map((req) => (
                    <div className="opp-have-item" key={req}>
                      {req}
                    </div>
                  ))}
                </div>
                <div>
                  <div className="opp-miss-label">MISSING</div>
                  <div className="opp-miss-item">Portfolio project</div>
                </div>
              </div>
            )}

            <div className="opp-actions">
              <div className="opp-match-bar">
                <div className="opp-match-bar-track">
                  <div className="opp-match-bar-fill" style={{ width: `${opp.matchScorePercent}%` }} />
                </div>
                <span className="opp-match-num">{opp.matchScorePercent}% match</span>
              </div>
              <a className="btn btn--primary btn--sm" href={opp.url} target="_blank" rel="noreferrer">
                Apply →
              </a>
              <button className="btn btn--sm" onClick={() => toggleSave(opp)}>
                {opp.isSaved ? "Saved ✓" : "Save"}
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
