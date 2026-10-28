import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { unsubscribe } from "../lib/api";

/// Turning a message off, from the message.
///
/// Public, and it acts on arrival rather than asking for a confirming click. Somebody who pressed
/// unsubscribe has already decided; a page that asks again is a page that gets closed, and the
/// next step after that is marking the mail as spam — which costs the whole sending domain, the
/// password reset included.
///
/// It reports success even when the token does not verify. An old link, or one already used,
/// should say the message is off rather than hand back an error that invites a spam report.

export function Unsubscribe() {
  const [params] = useSearchParams();
  const token = params.get("token");

  // Derived rather than set in the effect: with no token there is nothing to wait for, and
  // starting in "working" only to correct it on the first render is a wasted frame that renders
  // the wrong heading.
  const [state, setState] = useState<"working" | "done">(token ? "working" : "done");
  const ran = useRef(false);

  useEffect(() => {
    if (!token) return;

    // Guarded: React runs effects twice in development, and unsubscribing twice is harmless but
    // the second request is noise.
    if (ran.current) return;
    ran.current = true;

    unsubscribe(token)
      .catch(() => {})
      .finally(() => setState("done"));
  }, [token]);

  return (
    <div className="r-page" style={{ maxWidth: 480 }}>
      <div className="r-page-head">
        <h1 className="r-page-title">
          {state === "working" ? "Turning it off…" : "That is off now"}
        </h1>
      </div>

      {state === "done" && (
        <>
          <p className="forgot__text">
            You will not get the daily update again. Nothing else has changed — password resets
            and anything else you asked for still reach you.
          </p>

          <p className="forgot__text">
            You can turn it back on in settings whenever you like.
          </p>

          <Link to="/settings" className="btn btn--primary">
            Open settings
          </Link>
        </>
      )}
    </div>
  );
}
