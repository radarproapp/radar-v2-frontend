import { useEffect } from "react";
import { Navigate, useParams } from "react-router-dom";
import { rememberCode } from "../lib/referral";

/// Where a referral link lands.
///
/// /join/ABC2345 is what a participant shares, so it has to be short enough to say out loud and
/// to write on a whiteboard at a society meeting. It does nothing visible: it keeps the code for
/// the rest of the visit and sends the person on to the same first screen everybody else sees.
///
/// Deliberately not a different sign-up page. A referred person should meet the product the way
/// everyone else meets it - a separate landing page for referrals is a second first impression
/// to maintain, and it drifts from the real one within a month.
///
/// An unreadable code sends them on anyway. Somebody who followed a broken link still wants to
/// see Radar, and refusing them to protect the attribution of a sign-up they have not made yet
/// is the wrong way round.
export function Join() {
  const { code } = useParams<{ code?: string }>();

  useEffect(() => {
    rememberCode(code);
  }, [code]);

  return <Navigate to="/onboarding" replace />;
}
