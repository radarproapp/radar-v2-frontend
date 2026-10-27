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
