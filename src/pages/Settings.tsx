import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { updateMe } from "../lib/api";
import type { NotificationPrefs } from "../lib/types";

export function Settings() {
  const navigate = useNavigate();
  const { profile, refetchProfile } = useAuth();
  const [notifications, setNotifications] = useState<NotificationPrefs | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) setNotifications(profile.notifications);
  }, [profile]);

  const toggle = (key: keyof NotificationPrefs) => {
    setNotifications((prev) => (prev ? { ...prev, [key]: !prev[key] } : prev));
  };

  const handleSave = async () => {
    if (!notifications) return;
    setSaving(true);
    try {
      await updateMe({ notifications });
      refetchProfile();
    } finally {
      setSaving(false);
    }
  };

  if (!profile || !notifications) return null;

  return (
    <div className="r-page" style={{ maxWidth: 600 }}>
      <div className="r-page-head">
        <h1 className="r-page-title">Settings</h1>
      </div>

      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".07em", textTransform: "uppercase", color: "var(--text-faint)", marginBottom: 10 }}>ACCOUNT</div>
        <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 14, padding: "18px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: 14, borderBottom: "1px solid rgba(20,24,31,.06)", marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 700 }}>{profile.name}</div>
              <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>{profile.email}</div>
            </div>
            <button className="btn btn--sm" onClick={() => navigate("/profile/edit")}>
              Edit
            </button>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 700 }}>Persona</div>
              <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>{profile.persona}</div>
            </div>
            <button className="btn btn--sm" onClick={() => navigate("/profile/edit")}>
              Change
            </button>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".07em", textTransform: "uppercase", color: "var(--text-faint)", marginBottom: 10 }}>NOTIFICATIONS</div>
        <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 14, padding: "18px 20px" }}>
          {(
            [
              ["weeklyBrief", "Weekly Intelligence Brief", "Monday morning"],
              ["opportunityDeadlines", "Opportunity deadlines", "7 days and 48 hours before close"],
              ["roadmapReminders", "Roadmap reminders", "A nudge when a module stalls"],
            ] as const
          ).map(([key, title, subtitle], i) => (
            <div
              key={key}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                paddingBottom: i < 2 ? 14 : 0,
                borderBottom: i < 2 ? "1px solid rgba(20,24,31,.06)" : "none",
                marginBottom: i < 2 ? 14 : 0,
              }}
            >
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 700 }}>{title}</div>
                <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>{subtitle}</div>
              </div>
              <button
                onClick={() => toggle(key)}
                style={{
                  width: 42,
                  height: 24,
                  borderRadius: 99,
                  border: "none",
                  background: notifications[key] ? "var(--cyan)" : "rgba(20,24,31,.16)",
                  position: "relative",
                  flex: "none",
                  cursor: "pointer",
                }}
              >
                <div style={{ width: 18, height: 18, borderRadius: "50%", background: "#fff", position: "absolute", top: 3, left: notifications[key] ? 21 : 3, transition: "left .15s" }} />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".07em", textTransform: "uppercase", color: "var(--text-faint)", marginBottom: 10 }}>PLAN</div>
        <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 14, padding: "18px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 700 }}>Free plan</div>
              <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>Your current plan</div>
            </div>
            <button className="btn btn--primary btn--sm" onClick={() => navigate("/plans")}>
              Upgrade
            </button>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".07em", textTransform: "uppercase", color: "var(--text-faint)", marginBottom: 10 }}>QUICK LINKS</div>
        <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 14 }}>
          {([
            ["/notebook", "Notebook"],
            ["/saved", "Saved resources"],
            ["/progress", "Growth Tracker"],
          ] as const).map(([path, label], i) => (
            <button
              key={path}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                width: "100%",
                padding: "15px 20px",
                border: "none",
                background: "none",
                cursor: "pointer",
                textAlign: "left",
                borderBottom: i < 2 ? "1px solid rgba(20,24,31,.06)" : "none",
              }}
              onClick={() => navigate(path)}
            >
              <span style={{ fontSize: 13.5, fontWeight: 700 }}>{label}</span>
              <span style={{ color: "var(--text-faint)" }}>→</span>
            </button>
          ))}
        </div>
      </div>

      <button className="btn btn--primary" style={{ width: "100%" }} onClick={handleSave} disabled={saving}>
        {saving ? "Saving…" : "Save settings"}
      </button>
    </div>
  );
}
