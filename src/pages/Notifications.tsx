import { useState } from "react";
import { useNavigate } from "react-router-dom";

interface NotificationItem {
  id: string;
  title: string;
  description: string;
  time: string;
  category: string;
  isUnread: boolean;
  isUrgent: boolean;
  route: string;
}

// Mock data, matching Notifications.razor exactly — no backend for this yet (see HANDOFF.md).
const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  { id: "1", title: "AfDB YPP closes in 12 days", description: "Your 87% match — Radar drafted a 12-day prep plan.", time: "2h ago", category: "Opportunity", isUnread: true, isUrgent: true, route: "/opportunities" },
  { id: "2", title: "Your Intelligence Brief is ready", description: "5 stories · 5 min · led by the AfDB infrastructure fund.", time: "7:00", category: "Briefing", isUnread: true, isUrgent: false, route: "/weekly" },
  { id: "3", title: "Radar updated your roadmap", description: "Payments & interoperability added — triggered by a policy signal.", time: "Yesterday", category: "Learn", isUnread: false, isUrgent: false, route: "/learn" },
  { id: "4", title: "A new paper matches your saved research", description: "Recommendation under data sparsity · arXiv", time: "2d ago", category: "Research", isUnread: false, isUrgent: false, route: "/research" },
];

const TODAY_TIMES = new Set(["2h ago", "7:00", "30m ago", "1h ago"]);

export function Notifications() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS);

  const today = notifications.filter((n) => TODAY_TIMES.has(n.time));
  const earlier = notifications.filter((n) => !TODAY_TIMES.has(n.time));

  const markAllRead = () => setNotifications((prev) => prev.map((n) => ({ ...n, isUnread: false })));

  const goTo = (notif: NotificationItem) => {
    setNotifications((prev) => prev.map((n) => (n.id === notif.id ? { ...n, isUnread: false } : n)));
    navigate(notif.route);
  };

  const renderRow = (notif: NotificationItem, dimmed: boolean) => (
    <button
      key={notif.id}
      style={{
        display: "flex",
        gap: 12,
        padding: "14px 15px",
        borderRadius: 12,
        background: "#fff",
        textAlign: "left",
        width: "100%",
        cursor: "pointer",
        border: dimmed ? "1px solid var(--border)" : notif.isUnread ? "1.5px solid var(--cyan)" : "1px solid var(--border)",
        opacity: dimmed ? 0.8 : 1,
      }}
      onClick={() => goTo(notif)}
    >
      <div
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          flex: "none",
          marginTop: 6,
          background: dimmed ? "transparent" : notif.isUrgent ? "#c0392b" : notif.isUnread ? "var(--cyan)" : "transparent",
        }}
      />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 2 }}>{notif.title}</div>
        <div style={{ fontSize: 12.5, color: "var(--text-dim)", lineHeight: 1.5 }}>{notif.description}</div>
        <div style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 4 }}>
          {notif.time} · {notif.category}
        </div>
      </div>
    </button>
  );

  return (
    <div className="r-page" style={{ maxWidth: 720 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
        <h1 className="r-page-title" style={{ flex: 1 }}>
          Notifications
        </h1>
        <button className="btn btn--text btn--sm" onClick={markAllRead}>
          Mark all read
        </button>
      </div>

      {notifications.length === 0 ? (
        <div className="r-empty">
          <h3>No notifications yet</h3>
          <p>Radar will alert you when something needs your attention.</p>
        </div>
      ) : (
        <>
          {today.length > 0 && (
            <>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--text-faint)", marginBottom: 8 }}>TODAY</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 22 }}>{today.map((n) => renderRow(n, false))}</div>
            </>
          )}

          {earlier.length > 0 && (
            <>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--text-faint)", marginBottom: 8 }}>EARLIER</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{earlier.map((n) => renderRow(n, true))}</div>
            </>
          )}
        </>
      )}
    </div>
  );
}
