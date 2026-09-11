// Mirrors RadarV2/Helpers/DateHelper.cs Humanize().
export function humanize(dateIso: string): string {
  const diffMs = Date.now() - new Date(dateIso).getTime();
  const minutes = diffMs / 60000;

  if (minutes < 2) return "just now";
  if (minutes < 60) return `${Math.floor(minutes)}m ago`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
  if (minutes < 2880) return "yesterday";
  return `${Math.floor(minutes / 1440)}d ago`;
}
