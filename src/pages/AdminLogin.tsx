import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { adminLogin, ApiError } from "../lib/api";

export function AdminLogin() {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const result = await adminLogin(email.trim(), password);
      signIn(result.token);
      navigate("/admin", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to sign in. Please try again.");
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
          <span className="admin-login-badge">Admin</span>
        </div>

        <div style={{ height: 32 }} />

        <div className="ob-card">
          <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
            <div className="ob-step-label">Internal access</div>
            <h1 className="ob-title">Sign in to Admin.</h1>
            <p className="ob-sub" style={{ marginBottom: 24 }}>
              Use your Radar credentials to access the admin workspace.
            </p>

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", flex: 1 }}>
              <input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="r-input"
                autoComplete="username"
                required
                style={{ marginBottom: 10 }}
              />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="r-input"
                autoComplete="current-password"
                required
              />

              {error && <div className="admin-login-error">Invalid email or password.</div>}

              <div className="ob-actions" style={{ marginTop: 20 }}>
                <button className="btn btn--primary" style={{ width: "100%", padding: 15 }} disabled={loading}>
                  {loading ? "Signing in..." : "Sign in to Admin"}
                </button>
              </div>
            </form>

            <div style={{ textAlign: "center", marginTop: 14, fontSize: 13, color: "#8a91a0" }}>
              Regular Radar user?{" "}
              <Link to="/login" style={{ color: "#008c93", fontWeight: 600 }}>
                Sign in here
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="ob-photo">
        <img
          src="/images/marketing/intelligence.jpg"
          alt=""
        />
        <div className="ob-photo-overlay" />
        <div className="ob-photo-caption">
          <div className="ob-photo-eyebrow">Radar operations</div>
          <div className="ob-photo-text">Keep the signal clear. Make the calls that shape Radar.</div>
        </div>
      </div>
    </div>
  );
}
