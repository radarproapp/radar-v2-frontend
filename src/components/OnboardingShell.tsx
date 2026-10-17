import React from "react";

export interface OnboardingShellProps {
  stepNumber?: number;
  totalSteps?: number;
  badge?: string;
  sideImage?: string;
  sideEyebrow?: string;
  sideCaption?: string;
  sideAlt?: string;
  footerNotice?: React.ReactNode;
  children: React.ReactNode;
}

export function OnboardingShell({
  stepNumber,
  totalSteps,
  badge,
  sideImage = "/images/marketing/welcome.jpg",
  sideEyebrow = "Radar Intelligence",
  sideCaption = "One personal intelligence system, calibrated entirely to you.",
  sideAlt = "Radar onboarding portrait",
  footerNotice,
  children,
}: OnboardingShellProps) {
  const showProgress = typeof stepNumber === "number" && typeof totalSteps === "number" && totalSteps > 0;

  return (
    <div className="ob-shell">
      <div className="ob-left">
        <div className="ob-topbar">
          <div className="ob-logo-mark">R</div>
          <div className="ob-divider-v" />
          <span className="ob-logo-name">Radar</span>
          {badge && (
            <span
              className="ob-type-card__badge"
              style={{
                marginLeft: 4,
                background: "rgba(0, 140, 147, 0.12)",
                color: "#008c93",
                padding: "3px 9px",
                borderRadius: 999,
                fontWeight: 700,
                fontSize: 11,
              }}
            >
              {badge}
            </span>
          )}
        </div>

        {showProgress ? (
          <div className="ob-progress">
            {Array.from({ length: totalSteps }, (_, i) => i + 1).map((i) => (
              <div
                key={i}
                className="ob-progress-dot"
                style={{
                  background: i <= stepNumber ? "#008c93" : "rgba(20,24,31,.1)",
                  transition: "background 0.2s ease",
                }}
              />
            ))}
          </div>
        ) : (
          <div style={{ height: 28 }} />
        )}

        <div className="ob-card">
          {children}
        </div>

        {footerNotice && (
          <div className="ob-footnote">
            {footerNotice}
          </div>
        )}
      </div>

      <div className="ob-photo">
        <img src={sideImage} alt={sideAlt} />
        <div className="ob-photo-overlay" />
        <div className="ob-photo-caption">
          <div className="ob-photo-eyebrow">{sideEyebrow}</div>
          <div className="ob-photo-text">{sideCaption}</div>
        </div>
      </div>
    </div>
  );
}
