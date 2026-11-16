import type { EligibilityVerdict } from "../lib/types";

/// What the eligibility check concluded, said plainly.
///
/// The server computes a verdict and a set of reasons per reader and nothing rendered them, so
/// the check ran and nobody could see that it had. A gate that silently drops what fails and says
/// nothing about what passed is indistinguishable, from the outside, from a gate that is off.
///
/// The four verdicts are not four shades of the same thing, and the wording matters more here
/// than anywhere else on the card:
///
///   Eligible     — every stated criterion was met. The only one that may sound confident.
///   CannotTell   — a criterion needs a fact nobody has given. Say what is missing, not "maybe".
///   Unchecked    — the posting records no criteria. Radar has not failed to check; there was
///                  nothing to check against, and claiming otherwise invents a verification.
///   NotEligible  — contradicted by something known. The server withholds these, so seeing one
///                  means the reader opened it deliberately from a saved list.
///
/// Undefined means no check ran for this surface — the saved and tracked lists do not gate,
/// because hiding something somebody kept on purpose would be wrong. That is a different
/// statement from Unchecked and renders as nothing at all rather than as a false reassurance.
export function EligibilityNote({
  verdict,
  notes,
}: {
  verdict?: EligibilityVerdict;
  notes?: string[];
}) {
  if (!verdict) return null;

  const reasons = notes ?? [];

  /// Unchecked with nothing to say is noise. A card that reads "Radar has not checked whether
  /// you can apply" on every listing teaches people to ignore the line, and then it is not there
  /// when it matters.
  if (verdict === "Unchecked" && reasons.length === 0) return null;

  return (
    <div className={`eligibility eligibility--${tone(verdict)}`}>
      <p className="eligibility__verdict">{headline(verdict)}</p>

      {reasons.length > 0 && (
        <ul className="eligibility__reasons">
          {reasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

/// The one line somebody reads if they read nothing else.
///
/// Phrased as what Radar knows rather than as advice. "You may not be eligible" is a hedge that
/// sounds like a judgement; "Radar could not check everything this asks for" is the same fact
/// without pretending to have made a decision it did not make.
function headline(verdict: EligibilityVerdict): string {
  switch (verdict) {
    case "Eligible":
      return "You meet everything this asks for";
    case "CannotTell":
      return "Radar could not check everything this asks for";
    case "NotEligible":
      return "You do not meet one of this opportunity's requirements";
    case "Unchecked":
      return "This listing does not say who can apply";
    default:
      // Exhaustive over the union today, so TypeScript is satisfied without this. At runtime a
      // verdict the client has not been taught yet would return undefined and render an empty
      // heading above a list of real reasons - a blank line where the summary should be. The
      // badge already degrades to "check requirements"; this matches it.
      return "Radar could not check everything this asks for";
  }
}

/// Three tones, not four.
///
/// Unchecked and CannotTell look the same on purpose: both mean Radar does not know, and giving
/// them different colours would imply a distinction the reader cannot act on. The difference is
/// in the words, where it belongs.
function tone(verdict: EligibilityVerdict): "yes" | "unknown" | "no" {
  if (verdict === "Eligible") return "yes";
  if (verdict === "NotEligible") return "no";
  return "unknown";
}

/// A short form for a dense list, where a full reason block would crowd everything else out.
///
/// Returns null rather than a neutral badge when nothing was checked. A badge that always appears
/// is a badge nobody reads, and an "Unchecked" chip on every card is worse than no chip at all.
export function EligibilityBadge({ verdict }: { verdict?: EligibilityVerdict }) {
  if (!verdict || verdict === "Unchecked") return null;

  return (
    <span className={`eligibility-badge eligibility-badge--${tone(verdict)}`}>
      {verdict === "Eligible" ? "Eligible" : verdict === "NotEligible" ? "Not eligible" : "Check requirements"}
    </span>
  );
}
