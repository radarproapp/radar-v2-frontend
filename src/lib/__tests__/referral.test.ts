// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";
import { forgetCode, readCode, rememberCode, rememberedCode } from "../referral";

/// Remembering who brought somebody, from the link to the finished account.
///
/// A code arrives on a link and sign-up happens two or three screens later. Without somewhere
/// to keep it, the code is gone by the time the account is created and the participant who
/// brought them gets nothing - the whole scheme failing quietly, on the one path it exists for.

describe("reading a code", () => {
  /// Every shape somebody actually pastes.
  it.each([
    ["ABC2345", "a bare code"],
    ["abc2345", "lower case"],
    ["  abc2345  ", "with whitespace"],
    ["ABC-2345", "with a hyphen a design added"],
    ["https://www.radarproapp.com/join/ABC2345", "the whole link"],
    ["radarproapp.com/join/ABC2345/", "a link with a trailing slash"],
    ["https://www.radarproapp.com/join/ABC2345?utm_source=whatsapp", "a link a share button added tracking to"],
    ["https://www.radarproapp.com/join/ABC2345#top", "a link with a fragment"],
  ])("reads %s (%s)", (raw) => {
    expect(readCode(raw)).toBe("ABC2345");
  });

  /// And something that is not a code is not quietly turned into one.
  it.each([null, undefined, "", "   ", "ABC", "TOOLONGFORACODE", "https://www.radarproapp.com/"])(
    "returns null for %s",
    (raw) => {
      expect(readCode(raw)).toBeNull();
    },
  );

  /// <summary>The alphabet leaves out the characters that get confused.</summary>
  ///
  /// A code is read off a phone, written on a whiteboard at a society meeting and typed back in
  /// by somebody else. O against 0 and I against 1 cost a sign-up each time, so the server does
  /// not issue them - and a code containing one is not a code this client should accept either.
  it("does not accept a code containing a confusable character", () => {
    expect(readCode("ABC2O45")).toBeNull();
    expect(readCode("ABC2I45")).toBeNull();
  });
});

describe("keeping it for the visit", () => {
  beforeEach(() => window.sessionStorage.clear());

  it("remembers a code from a link until sign-up", () => {
    rememberCode("https://www.radarproapp.com/join/ABC2345");

    expect(rememberedCode()).toBe("ABC2345");
  });

  it("remembers nothing when the link carried nothing readable", () => {
    rememberCode("https://www.radarproapp.com/join/broken");

    expect(rememberedCode()).toBeUndefined();
  });

  /// <summary>Forgotten once an account exists.</summary>
  ///
  /// A shared laptop in a campus library is the ordinary case. Without this, the second person
  /// to sign up on that machine is attributed to a link they never followed - which is a false
  /// claim about where a user came from, and it inflates somebody's standing.
  it("forgets the code once it has been used", () => {
    rememberCode("ABC2345");
    forgetCode();

    expect(rememberedCode()).toBeUndefined();
  });

  /// <summary>A later link replaces an earlier one.</summary>
  ///
  /// Two participants share Radar with the same person in the same afternoon. The one whose
  /// link they actually followed last is the one standing with them when they sign up.
  it("keeps the most recent link followed", () => {
    rememberCode("ABC2345");
    rememberCode("XYZ9876");

    expect(rememberedCode()).toBe("XYZ9876");
  });
});
