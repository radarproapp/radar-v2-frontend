import { useState } from "react";
import { PasswordField } from "../components/PasswordField";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { ApiError, login } from "../lib/api";

export function Login() {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const canSubmit = email.trim().length > 0 && password.length > 0;

  const handleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await login(email.trim(), password);
      signIn(result.token);
      navigate("/");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ob-shell">
      <div className="ob-left">
        <div className="ob-topbar">
          <div className="ob-logo-mark">R</div>
          <div className="ob-divider-v" />
          <span className="ob-logo-name">Radar</span>
        </div>

        <div style={{ height: 32 }} />

        <div className="ob-card">
          <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
            <div className="ob-step-label">Welcome back</div>
            <h1 className="ob-title">Sign in to Radar.</h1>
            <p className="ob-sub" style={{ marginBottom: 24 }}>
              Pick up exactly where you left off.
            </p>

            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="r-input"
              style={{ marginBottom: 10 }}
            />
            <PasswordField
              value={password}
              onChange={setPassword}
              autoComplete="current-password"
              onEnter={() => canSubmit && void handleSignIn()}
            />

            {/* A failed login with no way to recover is a lost user. */}
            <div style={{ textAlign: "right", marginTop: 8 }}>
              <Link to="/forgot-password" style={{ fontSize: 12.5, color: "var(--cyan-deep)", fontWeight: 600 }}>
                Forgot password?
              </Link>
            </div>

            {error && (
              <div
                style={{
                  marginTop: 8,
                  padding: "10px 13px",
                  background: "#fff0f0",
                  borderRadius: 10,
                  border: "1px solid #f5c6c6",
                  fontSize: 13,
                  color: "#d94f4f",
                }}
              >
                {error}
              </div>
            )}

            <div className="ob-actions" style={{ marginTop: 20 }}>
              <button
                className="btn btn--primary"
                style={{ width: "100%", padding: 15 }}
                onClick={handleSignIn}
                disabled={!canSubmit || loading}
              >
                {loading ? "Signing in…" : "Sign in"}
              </button>
            </div>

            <div style={{ textAlign: "center", marginTop: 14, fontSize: 13, color: "#8a91a0" }}>
              No account?{" "}
              <Link to="/onboarding" style={{ color: "#008c93", fontWeight: 600 }}>
                Get started
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="ob-photo">
        {/* Decorative and below the fold on small screens — never let it block first paint. */}
        <img
          src="/images/marketing/welcome.jpg"
          alt=""
          loading="lazy"
          decoding="async"
        />
        <div className="ob-photo-overlay" />
        <div className="ob-photo-caption">
          <div className="ob-photo-eyebrow">Welcome back</div>
          <div className="ob-photo-text">Start your day with Radar, not with Google.</div>
        </div>
      </div>
    </div>
  );
}
