import { useState, type FormEvent, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { getAdminActivity, getAdminQueue, getAdminReports, getAdminSources, getAdminSummary, getAdminTeam, getAdminUser, getAdminUsers, inviteAdmin, resolveAdminReport, revokeAdmin, type AdminReport, type AdminSummary, type AdminTeamMember } from "../lib/api";
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

/// <summary>The sidebar, without the two counts nothing produced.</summary>
///
/// Review Queue carried a hard-coded "12" and AI Quality a hard-coded red "3" - the second of
/// them sitting directly beside a panel explaining that AI quality is not measured. The badge
/// on Moderation is the only one with a number behind it, and it comes from the summary.
const navGroups = [
  { label: "Overview", items: [["overview", "Dashboard", "#008c93"], ["activity", "Activity", "#008c93"], ["engagement", "Engagement", "#008c93"]] },
  { label: "Content", items: [["queue", "Review Queue", "#008c93"], ["sources", "Sources", "#008c93"], ["quality", "AI Quality", "#c0392b"]] },
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
            {group.items.map(([id, label, color]) => {
              // Only ever a real count. Moderation is the one section with a number behind it,
              // and it comes from the summary endpoint.
              const count = id === "moderation" ? summaryQuery.data?.openReports : undefined;
              return (
                <button key={id} className={`admin-side__item ${section === id ? "active" : ""}`} onClick={() => go(id as AdminSection)}>
                  <span className="admin-side__bar" style={{ background: color }} /><span>{label}</span>{!!count && <span className="admin-side__count admin-side__count--warn">{count}</span>}
                </button>
              );
            })}
          </div>
        ))}
        {/* The footer said "Admin User · Super Admin · Full access to all features" whoever was
            signed in, so a Platform Admin was told they held the higher role - above two
            "Preview as" buttons that did nothing. The role is the one the server granted. */}
        <div className="admin-side__footer">
          <div className="admin-side__footer-label">Signed in as</div>
          <span className={`admin-side__role-badge ${summaryQuery.data?.role === "SuperAdmin" ? "admin-side__role-badge--super" : ""}`}>
            {summaryQuery.data?.role === "SuperAdmin" ? "Super Admin" : summaryQuery.data?.role === "PlatformAdmin" ? "Platform Admin" : "…"}
          </span>
          <div className="admin-side__footer-note">
            {summaryQuery.data?.role === "SuperAdmin"
              ? "Super Admins also see the commercial and institutional layer."
              : summaryQuery.data?.role === "PlatformAdmin"
                ? "Platform Admins run the product. Some sections are Super Admin only."
                : ""}
          </div>
        </div>
      </aside>
      <div className="r-admin-main">
        {/* The header search box was never wired to anything. Users has a real search field; a
            second one that silently does nothing is worse than no search at all. */}
        <header className="admin-header"><button className="admin-header__burger" onClick={() => setSidebarOpen(!sidebarOpen)}><Icon name="menu" /></button><div className="admin-header__title"><div>{meta.title}</div><div className="admin-header__sub">{meta.sub}</div></div><div className="admin-header__avatar">R</div></header>
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

/// <summary>The source register, with what each source has actually filed.</summary>
///
/// Three things on this screen were not measurements. "Items in Radar" read a seed constant -
/// eighteen, twelve, twenty-four, typed by hand when the sources were first listed and never
/// updated since - and summed those constants into a total; it is now counted from the corpus.
/// "Needs attention" was the literal string "0". And every row ended in a green "Active",
/// because the endpoint returned the literal true: nothing in Radar records a fetch, a failure
/// or a cooldown, so that column could not have had anything behind it.
function LiveSources() {
  const query = useQuery({ queryKey: ["admin", "sources"], queryFn: getAdminSources });
  const sources = query.data ?? [];
  const filedNothing = sources.filter((source) => source.itemsInRadar === 0).length;

  return (
    <div className="r-admin-page">
      <Kpis values={[
        ["Registered sources", query.isError ? "—" : String(sources.length)],
        ["Items in Radar", query.isError ? "—" : String(sources.reduce((sum, source) => sum + source.itemsInRadar, 0))],
        // A registered source with nothing in the corpus is the one thing this screen can
        // honestly flag, and it is the question "needs attention" was pretending to answer.
        ["Filed nothing yet", query.isError ? "—" : String(filedNothing)],
      ]} />
      <div className="admin-card">
        <div className="admin-card__header"><div className="admin-card__title">Source register</div></div>
        {query.isError && <div className="admin-empty-state">Could not load the source register.</div>}
        {!query.isError && !query.data && <div className="admin-empty-state">Loading sources…</div>}
        {sources.map((source) => (
          <div className="admin-table-row" key={source.id}>
            <div style={{ flex: 2.4, minWidth: 0 }}>
              <div style={{ fontSize: 12.5, fontWeight: 700 }}>{source.name}</div>
              <div style={{ fontSize: 11, color: "#8a91a0" }}>{source.domain}</div>
            </div>
            <div style={{ flex: 1 }}><span className="admin-tag admin-tag--tier1">{source.type || "Source"}</span></div>
            <div style={{ flex: 1, fontSize: 11.5, color: "#535c6b" }}>{source.publishFrequency || "—"}</div>
            <div style={{ flex: 1, textAlign: "right", fontSize: 11.5, color: source.itemsInRadar === 0 ? "#b7791a" : "#535c6b" }}>
              {source.itemsInRadar} item{source.itemsInRadar === 1 ? "" : "s"}
            </div>
          </div>
        ))}
      </div>
      <p className="admin-note">
        Whether a source is reachable right now is not recorded anywhere — no fetch, failure or
        cooldown is stored — so this register reports what each source has filed and nothing about
        its health.
      </p>
    </div>
  );
}

function LiveUsers() {
  const query = useQuery({ queryKey: ["admin", "users"], queryFn: getAdminUsers });
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const users = (query.data ?? []).filter((user) => `${user.name} ${user.email} ${user.persona} ${user.region}`.toLowerCase().includes(search.toLowerCase()));

  // The row the admin asked for, not the first one in the list. Every row used to be a button
  // with no handler, and the panel beside it always showed users[0] - so the detail endpoint,
  // the one genuinely privacy-sensitive capability here, had no caller at all and its audit log
  // line could never have been written.
  const selectedId = openId && users.some((user) => user.id === openId) ? openId : users[0]?.id ?? null;

  return (
    <div className="r-admin-page">
      <Kpis values={[["Users", String(query.data?.length ?? "—")], ["Onboarding done", query.data ? `${Math.round(query.data.filter((user) => user.onboardingComplete).length / Math.max(query.data.length, 1) * 100)}%` : "—"], ["Avg roadmap", query.data ? `${Math.round(query.data.reduce((sum, user) => sum + user.roadmapProgressPercent, 0) / Math.max(query.data.length, 1))}%` : "—"]]} />
      <div className="admin-split">
        <div className="admin-split__left">
          <div className="admin-card" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "14px 18px" }}><input className="admin-search" placeholder="Search by name, email or region…" value={search} onChange={(event) => setSearch(event.target.value)} /></div>
            {users.map((user) => (
              <button className="admin-user-row" key={user.id} type="button" onClick={() => setOpenId(user.id)} style={{ outline: user.id === selectedId ? "1.5px solid #008c93" : undefined }}>
                <div className="admin-user-row__avatar">{user.name?.[0] ?? "U"}</div>
                <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}><div style={{ fontSize: 12.5, fontWeight: 700 }}>{user.name || "Unnamed user"}</div><div style={{ fontSize: 11, color: "#8a91a0" }}>{user.persona} · {user.region || "No location"}</div></div>
                <span className={`admin-tag admin-tag--${user.onboardingComplete ? "tier1" : "pending"}`}>{user.onboardingComplete ? "Active" : "Onboarding"}</span>
              </button>
            ))}
            {query.data && users.length === 0 && <div className="admin-empty-state">No users match your search.</div>}
          </div>
        </div>
        <div className="admin-split__right">
          {selectedId ? <UserDetail id={selectedId} /> : <div className="admin-card">Choose someone to see what they told Radar.</div>}
        </div>
      </div>
    </div>
  );
}

/// <summary>One person: what they told Radar, and what they have done since.</summary>
///
/// Super Admin only and logged on the server, because this is one named person's reading
/// history rather than a total. A 403 says so plainly instead of rendering an empty profile,
/// which would read as an account that has done nothing.
function UserDetail({ id }: { id: string }) {
  const query = useQuery({ queryKey: ["admin", "user", id], queryFn: () => getAdminUser(id) });

  if (query.isError) return <div className="admin-card"><p className="admin-note">Could not open this person. The detail view is Super Admin only.</p></div>;
  if (!query.data) return <div className="admin-card"><p className="admin-note">Loading…</p></div>;

  const { profile, lastSeen, recent } = query.data;

  return (
    <div className="admin-card">
      <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
        <div className="admin-user-detail__avatar">{profile.name?.[0] ?? "U"}</div>
        <div><strong>{profile.name || "Unnamed user"}</strong><div style={{ fontSize: 11.5, color: "#8a91a0" }}>{profile.email}</div></div>
      </div>
      {([
        ["Category", profile.chosenCategory ? profile.persona : "Not chosen yet"],
        ["Personalised", profile.isPersonalised ? "Yes" : "Not yet"],
        ["Primary goal", profile.primaryGoal || "—"],
        ["Interests", profile.interests.length > 0 ? profile.interests.join(", ") : "—"],
        ["Joined", new Date(profile.createdAt).toLocaleDateString()],
        // Null rather than the sign-up date. An account that has never acted has no last-seen,
        // and putting its join date there would read as activity.
        ["Last seen", lastSeen ? new Date(lastSeen).toLocaleString() : "Has never done anything"],
      ] as [string, string][]).map(([label, value]) => (
        <div className="admin-user-detail__row" key={label}><span>{label}</span><span>{value}</span></div>
      ))}
      <div className="admin-card__title" style={{ marginTop: 14 }}>Recently</div>
      {recent.length === 0
        ? <p className="admin-note">No recorded activity.</p>
        : recent.slice(0, 15).map((event, index) => (
          <div className="admin-action-row" key={`${event.at}-${index}`}>
            <span className="admin-tag admin-tag--pending">{event.type}</span>
            <span className="admin-action-row__label">{event.title ?? "—"}</span>
            <span className="admin-action-row__age">{ageOf(event.at)}</span>
          </div>
        ))}
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

/// <summary>The landing screen, and the one that was least true.</summary>
///
/// Four sections of this dashboard were replaced with NotMeasured for rendering invented
/// figures. This one was not, and it is what every admin sees first: five fabricated headlines
/// with fabricated ages, a published-versus-rejected bar chart drawn from a literal array, an
/// ingestion panel asserting "Last sync 12 min ago" and "arXiv RSS — Rate limited · 2h
/// cooldown", and a card claiming usage spikes forty minutes before lectures start - a
/// quantified behavioural finding nothing in Radar produced.
///
/// Everything here now comes from an endpoint. Where no endpoint can answer, the panel says so.
function Overview({ summary }: { summary?: AdminSummary }) {
  return (
    <div className="r-admin-page">
      <Banner label="What needs you today">
        {summary ? decisionLine(summary) : "Loading admin summary…"}
      </Banner>
      <Kpis values={[["Published content", String(summary?.publishedContent ?? "—")], ["Total users", String(summary?.users ?? "—")], ["Open reports", String(summary?.openReports ?? "—")], ["Admin role", summary?.role ?? "—"]]} />
      <div className="admin-split">
        <div className="admin-split__left">
          <NeedsADecision />
          <RecentActivity />
        </div>
        <div className="admin-split__right">
          <SourceFootprint />
        </div>
      </div>
    </div>
  );
}

/// Said in words rather than as a count, because "0 quality flags need attention" is the most
/// common state and reads like a broken widget.
function decisionLine(summary: AdminSummary) {
  if (summary.openReports === 0) return "No open reports. Nothing is waiting on you.";
  return `${summary.openReports} open report${summary.openReports === 1 ? "" : "s"} need attention`;
}

/// <summary>The real review queue, oldest first.</summary>
///
/// This was five invented headlines - "OpenAI releases new reasoning framework", "NVIDIA Q3
/// earnings" - with ages generated from the row index. The queue endpoint has always returned
/// the actual corpus, newest first; oldest first is what a queue means.
function NeedsADecision() {
  const query = useQuery({ queryKey: ["admin", "queue"], queryFn: getAdminQueue });
  const waiting = [...(query.data ?? [])]
    .sort((left, right) => +new Date(left.publishedAt) - +new Date(right.publishedAt))
    .slice(0, 5);

  return (
    <div className="admin-card">
      <div className="admin-card__header"><div className="admin-card__title">Needs a decision</div><span className="admin-card__meta">Oldest first</span></div>
      {query.isError && <p className="admin-note">Could not load the review queue.</p>}
      {!query.isError && !query.data && <p className="admin-note">Loading the queue…</p>}
      {query.data && waiting.length === 0 && <p className="admin-note">Nothing has been ingested yet, so there is nothing to review.</p>}
      {waiting.map((item) => (
        <div className="admin-action-row" key={item.id}>
          <span className={`admin-tag ${item.isEnriched ? "admin-tag--pending" : "admin-tag--review"}`}>{item.isEnriched ? "Review" : "Enrich"}</span>
          <span className="admin-action-row__label">{item.title || item.signal || "Untitled"}</span>
          <span className="admin-action-row__age">{ageOf(item.publishedAt)}</span>
        </div>
      ))}
    </div>
  );
}

/// How long ago, from the real timestamp. A future date says so rather than reading "-3h ago".
function ageOf(iso: string) {
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return "no date";

  const hours = Math.round((Date.now() - at.getTime()) / 3_600_000);
  if (hours < 0) return "dated ahead";
  if (hours < 1) return "under an hour";
  if (hours < 48) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

/// <summary>Events and people for the last seven days, counted.</summary>
///
/// This slot held a published-versus-rejected chart whose seven pairs of bars were a literal
/// array in the source. Radar records no rejection at all, so that chart could not have been
/// real; what it does record is every impression, open and save, which is what this plots.
function RecentActivity() {
  const query = useQuery({ queryKey: ["admin", "activity", 7], queryFn: () => getAdminActivity(7) });
  const byDay = query.data?.byDay ?? [];
  const tallest = Math.max(1, ...byDay.map((day) => day.events));

  return (
    <div className="admin-card">
      <div className="admin-card__header"><div className="admin-card__title">The last seven days</div><span className="admin-card__meta">Events, and the people behind them</span></div>
      {query.isError && <p className="admin-note">Could not load activity.</p>}
      {!query.isError && !query.data && <p className="admin-note">Counting…</p>}
      {query.data && byDay.length === 0 && <p className="admin-note">No events recorded in the last seven days.</p>}
      {byDay.length > 0 && (
        <>
          <div className="admin-pipeline-chart">
            {byDay.map((day) => (
              <div className="admin-pipeline-chart__col" key={day.day}>
                <div className="admin-pipeline-chart__bars">
                  <div className="admin-pipeline-chart__pub" style={{ height: Math.max(2, Math.round((day.events / tallest) * 60)) }} title={`${day.events} events`} />
                  <div className="admin-pipeline-chart__rej" style={{ height: Math.max(2, Math.round((day.people / tallest) * 60)) }} title={`${day.people} people`} />
                </div>
                <div className="admin-pipeline-chart__day">{new Date(day.day).toLocaleDateString(undefined, { weekday: "short" })}</div>
              </div>
            ))}
          </div>
          <div className="admin-pipeline-legend">
            <span><span className="admin-pipeline-legend__dot" style={{ background: "#008c93" }} />Events</span>
            <span><span className="admin-pipeline-legend__dot" style={{ background: "#e7f5f4" }} />People</span>
          </div>
        </>
      )}
    </div>
  );
}

/// <summary>Which sources take up the feed, counted from the corpus.</summary>
///
/// This was an "Ingestion health" panel with four named connectors, three of them claiming a
/// sync time and one claiming a rate-limit cooldown. Nothing in Radar records a fetch, a
/// failure or a cooldown, so none of that could be produced - and the last line says so rather
/// than leaving the absence to be noticed.
function SourceFootprint() {
  const query = useQuery({ queryKey: ["admin", "sources"], queryFn: getAdminSources });
  const biggest = [...(query.data ?? [])].sort((left, right) => right.itemsInRadar - left.itemsInRadar).slice(0, 6);

  return (
    <div className="admin-card">
      <div className="admin-kpi__label" style={{ marginBottom: 12 }}>Sources, by what they have filed</div>
      {query.isError && <p className="admin-note">Could not load the source register.</p>}
      {!query.isError && !query.data && <p className="admin-note">Counting…</p>}
      {query.data && biggest.length === 0 && <p className="admin-note">No sources registered.</p>}
      {biggest.map((source) => (
        <div className="admin-health-row" key={source.id}>
          <span className="admin-health-dot admin-health-dot--ok" />
          <div>
            <div className="admin-health-row__name">{source.name}</div>
            <div className="admin-health-row__note">{source.itemsInRadar} item{source.itemsInRadar === 1 ? "" : "s"} in Radar{source.publishFrequency ? ` · ${source.publishFrequency}` : ""}</div>
          </div>
        </div>
      ))}
      <p className="admin-note" style={{ marginTop: 12 }}>
        Fetch times, failures and cooldowns are not recorded anywhere, so this panel cannot report
        whether a source is reachable right now — only what it has filed.
      </p>
    </div>
  );
}


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
/// <summary>Who can get into the admin area, and the only screen that can change it.</summary>
///
/// This listed four named admins with email addresses and last-active times, written into the
/// page — Chidi, Blessing and Yusuf did not have accounts. There was no endpoint behind it, so
/// there was no way to answer "who can get in here", which is a question the owner of a product
/// has to be able to ask.
///
/// Access comes from two places and the screen keeps them apart, because they are not equally
/// removable. A row from the deployment configuration is the way back in if the grants are ever
/// wrong, so nothing here will touch it.
function Team() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ["admin", "team"], queryFn: getAdminTeam });

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"SuperAdmin" | "PlatformAdmin">("PlatformAdmin");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["admin", "team"] });

  const invite = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setDone(null);

    try {
      await inviteAdmin(email.trim(), role);
      // Says what will actually happen next. An invited person who is already signed in keeps
      // the token they have until they sign in again, and without this they would try the admin
      // area, be turned away, and report it as broken.
      setDone(`Invitation sent to ${email.trim()}. They set a password on the link, which creates their admin account.`);
      setEmail("");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add that address.");
    } finally {
      setBusy(false);
    }
  };

  const revoke = async (member: AdminTeamMember) => {
    setError(null);
    setDone(null);

    try {
      await revokeAdmin(member.email);
      setDone(`${member.email} no longer has admin access.`);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove that address.");
    }
  };

  return (
    <div className="r-admin-page">
      <Banner label="Two roles, one difference">Platform Admins run the product. Super Admins can also open one named person&apos;s activity, which is logged — and only they can change this list.</Banner>

      {/* Said before the attempt rather than after it. Inviting sends an email and will not
          grant access without one, so on a deployment with no email the form cannot work and
          the way in is the variables that still do. */}
      {query.data?.canInvite && !query.data.canEmail && (
        <div className="admin-card" style={{ borderColor: "#b7791a" }}>
          <div className="admin-card__title">Nobody can be invited from here</div>
          <p className="admin-note">
            No email is configured for this deployment, and the invitation is the email — it
            carries the link somebody sets their password on. Add people with{" "}
            <code>{query.data.configuredBy}</code> until email is set up.
          </p>
        </div>
      )}

      {/* A test key answers 201 and delivers nothing, so the invite would report success and
          arrive nowhere. The one state worse than a failure is a clean success that did not
          happen. */}
      {query.data?.canInvite && query.data.canEmail && query.data.emailIsSandboxed && (
        <div className="admin-card" style={{ borderColor: "#b7791a" }}>
          <div className="admin-card__title">Invites will not actually arrive</div>
          <p className="admin-note">
            The email sender is on a test key: it accepts every message and delivers none. Access
            will be granted and the invite will report success, but nobody will receive it — so
            tell them yourself until a live key is set.
          </p>
        </div>
      )}

      {query.data?.canInvite && query.data.canEmail && (
        <div className="admin-card">
          <div className="admin-card__header"><div className="admin-card__title">Add somebody</div></div>

          <form onSubmit={invite} style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <input
              className="admin-search"
              style={{ flex: "2 1 240px" }}
              placeholder="Their email address"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              aria-label="Email address"
              autoComplete="off"
            />
            <select
              className="admin-search"
              style={{ flex: "1 1 160px" }}
              value={role}
              onChange={(event) => setRole(event.target.value as "SuperAdmin" | "PlatformAdmin")}
              aria-label="Role"
            >
              <option value="PlatformAdmin">Platform Admin</option>
              <option value="SuperAdmin">Super Admin</option>
            </select>
            <button className="btn btn--accent" type="submit" disabled={busy || email.trim().length === 0}>
              {busy ? "Adding…" : "Add"}
            </button>
          </form>

          <p className="admin-note" style={{ marginTop: 10 }}>
            They get a link and choose their own password on it, which creates an admin account
            separate from any ordinary Radar account on the same address. Nothing is granted until
            that email is sent, so a typo fails here rather than becoming a row nobody ever uses.
          </p>
        </div>
      )}

      {error && <div className="admin-card" style={{ borderColor: "#c0392b" }}><p className="admin-note" style={{ color: "#c0392b" }}>{error}</p></div>}
      {done && <div className="admin-card"><p className="admin-note">{done}</p></div>}

      <div className="admin-card">
        <div className="admin-card__header"><div className="admin-card__title">Who can sign in</div><span className="admin-card__meta">{query.data ? `${query.data.team.length} with access` : ""}</span></div>

        {query.isError && <p className="admin-note">Could not read the admin list.</p>}
        {!query.isError && !query.data && <p className="admin-note">Reading the list…</p>}

        {query.data?.team.length === 0 && (
          // Said in words. An empty list and a failed read look identical otherwise, and this is
          // the state a fresh deployment genuinely starts in.
          <p className="admin-note">
            Nobody has admin access in this deployment — including, in a moment, you.
          </p>
        )}

        {query.data?.team.map((member) => (
          <div className="admin-table-row" key={member.email}>
            <div style={{ flex: 2.4, minWidth: 0 }}>
              <div style={{ fontSize: 12.5, fontWeight: 700 }}>{member.email}</div>
              <div style={{ fontSize: 11, color: "#8a91a0" }}>
                {member.fromConfiguration
                  ? "From the deployment configuration"
                  : member.grantedByEmail
                    ? `Added by ${member.grantedByEmail}${member.grantedAt ? ` on ${new Date(member.grantedAt).toLocaleDateString()}` : ""}`
                    : "Added from this screen"}
                {/* Three different states, not two. An invitation waiting to be opened is
                    access handed out and not taken up; an address with neither an account nor a
                    live invitation is one whose link expired or was never sent. */}
                {!member.hasAccount && (member.invitePending ? " · invited, not set up yet" : " · no admin account yet")}
              </div>
            </div>
            <div style={{ flex: 1, textAlign: "right" }}>
              <span className={`admin-side__role-badge ${member.role === "SuperAdmin" ? "admin-side__role-badge--super" : ""}`}>
                {member.role === "SuperAdmin" ? "Super Admin" : "Platform Admin"}
              </span>
            </div>
            <div style={{ flex: "0 0 110px", textAlign: "right" }}>
              {query.data?.canInvite && member.canRevoke && (
                <button className="btn btn--danger-outline btn--sm" onClick={() => revoke(member)}>Remove</button>
              )}
              {/* Why a row has no button, rather than just an absence somebody has to interpret. */}
              {query.data?.canInvite && !member.canRevoke && (
                <span style={{ fontSize: 11, color: "#8a91a0" }}>
                  {member.fromConfiguration ? "Set by deploy" : "You"}
                </span>
              )}
            </div>
          </div>
        ))}

        {query.data && (
          <p className="admin-note" style={{ marginTop: 14 }}>
            Removing somebody takes effect within about thirty seconds, not at their next sign-in —
            an admin token already in use stops working. Rows marked <em>set by deploy</em> come
            from <code>{query.data.configuredBy}</code> and cannot be removed here on purpose:
            they are the way back in if this list is ever wrong.
          </p>
        )}
      </div>
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
