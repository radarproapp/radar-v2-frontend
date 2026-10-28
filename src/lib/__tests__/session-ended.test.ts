import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { endsTheSession, getMe, login, onSessionEnded, setToken } from "../api";

/// A refused token has to end the session wherever it is refused.
///
/// This was watched for on the profile query alone, which was enough while a token could only stop
/// working by expiring thirty days later. A password reset now ends every session on the account
/// the moment it happens, so the first call to be refused is whatever the user was doing — and
/// every page renders its own message for a failed query, so the symptom was "Could not load the
/// feed." on a screen the app still believed was signed in, with no way out but a reload.

describe("which 401s mean the session has ended", () => {
  it("counts a refused token on an ordinary call", () => {
    expect(endsTheSession(401, "/api/feed", true)).toBe(true);
  });

  it("ignores a 401 from signing in, which means the password was wrong", () => {
    expect(endsTheSession(401, "/api/auth/login", true)).toBe(false);
    expect(endsTheSession(401, "/api/admin/auth/login", true)).toBe(false);
  });

  it("ignores the reset endpoints, which are reached without a session on purpose", () => {
    expect(endsTheSession(401, "/api/auth/forgot-password", true)).toBe(false);
    expect(endsTheSession(401, "/api/auth/reset-password", true)).toBe(false);
  });

  it("ignores a call made without a token, which the route guard already covers", () => {
    expect(endsTheSession(401, "/api/feed", false)).toBe(false);
  });

  it("ignores every other failure, including the ones that look like it", () => {
    expect(endsTheSession(403, "/api/feed", true)).toBe(false);
    expect(endsTheSession(404, "/api/feed", true)).toBe(false);
    expect(endsTheSession(500, "/api/feed", true)).toBe(false);
  });
});

describe("telling the app about it", () => {
  const store = new Map<string, string>();

  beforeEach(() => {
    store.clear();

    // getToken reads localStorage, which the node environment these tests run in does not have.
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, value),
      removeItem: (key: string) => void store.delete(key),
      clear: () => store.clear(),
      key: () => null,
      length: 0,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function respond(status: number) {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status, headers: { "content-type": "application/json" } },
    )));
  }

  it("notifies when the server refuses the token", async () => {
    setToken("a-token");
    respond(401);

    const listener = vi.fn();
    const stop = onSessionEnded(listener);

    await expect(getMe()).rejects.toThrow();
    expect(listener).toHaveBeenCalledOnce();

    stop();
  });

  /// The notification has to happen whether or not the caller handles the error, because every
  /// caller handles it differently and most of them only render a message.
  it("notifies before the caller sees the error", async () => {
    setToken("a-token");
    respond(401);

    const seen: string[] = [];
    const stop = onSessionEnded(() => seen.push("session ended"));

    await getMe().catch(() => seen.push("caller caught it"));

    expect(seen).toEqual(["session ended", "caller caught it"]);
    stop();
  });

  it("stays quiet when a sign-in is rejected", async () => {
    setToken("a-token");
    respond(401);

    const listener = vi.fn();
    const stop = onSessionEnded(listener);

    await expect(login("someone@example.com", "wrong")).rejects.toThrow();
    expect(listener).not.toHaveBeenCalled();

    stop();
  });

  it("stops notifying once unsubscribed", async () => {
    setToken("a-token");
    respond(401);

    const listener = vi.fn();
    onSessionEnded(listener)();

    await expect(getMe()).rejects.toThrow();
    expect(listener).not.toHaveBeenCalled();
  });
});
