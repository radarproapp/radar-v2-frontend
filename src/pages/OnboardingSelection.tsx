import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { OnboardingShell } from "../components/OnboardingShell";

type UserTypeKey = "student" | "graduate" | "professional";

interface UserTypeOption {
  key: UserTypeKey;
  name: string;
  badge: string;
  target: string;
  desc: string;
  icon: string;
  route: string;
  sideImage: string;
  sideEyebrow: string;
  sideCaption: string;
}

const USER_TYPES: UserTypeOption[] = [
  {
    key: "student",
    name: "Radar Student",
    badge: "Student",
    target: "For university & college students",
    desc: "Master difficult courses, improve your grades, build practical skills (Python, SQL, Data Analysis), and prepare for internships and scholarships.",
    icon: "🎓",
    route: "/onboarding/student",
    sideImage: "/images/marketing/student.jpg",
    sideEyebrow: "Radar Student",
    sideCaption: "Excel in your degree, conquer tough courses, and build practical career skills simultaneously.",
  },
  {
    key: "graduate",
    name: "Radar Career: Graduate",
    badge: "Graduate",
    target: "For recent graduates & job seekers",
    desc: "Become employable, demonstrate what you can do through practical projects, bridge skill gaps, and find genuine opportunities.",
    icon: "💼",
    route: "/onboarding/graduate",
    sideImage: "/images/marketing/career.jpg",
    sideEyebrow: "Radar Career for Graduates",
    sideCaption: "Become employable, demonstrate what you can do, and find your next opportunity.",
  },
  {
    key: "professional",
    name: "Radar Career: Professional",
    badge: "Professional",
    target: "For working professionals",
    desc: "Turn your experience into your next advantage. Compare career decisions, assess market value, and build demonstrable impact without unnecessary risks.",
    icon: "🚀",
    route: "/onboarding/professional",
    sideImage: "/images/marketing/leader.jpg",
    sideEyebrow: "Radar Career for Professionals",
    sideCaption: "Turn your experience into your next advantage and make better career decisions.",
  },
];

export function OnboardingSelection() {
  const navigate = useNavigate();
  const [selectedType, setSelectedType] = useState<UserTypeKey | null>(null);

  const currentOption = USER_TYPES.find((t) => t.key === selectedType) ?? USER_TYPES[0];

  const handleContinue = () => {
    if (!selectedType) return;
    const match = USER_TYPES.find((t) => t.key === selectedType);
    if (match) {
      navigate(match.route);
    }
  };

  return (
    <OnboardingShell
      sideImage={selectedType ? currentOption.sideImage : "/images/marketing/welcome.jpg"}
      sideEyebrow={selectedType ? currentOption.sideEyebrow : "Personalised intelligence"}
      sideCaption={
        selectedType
          ? currentOption.sideCaption
          : "Radar adapts its entire engine — reading, learning, roadmap, and mentors — to where you are right now."
      }
      footerNotice={
        <div>
          Already have an account?{" "}
          <Link to="/login" style={{ color: "#008c93", fontWeight: 600 }}>
            Sign in
          </Link>
        </div>
      }
    >
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <div className="ob-step-label">Welcome to Radar</div>
        <h1 className="ob-title" style={{ fontSize: "clamp(1.45rem, 3.8vw, 1.85rem)", marginBottom: 10 }}>
          Let's personalise your Radar experience.
        </h1>
        <p className="ob-sub" style={{ marginBottom: 20 }}>
          Tell us how you plan to use Radar so we can tailor your roadmap, mentors, and recommendations to your goals.
        </p>

        <div className="ob-type-cards">
          {USER_TYPES.map((option) => {
            const isSelected = selectedType === option.key;
            return (
              <div
                key={option.key}
                className={`ob-type-card ${isSelected ? "active" : ""}`}
                onClick={() => setSelectedType(option.key)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelectedType(option.key);
                  }
                }}
              >
                <div className="ob-type-card__icon-box">{option.icon}</div>
                <div className="ob-type-card__body">
                  <div className="ob-type-card__header">
                    <div className="ob-type-card__title-row">
                      <span className="ob-type-card__name">{option.name}</span>
                      <span className="ob-type-card__badge">{option.badge}</span>
                    </div>
                    <div className="ob-type-card__check">✓</div>
                  </div>
                  <div className="ob-type-card__target">{option.target}</div>
                  <div className="ob-type-card__desc">{option.desc}</div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="ob-actions" style={{ marginTop: "auto", paddingTop: 12 }}>
          <button
            className="btn btn--primary"
            style={{ width: "100%", padding: 15, fontSize: 15 }}
            onClick={handleContinue}
            disabled={!selectedType}
          >
            Continue →
          </button>
        </div>
      </div>
    </OnboardingShell>
  );
}
