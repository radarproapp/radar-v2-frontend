// Single source of truth for selectable interests — shared by Onboarding and EditProfile so the
// two pickers can't drift out of sync with each other or with the backend's interest→layer
// mapping (see InterestLayerMapper.cs, which every category here should have a match in).
export const INTEREST_GROUPS: [string, string[]][] = [
  ["Technology", ["Artificial Intelligence", "Machine Learning", "Data Science", "Software Engineering", "Cloud Computing", "Cybersecurity", "UI/UX", "Product Management"]],
  ["Business", ["Entrepreneurship", "Marketing", "Finance", "Economics", "Leadership", "Strategy", "Investment", "Real Estate"]],
  ["Research & Academia", ["Academic Writing", "Research Methods", "Statistics", "Systematic Reviews", "History"]],
  ["Professional Fields", ["Medicine", "Law", "Public Policy", "Engineering", "Agriculture", "Education", "Psychology", "Climate Change", "Industry & Manufacturing", "Transportation & Logistics"]],
  ["Creative Fields", ["Design", "Photography", "Content Creation", "Film", "Music"]],
  ["Sports & Games", ["Sports", "Gaming"]],
  ["Lifestyle & Culture", ["Travel", "Fashion", "Faith & Spirituality", "Lifestyle", "Literature"]],
];

export const ALL_INTERESTS: string[] = INTEREST_GROUPS.flatMap(([, items]) => items);
