import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { acceptAdminInvite, ApiError } from "../lib/api";
import { PasswordField } from "../components/PasswordField";

/// Setting a password on a new admin account.
///
/// This is a separate account from the one the same person reads Radar with. Running the product
/// and using it are different jobs, and doing the first should not mean the second is one
/// password away — an admin session that is also a logged-in reader is a session where the wrong
/// tab can do real damage.
///
/// Creating the account does not sign them in. A leaked link should not also hand over a live
/// session: whoever opens it still has to know the password that was just set, and the real owner
/// finds an account they cannot get into rather than one somebody else is already using.
export function AdminAccept() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Use at least 8 characters.");
      return;
    }

    // Checked here rather than only on the server. A mistyped password that is accepted leaves
    // somebody with an account they cannot sign in to and no way to tell why.
    if (password !== confirm) {
      setError("Those two passwords are not the same.");
      return;
    }

    setBusy(true);
    try {
      await acceptAdminInvite(token, password);
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not set the password. Try again.");
    } finally {
      setBusy(false);
    }
  };

  // Said before they type anything. A link with no token is a link that was truncated somewhere
  // between the email and the browser, which is worth saying plainly rather than failing on
  // submit.
  if (!token) {
    return (
      <Shell>
        <h1 className="ob-title">That link is incomplete.</h1>
        <p className="ob-sub">
          Open the link from your invitation again, straight from the email. If it keeps happening,
          ask whoever invited you to send a new one.
        </p>
      </Shell>
    );
  }

  if (done) {
    return (
      <Shell>
        <h1 className="ob-title">Your admin account is ready.</h1>
        <p className="ob-sub" style={{ marginBottom: 24 }}>
          Sign in with this email address and the password you just chose. This is separate from
          any ordinary Radar account on the same address — that one keeps its own password.
        </p>
        <button className="btn btn--primary" onClick={() => navigate("/admin/login", { replace: true })}>
          Go to admin sign-in
        </button>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="ob-step-label">Internal access</div>
      <h1 className="ob-title">Choose a password.</h1>
      <p className="ob-sub" style={{ marginBottom: 24 }}>
        This creates your Radar admin account. It is separate from any ordinary Radar account you
        use — a different password, for a different job.
      </p>

      {error && (
        <div
          style={{
            background: "#fdeced",
            border: "1px solid #f5c2c7",
            borderRadius: 8,
            color: "#842029",
            padding: "10px 12px",
            fontSize: 13,
            marginBottom: 16,
          }}
        >
          {error}
        </div>
      )}

      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <PasswordField
          value={password}
          onChange={setPassword}
          placeholder="Password (at least 8 characters)"
          autoComplete="new-password"
        />
        <PasswordField
          value={confirm}
          onChange={setConfirm}
          placeholder="Type it again"
          autoComplete="new-password"
        />
        <button className="btn btn--primary" type="submit" disabled={busy}>
          {busy ? "Setting…" : "Create my admin account"}
        </button>
      </form>

      <p className="ob-sub" style={{ marginTop: 20, fontSize: 12.5 }}>
        Not expecting this? Nothing has been created yet — close this page and ask whoever invited
        you. <Link to="/">Go to Radar</Link>
      </p>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
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
          <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>{children}</div>
        </div>
      </div>
    </div>
  );
}
