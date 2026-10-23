import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Icon } from "../components/Icon";
import type { IconName } from "../components/icon-map";
import { useAuth } from "../auth/AuthContext";
import {
  addTopicToActiveRoadmap,
  ApiError,
  generateLearningPathway,
  getActiveRoadmap,
  getAskCapabilities,
} from "../lib/api";
import { INTEREST_GROUPS } from "../lib/interests";
import type { GrowthRoadmap } from "../lib/types";

/// The way into Radar Learn: bring your own material, or pick a subject and build a path.
///
/// What this replaces was a wall — four stage cards, three tabs and a resource list, all rendered
/// before the user had said what they wanted to learn. The page answered a question nobody had
/// asked yet. This one asks it.
///
/// Two lanes, deliberately separate:
///   - Your own material: a document, a link, a recording. These route to Ask, which already owns
///     the upload, section-selection and link flows; a second copy here would be a second copy to
///     keep correct.
///   - A subject: becomes a section on your path, which the journey at /learn/path then walks
///     through.

interface Lane {
  id: "upload" | "link" | "record";
  icon: IconName;
  title: string;
  description: string;
  action: string;
}

const LANES: Lane[] = [
  {
    id: "upload",
    icon: "upload",
    title: "Upload a document",
    description: "A lecture handout, a past paper, a report. PDF, Word, Markdown, text or CSV.",
    action: "Choose a file",
  },
  {
    id: "link",
    icon: "link",
    title: "Paste a link",
    description: "An article, a documentation page, a report. Radar reads it and pulls out what matters.",
    action: "Paste a URL",
  },
  {
    id: "record",
    icon: "mic",
    title: "Record a lecture",
    description: "Record while it happens, then question the transcript afterwards.",
    action: "Start recording",
  },
];

/// Group names without the "Academic Programs · " prefix — meaningful in onboarding, where the
/// distinction is the whole point, but noise on a row of category chips.
function shortGroupName(name: string): string {
  return name.replace("Academic Programs · ", "");
}

export function LearnStart() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>(INTEREST_GROUPS[0][0]);
  const [added, setAdded] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const roadmapQuery = useQuery({ queryKey: ["roadmap", "active"], queryFn: getActiveRoadmap, retry: false });
  const capabilitiesQuery = useQuery({ queryKey: ["ask", "capabilities"], queryFn: getAskCapabilities });

  const roadmap = roadmapQuery.isSuccess ? roadmapQuery.data : undefined;
  const firstName = profile?.name?.trim()?.split(/\s+/)[0] ?? "";

  // Searching spans every group; browsing shows one. Someone who types "nursing" should not have
  // to know it lives under "Health & Medicine" before they can find it.
  const results = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (query) {
      const seen = new Set<string>();
      const flat: string[] = [];
      for (const [, subjects] of INTEREST_GROUPS) {
        for (const subject of subjects) {
          if (subject.toLowerCase().includes(query) && !seen.has(subject)) {
            seen.add(subject);
            flat.push(subject);
          }
        }
      }
      return flat;
    }

    return INTEREST_GROUPS.find(([name]) => name === category)?.[1] ?? [];
  }, [search, category]);

  /// Adding a subject needs a path to add it to. A first-time learner has none, so one is built
  /// from their profile first and the subject becomes a section on it.
  const addSubject = useMutation({
    mutationFn: async (subject: string) => {
      if (!roadmap) {
        const created = await generateLearningPathway();
        queryClient.setQueryData<GrowthRoadmap>(["roadmap", "active"], created);
      }
      await addTopicToActiveRoadmap(subject);
      return subject;
    },
    onSuccess: async (subject) => {
      setError(null);
      setAdded((current) => (current.includes(subject) ? current : [...current, subject]));
      await queryClient.invalidateQueries({ queryKey: ["roadmap", "active"] });
    },
    onError: (e) => {
      setError(e instanceof ApiError ? e.message : "Could not add that to your path.");
    },
  });

  // Ask already owns these flows; the mode rides in the URL so the right one is open on arrival
  // rather than making the user find it again.
  const openLane = (lane: Lane["id"]) => navigate(`/ask?mode=${lane}`);

  // Undefined while the probe is in flight — assume available rather than flashing a disabled
  // card at someone whose deployment is fine.
  const recordAvailable = capabilitiesQuery.data?.record !== false;

  return (
    <div className="r-page" style={{ maxWidth: 980 }}>
      {/* The question, asked plainly. */}
      <div style={{ padding: "8px 0 4px" }}>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(1.6rem, 4vw, 2.2rem)",
            fontWeight: 800,
            letterSpacing: "-0.02em",
            margin: 0,
          }}
        >
          {firstName ? `${firstName}, what do you want to master?` : "What do you want to master?"}
        </h1>
        <p style={{ fontSize: 14, color: "var(--text-muted)", marginTop: 8, lineHeight: 1.55, maxWidth: 620 }}>
          Bring something you are already working with, or pick a subject and Radar builds the path.
        </p>
      </div>

      {/* Continue, when there is something to continue. */}
      {roadmap && (
        <button className="learn-continue" onClick={() => navigate("/learn/path")}>
          <span className="learn-continue__icon">
            <Icon name="play" size={17} />
          </span>
          <span className="learn-continue__text">
            <span className="learn-continue__label">Continue your path</span>
            <span className="learn-continue__title">{roadmap.title || roadmap.interest}</span>
          </span>
          <span className="learn-continue__progress">{roadmap.progressPercent}%</span>
          <Icon name="next" size={16} />
        </button>
      )}

      {/* Lane one: your own material. */}
      <div className="learn-lanes">
        {LANES.map((lane) => {
          const disabled = lane.id === "record" && !recordAvailable;

          return (
            <button
              key={lane.id}
              className="learn-lane"
              onClick={() => openLane(lane.id)}
              disabled={disabled}
              title={
                disabled
                  ? "Recording needs a transcription key, which this deployment has not been given."
                  : undefined
              }
            >
              <span className="learn-lane__icon">
                <Icon name={lane.icon} size={19} />
              </span>
              <span className="learn-lane__title">{lane.title}</span>
              <span className="learn-lane__desc">{lane.description}</span>
              <span className="learn-lane__action">
                {disabled ? "Not available yet" : lane.action}
                {!disabled && <Icon name="next" size={12} />}
              </span>
            </button>
          );
        })}
      </div>

      {/* Lane two: pick a subject. */}
      <div style={{ marginTop: 34 }}>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 19, fontWeight: 800, margin: 0 }}>Explore</h2>
          <span style={{ fontSize: 12.5, color: "var(--text-muted)" }}>
            {roadmap
              ? "Anything you add becomes a section on your path."
              : "Your first pick builds the path, so it takes a few seconds."}
          </span>
        </div>

        <div className="learn-explore__search">
          <Icon name="search" size={15} />
          <input
            className="learn-explore__input"
            placeholder="Search subjects"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search subjects"
          />
          {search && (
            <button className="learn-explore__clear" onClick={() => setSearch("")} aria-label="Clear search">
              <Icon name="close" size={14} />
            </button>
          )}
        </div>

        {/* Chips are hidden while searching: search already spans every group, so leaving one
            highlighted would claim a filter that is not being applied. */}
        {!search.trim() && (
          <div className="learn-chips">
            {INTEREST_GROUPS.map(([name]) => (
              <button
                key={name}
                className={`learn-chip ${name === category ? "active" : ""}`}
                onClick={() => setCategory(name)}
                aria-pressed={name === category}
              >
                {shortGroupName(name)}
              </button>
            ))}
          </div>
        )}

        {error && (
          <div role="alert" className="learn-explore__error">
            {error}
          </div>
        )}

        {results.length === 0 ? (
          <p style={{ fontSize: 13.5, color: "var(--text-muted)", lineHeight: 1.55, marginTop: 18 }}>
            Nothing matches &ldquo;{search.trim()}&rdquo;. Try a shorter word, or clear the search to browse by
            category.
          </p>
        ) : (
          <div className="learn-subjects">
            {results.map((subject) => {
              const isAdded =
                added.includes(subject) ||
                (roadmap?.modules ?? []).some((m) => m.title.toLowerCase() === subject.toLowerCase());
              const busy = addSubject.isPending && addSubject.variables === subject;

              return (
                <div key={subject} className="learn-subject">
                  <span className="learn-subject__name">{subject}</span>
                  <button
                    className={`learn-subject__add ${isAdded ? "added" : ""}`}
                    onClick={() => addSubject.mutate(subject)}
                    disabled={isAdded || addSubject.isPending}
                  >
                    {isAdded ? (
                      <>
                        <Icon name="check" size={12} /> On your path
                      </>
                    ) : busy ? (
                      roadmap ? "Adding…" : "Building…"
                    ) : (
                      <>
                        <Icon name="add" size={12} /> Add
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {added.length > 0 && (
          <div className="learn-explore__done" aria-live="polite">
            <span>{added.length === 1 ? "1 subject added" : `${added.length} subjects added`}.</span>
            <button className="btn btn--primary btn--sm" onClick={() => navigate("/learn/path")}>
              Go to your path
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
