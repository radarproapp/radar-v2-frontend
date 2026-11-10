import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { verifyEmail, ApiError } from "../lib/api";

/// Confirming an address, from the link in the email.
///
/// Nothing in Radar is locked until somebody does this. What it changes is whether a referral
/// counts: a count is worth what the accounts behind it are worth, and an address nobody has to
/// own is how thirty of them get made in an afternoon.
///
/// It confirms on arrival rather than behind a button. The person already chose to do this when
/// they tapped the link in their email, and asking them to confirm the confirmation is a second
/// decision about a thing they have already decided.
export function VerifyEmail() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";

  const [state, setState] = useState<"working" | "done" | "already" | "failed">("working");
  const [error, setError] = useState<string | null>(null);

  // Guards against the double-invoke React does in development, which would otherwise spend the
  // single-use token on the first run and report the second as invalid.
  const started = useRef(false);

  useEffect(() => {
    if (!token || started.current) return;
    started.current = true;

    verifyEmail(token)
      .then((result) => setState(result.alreadyDone ? "already" : "done"))
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : "Could not confirm this address.");
        setState("failed");
      });
  }, [token]);

  if (!token) {
    return (
      <Shell>
        <h1 className="ob-title">That link is incomplete.</h1>
        <p className="ob-sub">
          Open it again straight from the email. If it keeps happening, ask for a new one from your
          settings.
        </p>
        <Back />
      </Shell>
    );
  }

  if (state === "working") {
    return <Shell><h1 className="ob-title">Confirming…</h1></Shell>;
  }

  if (state === "failed") {
    return (
      <Shell>
        <h1 className="ob-title">That link has expired.</h1>
        <p className="ob-sub">{error}</p>
        <Back />
      </Shell>
    );
  }

  return (
    <Shell>
      {/* Following the same link twice is what a person does when they are not sure the first tap
          worked. Saying "already confirmed" rather than "invalid" stops them asking for a link
          they do not need. */}
      <h1 className="ob-title">{state === "already" ? "Already confirmed." : "Thank you — that's confirmed."}</h1>
      <p className="ob-sub">
        This address reaches you. If somebody introduced you to Radar, their referral counts now.
      </p>
      <Back />
    </Shell>
  );
}

function Back() {
  return (
    <p className="ob-sub" style={{ marginTop: 20 }}>
      <Link to="/">Go to Radar</Link>
    </p>
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
        </div>

        <div style={{ height: 32 }} />

        <div className="ob-card">
          <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>{children}</div>
        </div>
      </div>
    </div>
  );
}
