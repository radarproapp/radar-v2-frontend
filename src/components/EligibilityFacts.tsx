import { useState } from "react";
import type { UserProfile } from "../lib/types";

/// The facts an eligibility check needs and onboarding deliberately does not ask for.
///
/// Nationality, country of residence, years of experience and date of birth. Each one is a
/// criterion a posting can state and nothing on the profile held, so every opportunity requiring
/// one came back as "Radar could not check this".
///
/// Kept off the three questions on purpose. The brief is firm that onboarding stays three and
/// that Radar learns the rest; asking four strangers' worth of personal detail up front is how a
/// sign-up gets abandoned. This belongs on a profile screen, and ideally appears at the moment an
/// opportunity turns out to need it — "this asks for a nationality, tell Radar yours" is a
/// question somebody has a reason to answer.
///
/// Every field is optional and stays optional. Not answering keeps the verdict at "cannot tell",
/// which still shows the opportunity — so there is no penalty for declining, and the form should
/// not imply one.
export function EligibilityFacts({
  profile,
  onSave,
  saving,
}: {
  profile: UserProfile;
  onSave: (facts: {
    nationalities?: string[];
    countryOfResidence?: string;
    yearsOfExperience?: number;
    dateOfBirth?: string;
  }) => void;
  saving?: boolean;
}) {
  const [nationalities, setNationalities] = useState(profile.nationalities?.join(", ") ?? "");
  const [country, setCountry] = useState(profile.countryOfResidence ?? "");
  const [years, setYears] = useState(
    profile.yearsOfExperience === null || profile.yearsOfExperience === undefined
      ? ""
      : String(profile.yearsOfExperience),
  );
  const [born, setBorn] = useState(profile.dateOfBirth?.slice(0, 10) ?? "");

  function submit(event: React.FormEvent) {
    event.preventDefault();

    /// Only what was filled in. Sending an empty string for an untouched field would overwrite a
    /// stored answer with a blank, which is a different thing from leaving it alone.
    const facts: Parameters<typeof onSave>[0] = {};

    const listed = nationalities
      .split(",")
      .map((n) => n.trim())
      .filter(Boolean);
    if (listed.length > 0) facts.nationalities = listed;

    if (country.trim()) facts.countryOfResidence = country.trim();

    /// Parsed rather than coerced: Number("") is 0, and zero years is a real answer that a
    /// graduate scheme is specifically looking for. Sending it for an empty box would claim
    /// something nobody said.
    if (years.trim() !== "") {
      const parsed = Number.parseInt(years, 10);
      if (Number.isFinite(parsed) && parsed >= 0) facts.yearsOfExperience = parsed;
    }

    if (born) facts.dateOfBirth = born;

    onSave(facts);
  }

  return (
    <form className="eligibility-facts" onSubmit={submit}>
      <p className="eligibility-facts__why">
        Radar uses these only to check whether you can apply for something. Leave anything blank
        and Radar will say it could not check that, rather than guessing.
      </p>

      <label className="eligibility-facts__field">
        <span>Nationality</span>
        <input
          type="text"
          value={nationalities}
          onChange={(e) => setNationalities(e.target.value)}
          placeholder="Nigerian"
          autoComplete="off"
        />
        <small>
          Separate with commas if you hold more than one — a scholarship open to Nigerians is
          still open to you if you are Nigerian and something else.
        </small>
      </label>

      <label className="eligibility-facts__field">
        <span>Country you live in</span>
        <input
          type="text"
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          placeholder="Nigeria"
          autoComplete="country-name"
        />
        <small>Separate from nationality: a Nigerian studying in Ghana is still Nigerian.</small>
      </label>

      <label className="eligibility-facts__field">
        <span>Years of professional experience</span>
        <input
          type="number"
          min={0}
          max={70}
          value={years}
          onChange={(e) => setYears(e.target.value)}
          placeholder="2"
        />
        <small>Zero is a real answer — some programmes are looking for exactly that.</small>
      </label>

      <label className="eligibility-facts__field">
        <span>Date of birth</span>
        <input
          type="date"
          value={born}
          max={new Date().toISOString().slice(0, 10)}
          onChange={(e) => setBorn(e.target.value)}
        />
        <small>
          Used only for programmes with an age limit. Radar stores the date rather than your age,
          so it stays right as time passes.
        </small>
      </label>

      <button type="submit" className="eligibility-facts__save" disabled={saving}>
        {saving ? "Saving…" : "Save"}
      </button>
    </form>
  );
}
