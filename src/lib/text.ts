/// Strips markdown from model output so responses read as clean prose rather than
/// "# Heading / **bold** / * bullet" markup. Keeps line breaks (callers render with pre-wrap)
/// and turns list markers into a simple bullet.
export function plainText(input: string): string {
  if (!input) return "";
  return input
    .replace(/\r/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // [label](url) -> label
    .replace(/\*\*(.*?)\*\*/g, "$1") // **bold** -> bold
    .replace(/__([^_]+)__/g, "$1") // __bold__ -> bold
    .replace(/`{1,3}([^`]*?)`{1,3}/g, "$1") // `code` -> code
    .replace(/^[ \t]{0,3}#{1,6}[ \t]*/gm, "") // ### Heading -> Heading
    .replace(/^[ \t]*([-*_]){3,}[ \t]*$/gm, "") // --- horizontal rule
    .replace(/^[ \t]*[-*+][ \t]+/gm, "• ") // - item -> • item
    .replace(/[*#_`]/g, "") // any remaining markdown symbols
    .replace(/^\s*\n/gm, "") // blank lines left by removed headings
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
