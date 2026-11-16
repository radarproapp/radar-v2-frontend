
/// The rules about answers that both the page and its tests need.
///
/// Separate from the component that renders them so a fast refresh of the UI does not reload
/// these, and so the page and the tests agree on what "enough" means rather than each deciding.

/// Whether there is enough here to submit.
///
/// Deliberately lenient: one answer anywhere is enough. The brief wants onboarding fast and
/// expects Radar to learn the rest from behaviour, so a screen that refuses to proceed until
/// every question is answered is the screen people abandon.
export function hasEnoughToSubmit(answers: Record<string, string[]>): boolean {
  return Object.values(answers).some((picked) => picked.length > 0);
}

/// Only the questions this person touched.
///
/// Three states, not two. An absent key leaves that answer alone on the server, which is what
/// makes a half-finished onboarding resumable. An empty array is a deliberate "none of these"
/// and clears it. A filled array sets it.
///
/// Filtering on non-empty collapses the first two, and the collapse is not harmless: the server
/// was deliberately changed so tapping a wrong qualification off would unset it — otherwise a
/// mis-tap is permanent, because the ordinary profile edit has no field for it — and a client
/// that can never send an empty array means that fix never reaches the wire.
export function touchedOnly(
  answers: Record<string, string[]>,
  touched: ReadonlySet<string>,
): Record<string, string[]> {
  return Object.fromEntries(Object.entries(answers).filter(([field]) => touched.has(field)));
}

/// The fields whose answer differs between two sheets, added to what was already touched.
///
/// Compared rather than assumed, so a change event that happens to produce the same answer does
/// not mark a question as answered. Touching is about what the person did, not how many events
/// the component emitted.
export function whatChanged(
  before: ReadonlySet<string>,
  previous: Record<string, string[]>,
  next: Record<string, string[]>,
): ReadonlySet<string> {
  const touched = new Set(before);

  for (const [field, picked] of Object.entries(next)) {
    const was = previous[field] ?? [];
    if (was.length !== picked.length || was.some((p, i) => p !== picked[i])) touched.add(field);
  }

  return touched;
}
