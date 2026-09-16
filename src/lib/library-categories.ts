// Mirrors the category color/bg switches in Library.razor, extracted once here
// per REACT_MIGRATION.md §6. Falls back to a neutral gray for unknown categories.

const COLORS: Record<string, string> = {
  Climate: "#0e5f6b",
  Health: "#991b1b",
  Science: "#0f766e",
  Technology: "#1a4d8f",
  "Business & Finance": "#78350f",
  Politics: "#374151",
  Sports: "#14532d",
  Music: "#831843",
  "Film & TV": "#450a0a",
  Education: "#1e3a8a",
  Fashion: "#7e22ce",
  Lifestyle: "#c2410c",
  "Faith & Religion": "#78350f",
  Philosophy: "#3b0764",
  Environment: "#166534",
  Travel: "#0c4a6e",
  Medicine: "#991b1b",
  "Real Estate": "#b45309",
  Law: "#1e3a5f",
  "Books & Literature": "#713f12",
  History: "#92400e",
  "Gaming & Esports": "#5b21b6",
  "Art & Craft": "#9d174d",
};

const BACKGROUNDS: Record<string, string> = {
  Climate: "#e0f4f6",
  Health: "#fee2e2",
  Science: "#f0fdfa",
  Technology: "#ddeeff",
  "Business & Finance": "#fef3c7",
  Politics: "#f0f2f4",
  Sports: "#dcfce7",
  Music: "#fdf2f8",
  "Film & TV": "#fef2f2",
  Education: "#eff6ff",
  Fashion: "#f3e8ff",
  Lifestyle: "#fff7ed",
  "Faith & Religion": "#fffbeb",
  Philosophy: "#faf5ff",
  Environment: "#f0fdf4",
  Travel: "#e0f2fe",
  Medicine: "#fee2e2",
  "Real Estate": "#fef3c7",
  Law: "#e8f0fe",
  "Books & Literature": "#fefce8",
  History: "#fff7ed",
  "Gaming & Esports": "#ede9fe",
  "Art & Craft": "#fce7f3",
};

export function categoryColor(category: string): string {
  return COLORS[category] ?? "#374151";
}

export function categoryBg(category: string): string {
  return BACKGROUNDS[category] ?? "#f0f2f4";
}
