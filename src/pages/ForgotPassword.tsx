import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { PasswordField } from "../components/PasswordField";
import { ApiError, forgotPassword, resetPassword } from "../lib/api";

/// Getting back into an account.
///
/// There was no route at all: a password mistyped at signup — easy on a phone keyboard, where the
/// field showed nothing back — locked the account permanently.
///
/// One page handles both halves. With a ?token= it is the second half; without, the first. A
/// separate route for the second would be a page nobody can reach except from an email, which is
/// a page nobody can test.

export function ForgotPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get("token");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [done, setDone] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const request = async () => {
    if (!email.trim()) return;
    setBusy(true);
    setError(null);

    try {
      const result = await forgotPassword(email.trim());
      setSent(true);

      // Said plainly when no email provider is configured. A form that claims a link is on its
      // way and sends nothing wastes an hour of somebody's evening.
      if (!result.canSend) {
        setNotice(
          "Radar cannot send email yet, so no link will arrive. Contact support and they can reset it for you.",
        );
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not start a reset. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const redeem = async () => {
    if (!token || password.length < 8) return;
    setBusy(true);
    setError(null);

    try {
      await resetPassword(token, password);
      setDone(true);
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : "That reset link is no longer valid. Request a new one.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="r-page" style={{ maxWidth: 420 }}>
      <div className="r-page-head">
        <h1 className="r-page-title">{token ? "Choose a new password" : "Forgot your password?"}</h1>
      </div>

      {done ? (
        <>
          <p className="forgot__text">Your password has been changed.</p>
          <button className="btn btn--primary" onClick={() => navigate("/login")}>
            Sign in
          </button>
        </>
      ) : token ? (
        <>
          <p className="forgot__text">At least eight characters. You can read it back as you type.</p>

          <PasswordField
            value={password}
            onChange={setPassword}
            placeholder="New password"
            autoComplete="new-password"
            onEnter={redeem}
          />

          <button
            className="btn btn--primary"
            style={{ marginTop: 12 }}
            onClick={redeem}
            disabled={busy || password.length < 8}
          >
            {busy ? "Saving…" : "Set new password"}
          </button>
        </>
      ) : sent ? (
        <>
          {/* The same message whether or not the address has an account: a different one would
              turn this form into a way to find out who has signed up. */}
          <p className="forgot__text">
            If that address has a Radar account, a reset link is on its way. It works once and
            expires in an hour.
          </p>
          {notice && <div className="forgot__notice">{notice}</div>}
          <Link to="/login" className="btn btn--text btn--sm">
            Back to sign in
          </Link>
        </>
      ) : (
        <>
          <p className="forgot__text">
            Enter the address you signed up with and Radar will send you a link to set a new
            password.
          </p>

          <input
            type="email"
            className="r-input"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            onKeyDown={(e) => e.key === "Enter" && void request()}
          />

          <button
            className="btn btn--primary"
            style={{ marginTop: 12 }}
            onClick={request}
            disabled={busy || !email.trim()}
          >
            {busy ? "Sending…" : "Send reset link"}
          </button>

          <div style={{ marginTop: 14 }}>
            <Link to="/login" style={{ fontSize: 12.5, color: "var(--cyan-deep)", fontWeight: 600 }}>
              Back to sign in
            </Link>
          </div>
        </>
      )}

      {error && (
        <div role="alert" className="forgot__error">
          {error}
        </div>
      )}
    </div>
  );
}
