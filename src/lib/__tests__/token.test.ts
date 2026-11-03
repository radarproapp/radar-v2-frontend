import { describe, expect, it } from "vitest";
import { isAdminToken, roleFromToken } from "../token";

/// Reading the role out of the token.
///
/// This exists because the admin route guard read it off the profile instead, and an admin
/// account has no profile — so somebody who had just set their admin password signed in
/// successfully and then sat on a loading spinner forever. The role was in their token all along.

const ROLE_CLAIM = "http://schemas.microsoft.com/ws/2008/06/identity/claims/role";

/// A token shaped like the server's: three parts, base64url, unpadded.
function tokenFor(claims: Record<string, unknown>) {
  const body = btoa(JSON.stringify(claims))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  return `header.${body}.signature`;
}

describe("roleFromToken", () => {
  it.each(["SuperAdmin", "PlatformAdmin", "User"] as const)("reads %s off the .NET role claim", (role) => {
    expect(roleFromToken(tokenFor({ [ROLE_CLAIM]: role }))).toBe(role);
  });

  it("also reads a plain role claim", () => {
    expect(roleFromToken(tokenFor({ role: "SuperAdmin" }))).toBe("SuperAdmin");
  });

  /// <summary>Anything unreadable is null, never an exception.</summary>
  ///
  /// A malformed token is either from before this existed or has been tampered with, and
  /// tampering is caught by the signature at the server. Throwing here would blank the whole app
  /// instead of sending somebody to sign in.
  it.each([
    [null, "no token"],
    [undefined, "undefined"],
    ["", "empty"],
    ["not-a-token", "not three parts"],
    ["header.!!!notbase64!!!.signature", "an unreadable body"],
    ["header.eyJhIjoxfQ.signature", "no role claim"],
  ])("returns null for %s (%s)", (token: string | null | undefined, _why: string) => {
    expect(roleFromToken(token)).toBeNull();
  });

  it("returns null for a role it does not recognise", () => {
    expect(roleFromToken(tokenFor({ [ROLE_CLAIM]: "Owner" }))).toBeNull();
  });

  /// <summary>base64url is not what atob reads.</summary>
  ///
  /// The JWT alphabet swaps + and / for - and _, and drops the padding. Decoding without
  /// converting it back fails on roughly one token in three, which is the kind of bug that
  /// looks intermittent and gets blamed on the network.
  it("decodes a payload whose base64 needs padding and substitution", () => {
    // Padded to each of the three possible remainders, so none of them is left untested.
    for (const filler of ["a", "ab", "abc"]) {
      const token = tokenFor({ [ROLE_CLAIM]: "SuperAdmin", pad: filler, extra: "?~?~" });
      expect(roleFromToken(token)).toBe("SuperAdmin");
    }
  });
});

describe("isAdminToken", () => {
  it.each(["SuperAdmin", "PlatformAdmin"] as const)("is true for %s", (role) => {
    expect(isAdminToken(tokenFor({ [ROLE_CLAIM]: role }))).toBe(true);
  });

  it.each([["User"], [null]])("is false for %s", (role) => {
    expect(isAdminToken(role ? tokenFor({ [ROLE_CLAIM]: role }) : null)).toBe(false);
  });
});
