import { useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { getAdminQueue, getAdminReports, getAdminSources, getAdminSummary, getAdminUsers, resolveAdminReport, type AdminReport, type AdminSummary } from "../lib/api";
import { Icon } from "../components/Icon";
import { AdminActivitySection, AdminEngagementSection } from "../components/AdminInsights";

type AdminSection = "overview" | "activity" | "engagement" | "queue" | "sources" | "quality" | "users" | "institutions" | "growth" | "moderation" | "authoring" | "team";

const pageMeta: Record<AdminSection, { title: string; sub: string }> = {
  overview: { title: "Dashboard", sub: "Overview · last 7 days" },
  activity: { title: "Activity", sub: "Events and people, counted" },
  engagement: { title: "Engagement", sub: "What is being read, and from where" },
  queue: { title: "Review Queue", sub: "Content awaiting approval" },
  sources: { title: "Sources", sub: "Manage trusted sources" },
  quality: { title: "AI Quality", sub: "Accuracy and flags" },
  users: { title: "Users", sub: "Account management" },
  institutions: { title: "Institutions", sub: "Organisation accounts" },
  growth: { title: "Growth", sub: "Activation and retention" },
  moderation: { title: "Moderation", sub: "Reports and flags" },
  authoring: { title: "Learn Authoring", sub: "Modules and lessons" },
  team: { title: "Admin Team", sub: "Roles and permissions" },
};

const navGroups = [
  { label: "Overview", items: [["overview", "Dashboard", "#008c93"], ["activity", "Activity", "#008c93"], ["engagement", "Engagement", "#008c93"]] },
  { label: "Content", items: [["queue", "Review Queue", "#008c93", "12"], ["sources", "Sources", "#008c93"], ["quality", "AI Quality", "#c0392b", "3"]] },
  { label: "People", items: [["users", "Users", "#5b6bd9"], ["institutions", "Institutions", "#5b6bd9"]] },
  { label: "Growth", items: [["growth", "Growth", "#1f9d63"], ["moderation", "Moderation", "#b7791a"], ["authoring", "Learn Authoring", "#b7791a"]] },
  { label: "System", items: [["team", "Admin Team", "#535c6b"]] },
] as const;

// queueItems was here: five invented review-queue rows, used only by the deleted mock Queue
// section. LiveQueue reads the real ingestion queue.

export function AdminDashboard() {
  const { Page } = useParams<{ Page?: string }>();
  const navigate = useNavigate();
  const requested = (Page?.toLowerCase() || "overview") as AdminSection;
  const section: AdminSection = requested in pageMeta ? requested : "overview";
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const meta = pageMeta[section];
  const summaryQuery = useQuery({ queryKey: ["admin-summary"], queryFn: getAdminSummary });

  const go = (next: AdminSection) => {
    setSidebarOpen(false);
    navigate(next === "overview" ? "/admin" : `/admin/${next}`);
  };

  return (
    <div className="r-admin-shell">
      <aside className={`admin-side ${sidebarOpen ? "r-admin-side--open" : ""}`}>
        <div className="admin-side__brand"><div className="admin-side__mark">R</div><span className="admin-side__name">Radar</span><span className="admin-side__badge">Admin</span></div>
        <div className="admin-side__sub">Internal · all accounts</div>
        {navGroups.map((group) => (
          <div className="admin-side__group" key={group.label}>
            <div className="admin-side__group-title">{group.label}</div>
            {group.items.map(([id, label, color, count]) => (
              <button key={id} className={`admin-side__item ${section === id ? "active" : ""}`} onClick={() => go(id as AdminSection)}>
                <span className="admin-side__bar" style={{ background: color }} /><span>{label}</span>{count && <span className={`admin-side__count ${id === "quality" ? "admin-side__count--warn" : ""}`}>{count}</span>}
              </button>
            ))}
          </div>
        ))}
        <div className="admin-side__footer"><div className="admin-side__footer-label">Signed in as</div><div className="admin-side__footer-name">Admin User</div><span className="admin-side__role-badge admin-side__role-badge--super">Super Admin</span><div className="admin-side__footer-note">Full access to all features</div><div className="admin-side__preview-label">Preview as</div><div className="admin-side__preview-toggle"><button className="admin-side__preview-btn active">Super</button><button className="admin-side__preview-btn">Platform</button></div></div>
      </aside>
      <div className="r-admin-main">
        <header className="admin-header"><button className="admin-header__burger" onClick={() => setSidebarOpen(!sidebarOpen)}><Icon name="menu" /></button><div className="admin-header__title"><div>{meta.title}</div><div className="admin-header__sub">{meta.sub}</div></div><input className="admin-header__search" placeholder="Search users, sources, briefs…" /><div className="admin-header__avatar">R</div></header>
        <main className="r-admin-content">{renderSection(section, summaryQuery.data)}</main>
      </div>
    </div>
  );
}

function Kpis({ values }: { values: [string, string, string?][] }) {
  return <div className={`admin-kpi-grid ${values.length === 3 ? "admin-kpi-grid--3" : ""}`}>{values.map(([label, value, delta]) => <div className="admin-kpi" key={label}><div className="admin-kpi__label">{label}</div><div className="admin-kpi__value">{value}</div>{delta && <div className="admin-kpi__delta admin-kpi__delta--up">{delta}</div>}</div>)}</div>;
}

function Banner({ label, children }: { label: string; children: ReactNode }) { return <div className="admin-banner"><div className="admin-banner__label">{label}</div><div className="admin-banner__title">{children}</div></div>; }

function renderSection(section: AdminSection, summary?: AdminSummary) {
  if (section === "overview") return <Overview summary={summary} />;
  if (section === "activity") return <AdminActivitySection />;
  if (section === "engagement") return <AdminEngagementSection />;
  if (section === "queue") return <LiveQueue />;
  if (section === "sources") return <LiveSources />;
  if (section === "quality") return <Quality />;
  if (section === "users") return <LiveUsers />;
  if (section === "institutions") return <Institutions />;
  if (section === "growth") return <Growth />;
  if (section === "moderation") return <LiveModeration />;
  if (section === "authoring") return <Authoring />;
  return <Team />;
}

// Queue, Sources, Users and Moderation were here: four mock sections full of invented data,
// each a duplicate of a Live* component that reads the real endpoint. The comment called them
// "visual fallbacks for environments without the admin API", but nothing ever fell back to
// them - renderSection routes to the Live* versions unconditionally, and these were kept
// reachable only by a void statement suppressing the unused warning.
//
// Deleted, because a second implementation nobody can tell from the first is how invented
// figures survive: "47 active sources" and "0 open reports" read exactly like measurements.

function LiveQueue() {
  const queueQuery = useQuery({ queryKey: ["admin", "queue"], queryFn: getAdminQueue });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const items = queueQuery.data ?? [];
  const selected = items.find((item) => item.id === selectedId) ?? items[0];

  return <div className="r-admin-page">
    <div className="admin-card admin-queue-banner"><div><div style={{ fontSize: 13, fontWeight: 700 }}>Every brief is gated — nothing publishes without you.</div><div style={{ fontSize: 11.5, color: "#8a91a0" }}>{queueQuery.isLoading ? "Loading queue…" : `${items.length} recent items available for review`}</div></div><div className="admin-queue-filters"><span className="admin-chip active">All</span><span className="admin-chip">Articles</span><span className="admin-chip">Papers</span><span className="admin-chip">Videos</span></div></div>
    {queueQuery.isError ? <div className="admin-card">Could not load the review queue.</div> : <div className="admin-split"><div className="admin-split__left">{items.map((item) => <button className="admin-queue-item" key={item.id} onClick={() => setSelectedId(item.id)} style={{ textAlign: "left", width: "100%", border: selected?.id === item.id ? "1.5px solid #008c93" : undefined }}><div className="admin-queue-item__meta"><span className="admin-tag admin-tag--pending">Tier {item.credibilityTier || 3}</span><span className="admin-queue-item__source">{item.source || "Unknown source"} · {new Date(item.publishedAt).toLocaleDateString()}</span></div><div className="admin-queue-item__title">{item.title || item.signal}</div><div className="admin-queue-item__conf"><div className="admin-queue-item__conf-bar"><div style={{ width: `${item.isEnriched ? 92 : 68}%`, background: item.isEnriched ? "#008c93" : "#b7791a" }} /></div><span>{item.isEnriched ? "Enriched" : "Needs enrichment"}</span></div></button>)}</div><div className="admin-split__right">{selected ? <div className="admin-card admin-queue-detail"><div className="admin-queue-detail__label">Reviewing</div><div className="admin-queue-detail__title">{selected.title || selected.signal}</div><div className="admin-queue-detail__thesis"><div className="admin-queue-detail__thesis-label">Signal</div><p>{selected.signal || "No signal summary available."}</p></div><div className="admin-queue-detail__actions"><button className="btn btn--accent">Approve & publish</button><button className="btn btn--subtle">Edit</button><button className="btn btn--danger-outline">Reject</button></div></div> : <div className="admin-card">No content items available.</div>}</div></div>}
  </div>;
}

function LiveSources() {
  const query = useQuery({ queryKey: ["admin", "sources"], queryFn: getAdminSources });
  const sources = query.data ?? [];
  return <div className="r-admin-page"><Kpis values={[["Active sources", String(sources.filter((source) => source.active).length)], ["Items in Radar", String(sources.reduce((sum, source) => sum + source.itemsInRadar, 0))], ["Needs attention", query.isError ? "—" : "0"]]} /><div className="admin-card"><div className="admin-card__header"><div className="admin-card__title">Source register</div><button className="btn btn--accent">+ Add source</button></div>{query.isLoading ? <div className="admin-empty-state">Loading sources…</div> : sources.map((source) => <div className="admin-table-row" key={source.id}><div style={{ flex: 2.4, minWidth: 0 }}><div style={{ fontSize: 12.5, fontWeight: 700 }}>{source.name}</div><div style={{ fontSize: 11, color: "#8a91a0" }}>{source.domain} · {source.itemsInRadar} items</div></div><div style={{ flex: 1 }}><span className="admin-tag admin-tag--tier1">{source.type || "Source"}</span></div><div style={{ flex: 1, fontSize: 11.5, color: "#535c6b" }}>{source.publishFrequency || "—"}</div><div style={{ flex: 1, textAlign: "right", color: source.active ? "#008c93" : "#c0392b", fontSize: 11, fontWeight: 700 }}>{source.active ? "Active" : "Error"}</div></div>)}</div></div>;
}

/* function LiveUsers() {
  const query = useQuery({ queryKey: ["admin", "users"], queryFn: getAdminUsers });
  const [search, setSearch] = useState("");
  const users = (query.data ?? []).filter((user) => `${user.name} ${user.email} ${user.persona} ${user.region}`.toLowerCase().includes(search.toLowerCase()));
  const selected = users[0];
  return <div className="r-admin-page"><Kpis values={[["Users", String(query.data?.length ?? "—")], ["Onboarding done", query.data ? `${Math.round(query.data.filter((user) => user.onboardingComplete).length / Math.max(query.data.length, 1) * 100)}%` : "—"], ["Avg roadmap", query.data ? `${Math.round(query.data.reduce((sum, user) => sum + user.roadmapProgressPercent, 0) / Math.max(query.data.length, 1))}%` : "—"]]} /><div className="admin-split"><div className="admin-split__left"><div className="admin-card" style={{ padding: 0, overflow: "hidden" }}><div style={{ padding: "14px 18px" }}><input className="admin-search" placeholder="Search by name, email or region…" value={search} onChange={(event) => setSearch(event.target.value)} /></div>{users.map((user) => <button className="admin-user-row" key={user.id} onClick={() => undefined}><div className="admin-user-row__avatar">{user.name?.[0] ?? "U"}</div><div style={{ flex: 1, minWidth: 0, textAlign: "left" }}><div style={{ fontSize: 12.5, fontWeight: 700 }}>{user.name || "Unnamed user"}</div><div style={{ fontSize: 11, color: "#8a91a0" }}>{user.persona} · {user.region || "No location"}</div></div><span className={`admin-tag admin-tag--${user.onboardingComplete ? "tier1" : "pending"}`}>{user.onboardingComplete ? "Active" : "Onboarding"}</span></button>)}</div></div><div className="admin-split__right">{selected ? <div className="admin-card"><div style={{ display: "flex", gap: 12, marginBottom: 16 }}><div className="admin-user-detail__avatar">{selected.name?.[0] ?? "U"}</div><div><strong>{selected.name || "Unnamed user"}</strong><div style={{ fontSize: 11.5, color: "#8a91a0" }}>{selected.email}</div></div></div>{[["Persona", selected.persona], ["Region", selected.region || "—"], ["Goal", selected.goal || "—"], ["Roadmap", `${selected.roadmapProgressPercent}% complete"]].map(([label, value]) => <div className="admin-user-detail__row" key={label}><span>{label}</span><span>{value}</span></div>)}</div> : <div className="admin-card">No users match your search.</div>}</div></div></div>;
}

} */

function LiveUsers() {
  const query = useQuery({ queryKey: ["admin", "users"], queryFn: getAdminUsers });
  const [search, setSearch] = useState("");
  const users = (query.data ?? []).filter((user) => `${user.name} ${user.email} ${user.persona} ${user.region}`.toLowerCase().includes(search.toLowerCase()));
  const selected = users[0];

  return (
    <div className="r-admin-page">
      <Kpis values={[["Users", String(query.data?.length ?? "—")], ["Onboarding done", query.data ? `${Math.round(query.data.filter((user) => user.onboardingComplete).length / Math.max(query.data.length, 1) * 100)}%` : "—"], ["Avg roadmap", query.data ? `${Math.round(query.data.reduce((sum, user) => sum + user.roadmapProgressPercent, 0) / Math.max(query.data.length, 1))}%` : "—"]]} />
      <div className="admin-split">
        <div className="admin-split__left">
          <div className="admin-card" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "14px 18px" }}><input className="admin-search" placeholder="Search by name, email or region…" value={search} onChange={(event) => setSearch(event.target.value)} /></div>
            {users.map((user) => (
              <button className="admin-user-row" key={user.id} type="button">
                <div className="admin-user-row__avatar">{user.name?.[0] ?? "U"}</div>
                <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}><div style={{ fontSize: 12.5, fontWeight: 700 }}>{user.name || "Unnamed user"}</div><div style={{ fontSize: 11, color: "#8a91a0" }}>{user.persona} · {user.region || "No location"}</div></div>
                <span className={`admin-tag admin-tag--${user.onboardingComplete ? "tier1" : "pending"}`}>{user.onboardingComplete ? "Active" : "Onboarding"}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="admin-split__right">
          {selected ? <div className="admin-card"><div style={{ display: "flex", gap: 12, marginBottom: 16 }}><div className="admin-user-detail__avatar">{selected.name?.[0] ?? "U"}</div><div><strong>{selected.name || "Unnamed user"}</strong><div style={{ fontSize: 11.5, color: "#8a91a0" }}>{selected.email}</div></div></div>{[["Persona", selected.persona], ["Region", selected.region || "—"], ["Goal", selected.goal || "—"], ["Roadmap", `${selected.roadmapProgressPercent}% complete`]].map(([label, value]) => <div className="admin-user-detail__row" key={label}><span>{label}</span><span>{value}</span></div>)}</div> : <div className="admin-card">No users match your search.</div>}
        </div>
      </div>
    </div>
  );
}

function LiveModeration() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ["admin", "reports"], queryFn: getAdminReports });
  const resolve = async (report: AdminReport) => { await resolveAdminReport(report.id); await queryClient.invalidateQueries({ queryKey: ["admin", "reports"] }); await queryClient.invalidateQueries({ queryKey: ["admin-summary"] }); };
  const reports = query.data ?? [];
  return <div className="r-admin-page"><div className="admin-card"><strong>{reports.length} open report{reports.length === 1 ? "" : "s"}</strong><div style={{ fontSize: 11.5, color: "#8a91a0" }}>Resolve reports after reviewing the signal and source.</div></div>{reports.length === 0 ? <div className="admin-empty-state"><div className="admin-empty-state__icon"><Icon name="check" /></div><div className="admin-empty-state__title">Nothing to moderate.</div><p>All reports resolved.</p></div> : <div className="admin-card">{reports.map((report) => <div className="admin-flag-item" key={report.id}><div className="admin-flag-item__meta"><span className="admin-tag admin-tag--flag">{report.reason}</span><span style={{ fontSize: 11.5, color: "#8a91a0" }}>{report.source}</span></div><div className="admin-flag-item__title">{report.signal}</div>{report.note && <p className="admin-flag-item__desc">{report.note}</p>}<button className="btn btn--accent" onClick={() => resolve(report)}>Resolve report</button></div>)}</div>}
  </div>;
}

function Overview({ summary }: { summary?: AdminSummary }) {
  return <div className="r-admin-page"><Banner label="What needs you today">{summary ? `${summary.openReports} quality flags need attention` : "Loading admin summary…"}</Banner><Kpis values={[["Published content", String(summary?.publishedContent ?? "—")], ["Total users", String(summary?.users ?? "—")], ["Open reports", String(summary?.openReports ?? "—")], ["Admin role", summary?.role ?? "—"]]} /><div className="admin-split"><div className="admin-split__left"><div className="admin-card"><div className="admin-card__header"><div className="admin-card__title">Needs a decision</div><span className="admin-card__meta">Oldest first</span></div>{["OpenAI releases new reasoning framework", "World Bank Africa economic outlook 2026", "Conflicting sources on fintech regulation", "MIT OCW new ML course announcement", "NVIDIA Q3 earnings — AI infrastructure spend"].map((item, i) => <div className="admin-action-row" key={item}><span className={`admin-tag ${i === 2 ? "admin-tag--flag" : i === 4 ? "admin-tag--review" : "admin-tag--pending"}`}>{i === 2 ? "Flag" : i === 4 ? "Edit" : "Review"}</span><span className="admin-action-row__label">{item}</span><span className="admin-action-row__age">{i * 2 + 2}h ago</span></div>)}</div><Pipeline /></div><div className="admin-split__right"><Health /><div className="admin-insight-card"><div className="admin-insight-card__label">Worth knowing</div><p>Usage spikes 40 minutes before university lectures start. Scheduling briefs for 7:30 AM WAT catches the morning peak.</p></div></div></div></div>;
}

function Pipeline() { const bars = [[40, 8], [55, 12], [48, 6], [62, 15], [45, 10], [20, 4], [10, 2]]; return <div className="admin-card"><div className="admin-card__title" style={{ marginBottom: 13 }}>This week&apos;s pipeline</div><div className="admin-pipeline-chart">{bars.map(([pub, rej], i) => <div className="admin-pipeline-chart__col" key={i}><div className="admin-pipeline-chart__bars"><div className="admin-pipeline-chart__pub" style={{ height: pub }} /><div className="admin-pipeline-chart__rej" style={{ height: rej }} /></div><div className="admin-pipeline-chart__day">{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][i]}</div></div>)}</div><div className="admin-pipeline-legend"><span><span className="admin-pipeline-legend__dot" style={{ background: "#008c93" }} />Published</span><span><span className="admin-pipeline-legend__dot" style={{ background: "#e7f5f4" }} />Rejected</span></div></div>; }
function Health() { return <div className="admin-card"><div className="admin-kpi__label" style={{ marginBottom: 12 }}>Ingestion health</div>{[["OpenAlex connector", "Last sync 12 min ago", "ok"], ["Semantic Scholar", "Last sync 8 min ago", "ok"], ["arXiv RSS", "Rate limited · 2h cooldown", "warn"], ["PubMed", "Last sync 5 min ago", "ok"]].map(([name, note, status]) => <div className="admin-health-row" key={name}><span className={`admin-health-dot admin-health-dot--${status}`} /><div><div className="admin-health-row__name">{name}</div><div className="admin-health-row__note">{note}</div></div></div>)}<button className="btn btn--subtle admin-health-btn">System health →</button></div>; }



function Quality() {
  return (
    <div className="r-admin-page">
      <NotMeasured
        what="AI quality"
        instead="This showed an AI confidence of 91.3%, a resolution rate of 94% and three open flags, with trend arrows beside each. None of it was measured - the numbers were written into the page."
        needed={[
          "Every model call already records its feature, whether it succeeded and how long it took. Nothing reads those back.",
          "A confidence figure needs a judgement to compare against, which Radar does not collect.",
          "Open flags are real and already live under Moderation, counted from content reports.",
        ]}
      />
    </div>
  );
}

// Users() was here: a hard-coded list of five invented people under four invented metrics -
// "8,247 total users", "68% day-7 retention". It was already unreachable, because renderSection
// routes "users" to LiveUsers, which reads the real endpoint. Deleted rather than left as a
// second implementation nobody could tell from the first.

function Institutions() {
  return (
    <div className="r-admin-page">
      <div className="admin-scope-banner">Super Admins see all institutions. Platform Admins see only their assigned institutions.</div>
      <NotMeasured
        what="Institutions"
        instead="This listed the University of Lagos, Access Bank and TechnoServe with seat counts and renewal dates. There are no institution accounts in the database - the three were written into the page."
        needed={["An institution model, seats, and a link from a profile to the institution that pays for it. None of that exists yet."]}
      />
    </div>
  );
}

function Growth() {
  return (
    <div className="r-admin-page">
      <NotMeasured
        what="Growth"
        instead="This showed an activation funnel from 8,247 sign-ups down to 2,474 day-30 returns, and retention by persona. Every figure was written into the page."
        needed={[
          "Activity now counts real events and real people per day - see the Activity section, which reads them.",
          "Day-1 and day-7 return need a first-seen date per account to count from. Profiles carry CreatedAt, so this one is buildable now.",
          "Retention by persona needs the same, grouped by the category each person chose.",
        ]}
      />
    </div>
  );
}
function Authoring() {
  return (
    <div className="r-admin-page">
      <NotMeasured
        what="Learn authoring"
        instead="This listed five modules - Product Thinking, Customer Research, AI Fundamentals - with completion percentages. Radar does not author modules centrally: a learning path is generated for one learner from what they asked for, so there is no shared catalogue to list."
        needed={["Paths started and completed, and lessons finished, are real and stored per learner. A roll-up across accounts would be the honest version of this screen."]}
      />
    </div>
  );
}
function Team() {
  return (
    <div className="r-admin-page">
      <Banner label="Two roles, one difference">Platform Admins run the product. Super Admins also manage the commercial and institutional layer.</Banner>
      <NotMeasured
        what="The admin team"
        instead="This listed four named admins with email addresses and last-active times. They were written into the page - Chidi, Blessing and Yusuf do not have accounts."
        needed={["Roles are real: a profile carries User, PlatformAdmin or SuperAdmin. Listing the accounts that actually hold them needs one endpoint, and is the next thing worth building here."]}
      />
    </div>
  );
}

/// <summary>What a screen does not know, said plainly.</summary>
///
/// Four sections of this dashboard rendered invented figures with trend arrows beside them -
/// "AI confidence 91.3% +0.4%", "Day-7 retention 68% +3%" - which is a measurement claim made
/// from nothing, on the one screen whose entire purpose is to tell the owner the truth about
/// their product. A number on a dashboard gets quoted in a meeting.
///
/// Each one says what it used to claim, so nobody reading a screenshot from last week wonders
/// where the figures went, and what it would take to answer the question honestly.
function NotMeasured({ what, instead, needed }: { what: string; instead: string; needed: string[] }) {
  return (
    <div className="admin-card">
      <div className="admin-card__title">{what} is not measured yet</div>
      <p className="admin-note">{instead}</p>
      <div className="admin-card__title" style={{ marginTop: 14 }}>What it would take</div>
      {needed.map((line) => (
        <p className="admin-note" key={line}>{line}</p>
      ))}
    </div>
  );
}
