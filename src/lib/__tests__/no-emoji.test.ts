import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/// Emoji are not icons.
///
/// They render differently on every platform — Apple, Google and Microsoft each draw their own, so
/// a screen designed against one set is a different screen on another. They sit on the text
/// baseline instead of aligning to it, they cannot be recoloured to match a theme or a disabled
/// state, and a screen reader announces the full Unicode name ("rocket", "high voltage") in the
/// middle of a sentence that was never written to contain it.
///
/// The range below is wider than it first looked. The first version of this guard started at
/// U+2600 and happily reported zero while a stopwatch (U+23F1), play triangles (U+25B6) and the
/// chevrons used as expand/collapse arrows were all still on screen. Arrows (U+2190–21FF) and box
/// drawing (U+2500–257F) stay allowed on purpose: this codebase uses them in comment separators
/// and in ordinary prose, and they are typography rather than pictures.
const EMOJI =
  /[\u{1F000}-\u{1FAFF}\u{2300}-\u{23FF}\u{25A0}-\u{25FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{2B00}-\u{2BFF}]/u;

function sourceFiles(dir: string, found: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules") continue;
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      sourceFiles(path, found);
    } else if (/\.(ts|tsx|css|html)$/.test(entry)) {
      found.push(path);
    }
  }
  return found;
}

describe("no emoji in the interface", () => {
  it("every source file uses named icons instead", () => {
    const offenders: string[] = [];

    for (const path of sourceFiles("src")) {
      // This file necessarily contains the ranges it is testing for.
      if (path.endsWith("no-emoji.test.ts")) continue;

      readFileSync(path, "utf8")
        .split("\n")
        .forEach((line, index) => {
          if (EMOJI.test(line)) {
            offenders.push(`${path}:${index + 1}  ${line.trim().slice(0, 70)}`);
          }
        });
    }

    expect(
      offenders,
      `Use <Icon name="..." /> from components/Icon instead.\n${offenders.join("\n")}`,
    ).toEqual([]);
  });
});
