// The weekly intelligence brief surfaces from Saturday 18:00 through the end of the week (local
// device time) rather than being available every day — it's meant to read as "your week, wrapped
// up," not a page that's always sitting there half-current.
export function isWeeklyBriefUnlocked(date = new Date()): boolean {
  const day = date.getDay(); // 0 = Sunday, 6 = Saturday
  return day === 0 || (day === 6 && date.getHours() >= 18);
}
