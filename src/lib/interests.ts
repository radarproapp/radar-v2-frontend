// Selectable interests shared by onboarding and profile editing.
export const INTEREST_GROUPS: [string, string[]][] = [
  ["Technology", [
    "Artificial Intelligence", "Machine Learning", "Generative AI / LLMs", "AI Agents & Automation", "Prompt Engineering", "AI Ethics & Safety", "Data Science", "Software Engineering", "Computer Science", "Cloud Computing", "Cybersecurity", "UI/UX Design", "Product Management", "DevOps & Platform Engineering", "Blockchain & Web3", "Mobile Development", "Web Development", "Database & Data Engineering", "Computer Vision", "Natural Language Processing", "MLOps", "Quantum Computing", "Edge Computing & IoT", "Robotics", "AR/VR / Spatial Computing", "No-code / Low-code", "Technical Writing", "System Design",
  ]],
  ["Business", [
    "Entrepreneurship", "Marketing", "Growth Marketing", "Brand Strategy", "Sales & Business Development", "Customer Success", "Product-Led Growth", "Leadership", "Strategy", "Corporate Strategy", "Operations & Scaling", "Organizational Design", "Economics", "Negotiation", "ESG & Sustainable Business", "E-commerce & Marketplaces", "Freelance / Solopreneurship", "Startup Fundraising", "Venture Capital (founder's perspective)",
  ]],
  ["Finance, Banking & Investment", [
    "Personal Finance", "Wealth Management", "Financial Planning", "Banking", "Investment Banking", "Private Banking", "Corporate Finance", "Financial Analysis", "Financial Modeling", "Valuation", "Equity Research", "Portfolio Management", "Asset Management", "Hedge Funds", "Private Equity", "Venture Capital (investor side)", "Public Markets / Stock Investing", "Cryptocurrency & Digital Assets", "FinTech", "Quantitative Finance", "Risk Management", "Compliance & Regulation", "Accounting & Auditing", "Taxation", "Insurance", "Real Estate Investment", "Alternative Investments", "Behavioral Finance", "Macroeconomics & Monetary Policy",
  ]],
  ["Research & Academia", [
    "Academic Writing", "Research Methods", "Qualitative Research", "Quantitative Research", "Experimental Design", "Statistics", "Systematic Reviews", "Literature Reviews", "Grant Writing", "Peer Review", "Open Science", "Science Communication", "Research Impact & Bibliometrics", "Interdisciplinary Research", "Philosophy of Science", "History", "Archival Research", "Ethnography",
  ]],
  ["Professional Fields", [
    "Medicine", "Nursing & Allied Health", "Public Health", "Law", "Intellectual Property", "Corporate Law", "Public Policy", "Engineering", "Civil / Mechanical / Electrical Engineering", "Chemical & Materials Engineering", "Agriculture & AgriTech", "Education", "EdTech", "Psychology", "Clinical Psychology", "Organizational Psychology", "Climate Change", "Climate Tech", "Sustainability", "Energy Systems", "Industry & Manufacturing", "Transportation & Logistics", "Supply Chain", "Urban Planning", "Food Systems", "Defense & Security", "Nonprofit & Social Impact",
  ]],
  ["Creative Fields", [
    "Design (Graphic / Product / Industrial)", "UX/UI Design", "Interior Design", "Fashion Design", "Photography", "Content Creation", "Film & Video Production", "Screenwriting", "Music", "Music Production", "Animation & Motion Design", "Illustration", "3D Modeling & CGI", "Game Design", "Creative Direction", "Copywriting", "Architecture", "Podcasting",
  ]],
  ["Sports & Games", ["Sports", "Sports Analytics", "Fitness & Training", "Sports Nutrition", "Coaching", "Sports Psychology", "Outdoor & Adventure Sports", "Gaming", "Esports", "Game Development", "Tabletop Games", "Streaming", "Fantasy Sports"]],
  ["Lifestyle & Culture", ["Travel", "Fashion", "Faith & Spirituality", "Literature", "Personal Development", "Productivity", "Mindfulness & Mental Health", "Cooking & Culinary Arts", "Home & Living", "Parenting", "Relationships", "Philosophy", "Languages", "Cultural Studies", "Art History", "Minimalism", "Digital Nomad Lifestyle", "Sustainability (personal)"]],
  ["Academic Programs · STEM & Technology", ["Computer Science", "Data Science", "Artificial Intelligence", "Software Engineering", "Information Technology", "Cybersecurity", "Computer Engineering", "Mechanical Engineering", "Electrical Engineering", "Civil Engineering", "Chemical Engineering", "Biomedical Engineering", "Aerospace Engineering", "Industrial Engineering", "Mathematics", "Statistics", "Physics", "Chemistry", "Biology", "Biochemistry", "Neuroscience", "Environmental Science"]],
  ["Academic Programs · Business & Management", ["Business Administration", "Management", "Finance", "Accounting", "Marketing", "Economics", "International Business", "Human Resource Management", "Supply Chain Management", "Entrepreneurship", "Business Analytics"]],
  ["Academic Programs · Health & Medicine", ["Medicine", "Nursing", "Pharmacy", "Public Health", "Dentistry", "Veterinary Medicine", "Physiotherapy", "Occupational Therapy", "Biomedical Sciences", "Nutrition & Dietetics"]],
  ["Academic Programs · Social Sciences & Humanities", ["Psychology", "Political Science", "International Relations", "Sociology", "History", "English / Literature", "Philosophy", "Anthropology", "Communications", "Journalism", "Social Work", "Criminology", "Public Policy"]],
  ["Academic Programs · Education & Professional", ["Education", "Early Childhood Education", "Law", "Architecture"]],
  ["Academic Programs · Creative & Applied", ["Design", "Fine Arts", "Film & Media Studies", "Music", "Hospitality Management"]],
];

// Academic programs intentionally repeat a few interests. Keep picker operations and payloads unique.
export const ALL_INTERESTS: string[] = [...new Set(INTEREST_GROUPS.flatMap(([, items]) => items))];
