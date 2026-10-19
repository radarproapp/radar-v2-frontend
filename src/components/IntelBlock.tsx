// A labelled slice of Radar's intelligence output (WHAT HAPPENED, WHY IT MATTERS, NEXT MOVE).
//
// The whole point is the blank case: when generation hasn't run, failed, or returned nothing, the
// pages used to render the label over an empty gap — a box that promises an insight and delivers
// air. A missing section should be invisible, not advertised.
export function IntelBlock({
  label,
  value,
  preserveLineBreaks = false,
}: {
  label: string;
  value?: string | null;
  preserveLineBreaks?: boolean;
}) {
  if (!value || !value.trim()) return null;

  return (
    <div>
      <div className="learn-intelligence-label">{label}</div>
      <div
        className="learn-intelligence-text"
        style={preserveLineBreaks ? { whiteSpace: "pre-line" } : undefined}
      >
        {value}
      </div>
    </div>
  );
}
