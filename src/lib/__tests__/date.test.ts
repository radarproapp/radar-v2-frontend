import { describe, expect, it } from "vitest";
import { humanize } from "../date";

/// A feed timestamp rendered as "-1479554m ago" in a review screenshot. This mirrors the C# test
/// on DateHelper, because the two implementations must agree — the same item can be rendered by
/// either, and a user seeing different times for one item has no way to know which to trust.
describe("humanize", () => {
  const minutesAgo = (n: number) => new Date(Date.now() - n * 60_000).toISOString();

  it("never renders a future date as negative", () => {
    const future = new Date(Date.now() + 30 * 86_400_000).toISOString();
    expect(humanize(future)).not.toContain("-");
  });

  it("reads very recent items as 'just now'", () => {
    expect(humanize(minutesAgo(0))).toBe("just now");
    expect(humanize(minutesAgo(1))).toBe("just now");
  });

  it("distinguishes minutes, hours and days", () => {
    expect(humanize(minutesAgo(30))).toMatch(/m ago$/);
    expect(humanize(minutesAgo(60 * 5))).toMatch(/h ago$/);
    expect(humanize(minutesAgo(60 * 24 * 10))).toMatch(/d ago$/);
  });

  it("names yesterday", () => {
    expect(humanize(minutesAgo(60 * 30))).toBe("yesterday");
  });
});
