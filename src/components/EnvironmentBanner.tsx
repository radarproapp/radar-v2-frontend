/// A strip across the top of any build that is not production.
///
/// Two environments that look identical are a trap: you test a fix on staging and believe it is
/// live, or you demo production believing it is safe to click through. The cheapest fix is to make
/// the difference impossible to miss, and only ever on the non-production side.
///
/// It also catches a specific misconfiguration. Vercel builds a staging branch as a *preview*, but
/// if that preview has no Preview variables set it falls back to the committed `.env.production` —
/// so it points at the production API and labels itself production. `VITE_ENVIRONMENT` alone would
/// believe it. `VERCEL_ENV` comes from the platform rather than a file, so it cannot be wrong that
/// way, and the mismatch between the two is itself worth shouting about.
export function EnvironmentBanner() {
  const declared = import.meta.env.VITE_ENVIRONMENT;
  const vercelEnv = import.meta.env.VITE_VERCEL_ENV;
  const branch = import.meta.env.VITE_GIT_BRANCH;
  const api = import.meta.env.VITE_API_BASE_URL ?? "not configured";

  const claimsProduction = !declared || declared === "production";
  // Vercel reports "preview" for pull requests and for custom environments alike.
  const platformSaysPreview = vercelEnv !== "" && vercelEnv !== "production";
  const misconfigured = claimsProduction && platformSaysPreview;

  if (claimsProduction && !misconfigured) return null;

  const label = misconfigured
    ? "MISCONFIGURED PREVIEW"
    : (declared || vercelEnv || "non-production").toUpperCase();

  return (
    <div
      role="status"
      style={{
        position: "sticky",
        top: 0,
        zIndex: 999,
        // Red for a misconfiguration, amber for an ordinary non-production build. One is a problem
        // to fix; the other is just a fact about where you are.
        background: misconfigured ? "#b91c1c" : "#b45309",
        color: "#fff",
        fontSize: 12,
        fontWeight: 700,
        textAlign: "center",
        padding: "5px 10px",
        letterSpacing: ".04em",
      }}
    >
      {misconfigured ? (
        <>
          {label} — this is a Vercel preview{branch ? ` of "${branch}"` : ""} but it is built as
          production. It is calling the production API. Set VITE_API_BASE_URL and VITE_ENVIRONMENT
          on this environment.
        </>
      ) : (
        <>
          {label} — not production. Data here is disposable.
          {/* The API is named because the dangerous failure is a staging site pointed at the
              production backend, which otherwise looks completely normal. */}
          <span style={{ fontWeight: 500, opacity: 0.85, marginLeft: 8 }}>API: {api}</span>
        </>
      )}
    </div>
  );
}
