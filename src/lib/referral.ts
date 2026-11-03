/// The referral code somebody arrived with, remembered until they finish signing up.
///
/// A code arrives on a link - /join/ABC2345 - and sign-up happens two or three screens later,
/// after they have picked a category and typed their details. Without somewhere to keep it, the
/// code is gone by the time the account is created and the participant who brought them gets
/// nothing. That is the whole scheme failing quietly, on the one path it exists for.
///
/// sessionStorage rather than localStorage: it belongs to this visit. A code left in
/// localStorage would still be there in a month and would attribute an account to a link
/// somebody followed once and forgot, which is a false claim about where a user came from.

const KEY = "radar:referred-by";

/// Letters a code is drawn from. The same alphabet the server uses, which deliberately leaves
/// out O, 0, I, 1 and L - a code gets read off a phone and typed back in by somebody else.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const LENGTH = 7;

/// A code as typed, in the form the server stores, or null.
///
/// Mirrors the server's own rule so the link in the address bar and the code sent on sign-up
/// cannot disagree. Accepts a bare code, a full link, lower case, and the hyphen a design might
/// add for readability.
export function readCode(raw: string | null | undefined): string | null {
  if (!raw) return null;

  // The last part of a link, when a link is what was pasted, and without any query or fragment.
  const trimmed = raw.trim().split(/[?#]/)[0].replace(/\/+$/, "");
  const segment = trimmed.slice(trimmed.lastIndexOf("/") + 1);

  const cleaned = [...segment.toUpperCase()].filter((c) => ALPHABET.includes(c)).join("");

  return cleaned.length === LENGTH ? cleaned : null;
}

/// Keeps a code for the rest of this visit.
export function rememberCode(raw: string | null | undefined): string | null {
  const code = readCode(raw);
  if (!code) return null;

  try {
    window.sessionStorage.setItem(KEY, code);
  } catch {
    // Private mode, or storage disabled. The sign-up still works; it is simply unattributed,
    // which is better than refusing to let somebody join.
  }

  return code;
}

/// The code this visit arrived with, if any.
export function rememberedCode(): string | undefined {
  try {
    return window.sessionStorage.getItem(KEY) ?? undefined;
  } catch {
    return undefined;
  }
}

/// Forgets it once an account exists, so a later sign-up on the same device - a shared laptop
/// in a campus library - is not attributed to a link the second person never followed.
export function forgetCode(): void {
  try {
    window.sessionStorage.removeItem(KEY);
  } catch {
    // Nothing to forget.
  }
}
