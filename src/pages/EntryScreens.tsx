import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";

type EntryTab = "splash" | "forgot" | "sent" | "newpw" | "verify";

const tabs: { id: EntryTab; label: string }[] = [
  { id: "splash", label: "Splash" },
  { id: "forgot", label: "Forgot password" },
  { id: "sent", label: "Link sent" },
  { id: "newpw", label: "New password" },
  { id: "verify", label: "Verify email" },
];

export function EntryScreens() {
  const [activeTab, setActiveTab] = useState<EntryTab>("splash");

  return (
    <div className="r-entry-gallery">
      <header className="r-entry-gallery__header">
        <Link to="/onboarding" aria-label="Back to onboarding" className="r-entry-gallery__back">←</Link>
        <span className="r-entry-gallery__title">Entry screens</span>
        <span className="r-entry-gallery__badge">Reference</span>
      </header>
      <main className="r-entry-gallery__body">
        <div className="r-entry-gallery__tabs">
          {tabs.map((tab) => (
            <button key={tab.id} className={`r-chip ${activeTab === tab.id ? "active" : ""}`} onClick={() => setActiveTab(tab.id)}>
              {tab.label}
            </button>
          ))}
        </div>
        {activeTab === "splash" && <SplashScreen />}
        {activeTab === "forgot" && <ForgotPassword onSent={() => setActiveTab("sent")} />}
        {activeTab === "sent" && <SentScreen />}
        {activeTab === "newpw" && <NewPassword />}
        {activeTab === "verify" && <VerifyEmail />}
      </main>
    </div>
  );
}

function SplashScreen() {
  return (
    <section className="r-entry-splash">
      <div className="r-entry-splash__radar">
        <div className="r-entry-splash__pulse" />
        <div className="r-entry-splash__pulse r-entry-splash__pulse--delayed" />
        <div className="r-entry-splash__sweep" />
        <div className="r-entry-splash__mark">R</div>
      </div>
      <div className="r-entry-splash__name">Radar</div>
      <div className="r-entry-splash__tagline">Your second brain. Understand once, remember forever.</div>
      <div className="r-entry-splash__loading">Loading your intelligence profile…</div>
    </section>
  );
}

function EntryCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`r-entry-card ${className}`}>{children}</section>;
}

function ForgotPassword({ onSent }: { onSent: () => void }) {
  return (
    <EntryCard>
      <div className="r-entry-card__brand"><span>R</span>Radar</div>
      <div className="ob-step-label">RESET PASSWORD</div>
      <h1>Forgot your password?</h1>
      <p className="ob-sub">Enter the email on your account and we&apos;ll send a reset link. It expires in 30 minutes.</p>
      <label className="r-entry-label" htmlFor="reset-email">Email address</label>
      <input id="reset-email" type="email" placeholder="amara@example.com" className="r-input" />
      <button className="btn btn--primary r-entry-card__button" onClick={onSent}>Send reset link</button>
      <div className="r-entry-card__footer">Remembered it? <Link to="/onboarding">Back to sign in</Link></div>
    </EntryCard>
  );
}

function SentScreen() {
  return (
    <EntryCard className="r-entry-card--centered">
      <div className="r-entry-mail-icon">✉</div>
      <h1>Check your inbox.</h1>
      <p className="r-entry-card__copy">We sent a reset link to <strong>amara@example.com</strong>. It works once and expires in 30 minutes.</p>
      <div className="r-entry-note"><strong>Didn&apos;t get it?</strong><br />Check spam, or confirm you signed up with this address. You can resend in <strong>0:42</strong>.</div>
      <button className="btn r-entry-card__button" disabled>Resend link · 0:42</button>
    </EntryCard>
  );
}

function NewPassword() {
  return (
    <EntryCard>
      <div className="ob-step-label">CHOOSE A NEW PASSWORD</div>
      <h1>Set a new password.</h1>
      <p className="ob-sub">You&apos;ll stay signed in on this device. Other devices will need the new password.</p>
      <label className="r-entry-label" htmlFor="new-password">New password</label>
      <input id="new-password" type="password" defaultValue="crossriver26" className="r-input" />
      <div className="r-entry-strength"><span /><span /><span /><span /></div>
      <div className="r-entry-strength__label">Strong — 12 characters, no dictionary words</div>
      <label className="r-entry-label" htmlFor="confirm-password">Confirm password</label>
      <input id="confirm-password" type="password" defaultValue="crossriver26" className="r-input" />
      <button className="btn btn--primary r-entry-card__button">Save and sign in</button>
    </EntryCard>
  );
}

function VerifyEmail() {
  return (
    <EntryCard>
      <div className="ob-step-label">VERIFY YOUR EMAIL</div>
      <h1>Enter your 6-digit code.</h1>
      <p className="ob-sub">Sent to <strong>amara@example.com</strong>. This confirms your account and lets your university find you.</p>
      <div className="r-entry-code" aria-label="Verification code">
        {[4, 7, 2, "", "", ""].map((digit, index) => <div key={index} className={digit ? "filled" : ""}>{digit}</div>)}
      </div>
      <button className="btn btn--primary r-entry-card__button">Verify</button>
      <div className="r-entry-card__footer">Didn&apos;t arrive? <a href="#resend">Resend code</a> · <a href="#change-email">Change email</a></div>
      <div className="r-entry-note">You can explore Radar unverified, but you&apos;ll need a verified email to apply to opportunities and receive your weekly brief.</div>
    </EntryCard>
  );
}
