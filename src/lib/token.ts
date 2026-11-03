/// Reading the role out of the token, for routing only.
///
/// An admin account has no profile. It exists to run Radar, not to read it, so `/api/me` answers
/// 404 for one — and the admin route guard read `profile.role`, so somebody who had just set
/// their password signed in successfully and then sat on a loading spinner forever. The role was
/// in their token the whole time.
///
/// This decides which screen to show and nothing else. Authorisation is the server's: every admin
/// endpoint checks the role on the token it was sent, so a forged claim here buys a glimpse of an
/// admin shell whose every request comes back 401 or 403. Never treat this as permission.

const ROLE_CLAIM = "http://schemas.microsoft.com/ws/2008/06/identity/claims/role";

export type Role = "User" | "PlatformAdmin" | "SuperAdmin";

/// The role a token claims, or null if it carries none we recognise.
///
/// Anything unreadable is null rather than an exception. A malformed token is either from before
/// this existed or has been tampered with, and tampering is caught by the signature at the server
/// — so there is nothing for this to defend against by being strict, and throwing here would blank
/// the whole app instead of sending somebody to sign in.
export function roleFromToken(token: string | null | undefined): Role | null {
  if (!token) return null;

  const parts = token.split(".");
  if (parts.length !== 3) return null;

  try {
    // base64url, which is not what atob reads: the JWT alphabet swaps + and / for - and _, and
    // drops the padding. Decoding without converting it fails on roughly one token in three,
    // which is the kind of bug that looks intermittent.
    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = payload.padEnd(payload.length + ((4 - (payload.length % 4)) % 4), "=");

    const claims = JSON.parse(atob(padded)) as Record<string, unknown>;
    const role = claims[ROLE_CLAIM] ?? claims.role;

    return role === "SuperAdmin" || role === "PlatformAdmin" || role === "User" ? role : null;
  } catch {
    return null;
  }
}

/// Whether a token claims one of the two roles that can reach the admin area.
export function isAdminToken(token: string | null | undefined): boolean {
  const role = roleFromToken(token);
  return role === "SuperAdmin" || role === "PlatformAdmin";
}
