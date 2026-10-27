import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { FollowUps } from "../components/FollowUps";
import { HomeBriefView } from "../components/HomeBriefView";
import { PersonalisePrompt } from "../components/PersonalisePrompt";
import { isWeeklyBriefUnlocked } from "../lib/schedule";

/// The signed-in home screen.
///
/// Previously this branched on persona into GraduateCareerDashboard / ProfessionalCareerDashboard,
/// both of which were entirely hand-written mock content — career options, salary bands, employer
/// names and impact figures as string literals, identical for every user. Those are gone; every
/// persona now gets the same brief, computed from their own profile, roadmap, behaviour and real
/// ingested content by GET /api/home.
///
/// The persona branch also sat above this component's hooks, so the hook count changed as the
/// profile resolved from undefined to a persona — a latent React ordering violation that this
/// rewrite removes along with it.
export function Today() {
  const navigate = useNavigate();
  const { profile } = useAuth();

  const firstName = profile?.name?.split(" ")[0] || "there";

  // Asked here, on the first screen after signing in, and nothing else is shown until it is
  // answered.
  //
  // Not a redirect to a form: a six-step questionnaire before anyone had seen Radar was answered
  // carelessly or abandoned, which is why it was deleted. This is the same three questions on the
  // screen that explains why they are being asked.
  //
  // The brief is withheld rather than degraded. HomeBriefView computes "what matters to you
  // today" from the profile, and from an empty one every sentence it produces is invented.
  // FollowUps goes too — it exists to confirm interests Radar has inferred from behaviour, and
  // there is no behaviour yet.
  if (profile && !profile.isPersonalised) {
    return (
      <div className="r-page">
        <div className="r-page-head">
          <h1 className="r-page-title">Welcome, {firstName}</h1>
        </div>
        <PersonalisePrompt />
      </div>
    );
  }

  return (
    <>
      <FollowUps />

      {isWeeklyBriefUnlocked() && (
        <div className="r-page" style={{ paddingBottom: 0 }}>
          <button className="nav-brief-banner" onClick={() => navigate("/weekly")}>
            <div className="nav-brief-meta">
              <span className="nav-brief-label">Weekly Intelligence Brief</span>
              <span className="nav-brief-time">6 min</span>
            </div>
            <div className="nav-brief-text">Your week in one place — top articles, blog posts, videos and podcasts.</div>
            <span className="nav-brief-cta">Read the brief →</span>
          </button>
        </div>
      )}

      <HomeBriefView firstName={firstName} />
    </>
  );
}
