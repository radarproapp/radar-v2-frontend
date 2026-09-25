import { useState, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";

type AdminSection = "overview" | "queue" | "sources" | "quality" | "users" | "institutions" | "growth" | "moderation" | "authoring" | "team";

const pageMeta: Record<AdminSection, { title: string; sub: string }> = {
  overview: { title: "Dashboard", sub: "Overview · last 7 days" },
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
  { label: "Overview", items: [["overview", "Dashboard", "#008c93"]] },
  { label: "Content", items: [["queue", "Review Queue", "#008c93", "12"], ["sources", "Sources", "#008c93"], ["quality", "AI Quality", "#c0392b", "3"]] },
  { label: "People", items: [["users", "Users", "#5b6bd9"], ["institutions", "Institutions", "#5b6bd9"]] },
  { label: "Growth", items: [["growth", "Growth", "#1f9d63"], ["moderation", "Moderation", "#b7791a"], ["authoring", "Learn Authoring", "#b7791a"]] },
  { label: "System", items: [["team", "Admin Team", "#535c6b"]] },
] as const;

const queueItems = [
  ["Tier 1", "OpenAI Blog", "2h ago", "OpenAI releases new reasoning framework", 94, ""],
  ["Tier 1", "World Bank", "4h ago", "Africa economic outlook 2026", 91, ""],
  ["Tier 2", "Multiple", "5h ago", "Conflicting sources on fintech regulation in Nigeria", 72, "Conflicts"],
  ["Tier 1", "MIT OCW", "6h ago", "MIT releases new ML fundamentals course", 88, ""],
  ["Tier 3", "TechCrunch", "8h ago", "NVIDIA Q3 earnings — AI infrastructure spend", 85, "Tier 3"],
] as const;

export function AdminDashboard() {
  const { Page } = useParams<{ Page?: string }>();
  const navigate = useNavigate();
  const requested = (Page?.toLowerCase() || "overview") as AdminSection;
  const section: AdminSection = requested in pageMeta ? requested : "overview";
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const meta = pageMeta[section];

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
        <header className="admin-header"><button className="admin-header__burger" onClick={() => setSidebarOpen(!sidebarOpen)}>☰</button><div className="admin-header__title"><div>{meta.title}</div><div className="admin-header__sub">{meta.sub}</div></div><input className="admin-header__search" placeholder="Search users, sources, briefs…" /><div className="admin-header__avatar">R</div></header>
        <main className="r-admin-content">{renderSection(section)}</main>
      </div>
    </div>
  );
}

function Kpis({ values }: { values: [string, string, string?][] }) {
  return <div className={`admin-kpi-grid ${values.length === 3 ? "admin-kpi-grid--3" : ""}`}>{values.map(([label, value, delta]) => <div className="admin-kpi" key={label}><div className="admin-kpi__label">{label}</div><div className="admin-kpi__value">{value}</div>{delta && <div className="admin-kpi__delta admin-kpi__delta--up">{delta}</div>}</div>)}</div>;
}

function Banner({ label, children }: { label: string; children: ReactNode }) { return <div className="admin-banner"><div className="admin-banner__label">{label}</div><div className="admin-banner__title">{children}</div></div>; }

function renderSection(section: AdminSection) {
  if (section === "overview") return <Overview />;
  if (section === "queue") return <Queue />;
  if (section === "sources") return <Sources />;
  if (section === "quality") return <Quality />;
  if (section === "users") return <Users />;
  if (section === "institutions") return <Institutions />;
  if (section === "growth") return <Growth />;
  if (section === "moderation") return <Moderation />;
  if (section === "authoring") return <Authoring />;
  return <Team />;
}

function Overview() {
  return <div className="r-admin-page"><Banner label="What needs you today">12 briefs awaiting review, 3 quality flags need attention</Banner><Kpis values={[["Published today", "24", "+6 vs yesterday"], ["Active users", "3,847", "+12% this week"], ["Avg confidence", "91.3%", "+0.4%"], ["Open flags", "3", "+2 since Monday"]]} /><div className="admin-split"><div className="admin-split__left"><div className="admin-card"><div className="admin-card__header"><div className="admin-card__title">Needs a decision</div><span className="admin-card__meta">Oldest first</span></div>{["OpenAI releases new reasoning framework", "World Bank Africa economic outlook 2026", "Conflicting sources on fintech regulation", "MIT OCW new ML course announcement", "NVIDIA Q3 earnings — AI infrastructure spend"].map((item, i) => <div className="admin-action-row" key={item}><span className={`admin-tag ${i === 2 ? "admin-tag--flag" : i === 4 ? "admin-tag--review" : "admin-tag--pending"}`}>{i === 2 ? "Flag" : i === 4 ? "Edit" : "Review"}</span><span className="admin-action-row__label">{item}</span><span className="admin-action-row__age">{i * 2 + 2}h ago</span></div>)}</div><Pipeline /></div><div className="admin-split__right"><Health /><div className="admin-insight-card"><div className="admin-insight-card__label">Worth knowing</div><p>Usage spikes 40 minutes before university lectures start. Scheduling briefs for 7:30 AM WAT catches the morning peak.</p></div></div></div></div>;
}

function Pipeline() { const bars = [[40, 8], [55, 12], [48, 6], [62, 15], [45, 10], [20, 4], [10, 2]]; return <div className="admin-card"><div className="admin-card__title" style={{ marginBottom: 13 }}>This week&apos;s pipeline</div><div className="admin-pipeline-chart">{bars.map(([pub, rej], i) => <div className="admin-pipeline-chart__col" key={i}><div className="admin-pipeline-chart__bars"><div className="admin-pipeline-chart__pub" style={{ height: pub }} /><div className="admin-pipeline-chart__rej" style={{ height: rej }} /></div><div className="admin-pipeline-chart__day">{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][i]}</div></div>)}</div><div className="admin-pipeline-legend"><span><span className="admin-pipeline-legend__dot" style={{ background: "#008c93" }} />Published</span><span><span className="admin-pipeline-legend__dot" style={{ background: "#e7f5f4" }} />Rejected</span></div></div>; }
function Health() { return <div className="admin-card"><div className="admin-kpi__label" style={{ marginBottom: 12 }}>Ingestion health</div>{[["OpenAlex connector", "Last sync 12 min ago", "ok"], ["Semantic Scholar", "Last sync 8 min ago", "ok"], ["arXiv RSS", "Rate limited · 2h cooldown", "warn"], ["PubMed", "Last sync 5 min ago", "ok"]].map(([name, note, status]) => <div className="admin-health-row" key={name}><span className={`admin-health-dot admin-health-dot--${status}`} /><div><div className="admin-health-row__name">{name}</div><div className="admin-health-row__note">{note}</div></div></div>)}<button className="btn btn--subtle admin-health-btn">System health →</button></div>; }

function Queue() { return <div className="r-admin-page"><div className="admin-card admin-queue-banner"><div><div style={{ fontSize: 13, fontWeight: 700 }}>Every brief is gated — nothing publishes without you.</div><div style={{ fontSize: 11.5, color: "#8a91a0" }}>12 awaiting review · median turnaround 22 min · 87% approved this week</div></div><div className="admin-queue-filters">{["All", "Articles", "Papers", "Videos"].map((x, i) => <button className={`admin-chip ${i === 0 ? "active" : ""}`} key={x}>{x}</button>)}</div></div><div className="admin-split"><div className="admin-split__left">{queueItems.map(([tier, source, age, title, confidence, warn]) => <div className="admin-queue-item" key={title}><div className="admin-queue-item__meta"><span className="admin-tag admin-tag--pending">{tier}</span><span className="admin-queue-item__source">{source} · {age}</span>{warn && <span className="admin-tag admin-tag--flag">{warn}</span>}</div><div className="admin-queue-item__title">{title}</div><div className="admin-queue-item__conf"><div className="admin-queue-item__conf-bar"><div style={{ width: `${confidence}%`, background: confidence >= 85 ? "#008c93" : "#b7791a" }} /></div><span>{confidence}% confidence</span></div></div>)}</div><div className="admin-split__right"><div className="admin-card"><div className="admin-queue-detail__label">Reviewing</div><div className="admin-queue-detail__title">OpenAI releases new reasoning framework</div><div className="admin-queue-detail__thesis"><div className="admin-queue-detail__thesis-label">AI thesis</div><p>OpenAI&apos;s new reasoning model demonstrates significant improvements in multi-step logic, which could affect how product managers approach AI integration in their workflows.</p></div><div className="admin-queue-detail__checks">{["Source verified", "Relevance confirmed", "Duplicate check", "Bias check"].map((check, i) => <div className="admin-queue-detail__check" key={check}><span style={{ color: i === 2 ? "#b7791a" : "#008c93", fontWeight: 800 }}>{i === 2 ? "!" : "✓"}</span><div><div style={{ fontWeight: 700 }}>{check}</div><div style={{ color: "#8a91a0", fontSize: 11.5 }}>{i === 2 ? "Similar to brief #4521 (7 days ago)" : "Confirmed by review pipeline"}</div></div></div>)}</div><div className="admin-queue-detail__actions"><button className="btn btn--accent">Approve &amp; publish</button><button className="btn btn--subtle">Edit</button><button className="btn btn--danger-outline">Reject</button></div></div></div></div></div>; }

function Sources() { return <div className="r-admin-page"><Kpis values={[["Active sources", "47"], ["Tier 1 share", "62%"], ["Needs attention", "2"]]} /><div className="admin-card"><div className="admin-card__header"><div className="admin-card__title">Source register</div><button className="btn btn--accent">+ Add source</button></div>{[["OpenAI", "openai.com", "47", "Tier 1", "Daily", true], ["World Bank", "worldbank.org", "38", "Tier 1", "Weekly", true], ["MIT OCW", "ocw.mit.edu", "52", "Tier 1", "Daily", true], ["arXiv", "arxiv.org", "124", "Tier 2", "Hourly", true], ["TechCrunch", "techcrunch.com", "31", "Tier 3", "Daily", false]].map(([name, domain, briefs, tier, cadence, active]) => <div className="admin-table-row" key={`${name}`}><div style={{ flex: 2.4 }}><div style={{ fontSize: 12.5, fontWeight: 700 }}>{name}</div><div style={{ fontSize: 11, color: "#8a91a0" }}>{domain} · {briefs} briefs</div></div><div style={{ flex: 1 }}><span className={`admin-tag admin-tag--${tier === "Tier 1" ? "tier1" : tier === "Tier 2" ? "tier2" : "tier3"}`}>{tier}</span></div><div style={{ flex: 1, fontSize: 11.5, color: "#535c6b" }}>{cadence}</div><div style={{ flex: 1, textAlign: "right", color: active ? "#008c93" : "#c0392b", fontSize: 11, fontWeight: 700 }}>{active ? "Active" : "Error"}</div></div>)}</div><div className="admin-insight-card"><div className="admin-insight-card__label">How tiering works</div><p>Tier 1 is a primary institutional source publishing about itself — treated as authoritative. Tier 2 is corroborated before publish. Tier 3 is used for signal, never quoted as fact.</p></div></div>; }

function Quality() { return <div className="r-admin-page"><Kpis values={[["AI confidence", "91.3%", "+0.4%"], ["User corrections", "7", "+3 this week"], ["Resolution rate", "94%", "+2%"], ["Open flags", "3", "+2 since Monday"]]} /><Banner label="Pattern worth fixing">14% of flagged briefs cite “outdated data” — mostly from sources with &gt;24h publication lag.</Banner><div className="admin-card"><div className="admin-card__title">Open flags</div>{[["Medium", "Accuracy", "2 days", "Conflicting regulation dates", "Two briefs cite different effective dates for the same regulation."], ["Medium", "Staleness", "1 day", "Outdated economic data", "Brief references 2024 GDP figures when 2025 data is available."], ["Low", "Bias", "3 days", "Promotional language detected", "One brief contains language that reads like marketing copy."]].map(([severity, kind, age, title, detail]) => <div className="admin-flag-item" key={title}><div className="admin-flag-item__meta"><span className={`admin-tag admin-tag--${severity === "Low" ? "danger" : "flag"}`}>{severity}</span><span style={{ fontSize: 11.5, color: "#8a91a0" }}>{kind} · {age}</span></div><div className="admin-flag-item__title">{title}</div><p className="admin-flag-item__desc">{detail}</p><button className="btn btn--accent">Review issue</button></div>)}</div></div>; }

function Users() { return <div className="r-admin-page"><Kpis values={[["Total users", "8,247", "+142 this week"], ["Daily active", "3,847", "+12%"], ["Day-7 retention", "68%", "+3%"], ["Onboarding done", "91%", "+5%"]]} /><div className="admin-split"><div className="admin-split__left"><div className="admin-card" style={{ padding: 0, overflow: "hidden" }}><div style={{ padding: "14px 18px" }}><input className="admin-search" placeholder="Search by name, email or institution…" /></div>{[["Ada Nwosu", "Student · UNILAG · Lagos", "A", "Active"], ["David Okonkwo", "Engineer · Lagos", "D", "Active"], ["Chioma Eze", "Researcher · Abuja", "C", "Active"], ["Tunde Bakare", "Graduate · Ibadan", "T", "Inactive"], ["Emeka Obi", "Entrepreneur · PH", "E", "Suspended"]].map(([name, meta, initial, status]) => <div className="admin-user-row" key={name}><div className="admin-user-row__avatar">{initial}</div><div style={{ flex: 1 }}><div style={{ fontSize: 12.5, fontWeight: 700 }}>{name}</div><div style={{ fontSize: 11, color: "#8a91a0" }}>{meta}</div></div><span className={`admin-tag admin-tag--${status === "Active" ? "tier1" : status === "Suspended" ? "danger" : "pending"}`}>{status}</span></div>)}</div></div><div className="admin-split__right"><div className="admin-card"><div style={{ display: "flex", gap: 12, marginBottom: 16 }}><div className="admin-user-detail__avatar">A</div><div><strong>Ada Nwosu</strong><div style={{ fontSize: 11.5, color: "#8a91a0" }}>ada@unilag.edu.ng</div></div></div>{[["Persona", "Student"], ["Region", "Lagos, Nigeria"], ["Goal", "Get Internship"], ["Day streak", "18 days"], ["Saved", "34 resources"], ["Roadmap", "42% complete"]].map(([label, value]) => <div className="admin-user-detail__row" key={label}><span>{label}</span><span>{value}</span></div>)}<button className="btn btn--subtle" style={{ marginTop: 14 }}>View as user</button></div></div></div></div>; }

function Institutions() { return <div className="r-admin-page"><div className="admin-scope-banner">Super Admins see all institutions. Platform Admins see only their assigned institutions.</div><Kpis values={[["Total institutions", "14", "+2 this quarter"], ["Total seats", "24,800"], ["Seats used", "73%"]]} />{[["University of Lagos", "University · Enterprise · renews Mar 2027", 78, "2,400 / 3,000 seats", "Active across 6 faculties. 89% daily usage."], ["Access Bank", "Bank · Enterprise · renews Jan 2027", 65, "1,300 / 2,000 seats", "Rollout to risk and compliance teams complete."], ["TechnoServe Nigeria", "NGO · Standard · renews Sep 2026", 30, "45 / 150 seats", "Low adoption — engagement follow-up scheduled."]].map(([name, meta, pct, seats, note]) => <div className="admin-card" style={{ marginBottom: 10 }} key={name}><strong>{name}</strong><div style={{ fontSize: 11.5, color: "#8a91a0" }}>{meta}</div><div style={{ display: "flex", gap: 10, alignItems: "center", margin: "12px 0" }}><div style={{ flex: 1, height: 6, background: "#eef0f2", borderRadius: 3 }}><div style={{ width: `${pct}%`, height: "100%", background: "#008c93", borderRadius: 3 }} /></div><span style={{ fontSize: 11.5, fontWeight: 700 }}>{seats}</span></div><p style={{ fontSize: 12, color: "#535c6b" }}>{note}</p><button className="btn btn--subtle">Open dashboard</button></div>)}</div>; }

function Growth() { return <div className="r-admin-page"><Banner label="The number that matters">Day-7 retention is the strongest predictor of 90-day retention. Every 1% improvement compounds into measurable capability growth.</Banner><div className="admin-card"><div className="admin-card__title">Activation funnel · last 30 days</div>{[["Signed up", "8,247", 100], ["Onboarding done", "7,505", 91], ["Day-1 return", "5,602", 68], ["Day-7 return", "3,847", 47], ["Day-30 return", "2,474", 30]].map(([label, count, width]) => <div className="admin-funnel-row" key={label}><div className="admin-funnel-row__header"><span>{label}</span><strong>{count} · {width}%</strong></div><div className="admin-funnel-row__bar"><div style={{ width: `${width}%`, background: "#008c93" }} /></div></div>)}</div><div className="admin-card"><div className="admin-card__title">Retention by persona</div>{[["Students", 34], ["Graduates", 28], ["Young Professionals", 38], ["Entrepreneurs", 31], ["Researchers", 42]].map(([label, pct]) => <div className="admin-retention-row" key={label}><div className="admin-retention-row__header"><span>{label}</span><strong>{pct}%</strong></div><div className="admin-retention-row__bar"><div style={{ width: `${pct}%`, background: "#008c93" }} /></div></div>)}</div></div>; }
function Moderation() { return <div className="r-admin-page"><div className="admin-card"><strong>0 open reports · Queue clear</strong><div style={{ fontSize: 11.5, color: "#8a91a0" }}>Circles are small and goal-scoped, which keeps volume low.</div></div><div className="admin-empty-state"><div className="admin-empty-state__icon">✓</div><div className="admin-empty-state__title">Nothing to moderate.</div><p>All reports resolved. Radar will surface new ones here and notify you if anything is marked severe.</p></div></div>; }
function Authoring() { return <div className="r-admin-page"><Kpis values={[["Published modules", "24", "+2 this month"], ["Avg completion", "73%", "+4%"], ["Lessons total", "186"], ["Pending review", "3", "Needs authoring"]]} /><div className="admin-card"><div className="admin-card__header"><div className="admin-card__title">Modules</div><button className="btn btn--accent">+ New module</button></div>{[["Product Thinking", "8 lessons · 12 resources", "92%", "Published"], ["Customer Research", "6 lessons · 9 resources", "78%", "Published"], ["AI Fundamentals", "10 lessons · 18 resources", "85%", "Published"], ["Data Analytics", "7 lessons · 11 resources", "64%", "Draft"], ["Payments & Interoperability", "Not started", "0%", "Pending"]].map(([title, meta, completion, status]) => <div className="admin-table-row" key={title}><div style={{ flex: 1 }}><strong>{title}</strong><div style={{ fontSize: 11, color: "#8a91a0" }}>{meta}</div></div><span style={{ color: "#008c93", fontWeight: 700 }}>{completion}</span><span className={`admin-tag admin-tag--${status === "Published" ? "tier1" : status === "Draft" ? "pending" : "flag"}`}>{status}</span></div>)}</div></div>; }
function Team() { return <div className="r-admin-page"><Banner label="Two roles, one difference">Platform Admins run the product. Super Admins also manage the commercial and institutional layer.</Banner><div className="admin-card"><div className="admin-card__header"><div className="admin-card__title">Admins · 4</div><button className="btn btn--accent">+ Invite admin</button></div>{[["Admin User", "admin@radar.app", "Super Admin", "All features", "Active now"], ["Chidi Okoro", "chidi@radar.app", "Platform Admin", "Queue, sources, content", "2 hours ago"], ["Blessing Amadi", "blessing@radar.app", "Platform Admin", "Moderation, quality", "Yesterday"], ["Yusuf Abdullahi", "yusuf@radar.app", "Super Admin", "All features", "3 days ago"]].map(([name, email, role, scope, active]) => <div className="admin-table-row" key={email}><div className="admin-user-row__avatar">{name[0]}</div><div style={{ flex: 1 }}><strong>{name}</strong><div style={{ fontSize: 11, color: "#8a91a0" }}>{email}</div></div><span className="admin-tag admin-tag--tier1">{role}</span><div style={{ fontSize: 11, color: "#535c6b" }}>{scope}<br />{active}</div><button className="btn btn--subtle">Edit</button></div>)}</div></div>; }
