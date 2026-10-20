/// A strip across the top of any build that is not production.
///
/// Two environments that look identical are a trap: you test a fix on staging and believe it is
/// live, or you demo production believing it is safe to click through. The cheapest fix is to make
/// the difference impossible to miss, and only ever on the non-production side — production stays
/// exactly as it is.
///
/// Renders nothing in production, so there is no risk of this leaking into the real product.
export function EnvironmentBanner() {
  const environment = import.meta.env.VITE_ENVIRONMENT;

  if (!environment || environment === "production") return null;

  const api = import.meta.env.VITE_API_BASE_URL ?? "not configured";

  return (
    <div
      role="status"
      style={{
        position: "sticky",
        top: 0,
        zIndex: 999,
        background: "#b45309",
        color: "#fff",
        fontSize: 12,
        fontWeight: 700,
        textAlign: "center",
        padding: "5px 10px",
        letterSpacing: ".04em",
      }}
    >
      {environment.toUpperCase()} — not production. Data here is disposable.
      {/* The API is named because the dangerous failure is a staging site pointed at the
          production backend, which otherwise looks completely normal. */}
      <span style={{ fontWeight: 500, opacity: 0.85, marginLeft: 8 }}>API: {api}</span>
    </div>
  );
}
