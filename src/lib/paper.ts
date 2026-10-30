/// Reading a paper's header fields without asserting anything they do not say.
///
/// OpenAlex records are uneven: a work can arrive with no publication date, with one author or
/// with ninety, and with a venue the record calls a journal when it is a book chapter. These two
/// helpers only shorten; neither infers a missing value, and both return null rather than a
/// plausible placeholder so the card can leave the slot out.

/// The publication year, or null when the record has no usable date.
export function paperYear(publishedAt: string | null | undefined): string | null {
  if (!publishedAt) return null;

  const parsed = new Date(publishedAt);
  return Number.isNaN(parsed.getTime()) ? null : String(parsed.getUTCFullYear());
}

/// The publication date, which the spec asks for by name on every result.
///
/// The year alone was shown. For a 2019 paper that is all anybody wants, but research moves in
/// months in some fields, and "2026" on a preprint from last week reads as though Radar does not
/// know when it came out. The full date when the source recorded one, the year when that is
/// genuinely all it gave - never a month invented to make the line look complete.
export function paperDate(publishedAt: string | null | undefined): string | null {
  if (!publishedAt) return null;

  const parsed = new Date(publishedAt);
  if (Number.isNaN(parsed.getTime())) return null;

  // OpenAlex reports a date it does not always have, and a work it only knows the year for
  // arrives as the first of January. Showing "1 January 2019" would be a precision nothing
  // supports, so a date that lands exactly there is reported as the year.
  const isJanuaryFirst = parsed.getUTCMonth() === 0 && parsed.getUTCDate() === 1;
  if (isJanuaryFirst) return String(parsed.getUTCFullYear());

  return parsed.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/// "Vaswani, Shazeer, Parmar + 5 more" — enough to recognise the work without a wall of names.
///
/// Truncated rather than elided with "et al.", which in a reference list means something
/// specific about author count and citation style. This is a card, not a citation: the citation
/// comes from the backend, formatted properly.
export function paperAuthorLine(authors: string[] | null | undefined): string | null {
  const named = (authors ?? []).map((a) => a.trim()).filter((a) => a.length > 0);

  if (named.length === 0) return null;
  if (named.length <= 3) return named.join(", ");

  return `${named.slice(0, 3).join(", ")} + ${named.length - 3} more`;
}
