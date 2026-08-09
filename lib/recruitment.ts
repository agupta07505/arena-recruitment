export type Division = "operations" | "esports" | "creative" | "technology";
export type EligibleYear = 1 | 2 | 3;

export type Position = {
  slug: string;
  title: string;
  capacity: number;
  eligibleYears: EligibleYear[];
  division: Division;
  summary: string;
  signal: string;
};

export const positions: Position[] = [
  {
    slug: "event-ops-lead",
    title: "Event Ops Lead",
    capacity: 1,
    eligibleYears: [3],
    division: "operations",
    summary: "Own the run-of-show and lead crews from first call to final whistle.",
    signal: "Lead the floor",
  },
  {
    slug: "event-coordination-logistics",
    title: "Event Coordination & Logistics",
    capacity: 5,
    eligibleYears: [2],
    division: "operations",
    summary: "Turn schedules, venues, equipment, and people into seamless match days.",
    signal: "Make it happen",
  },
  {
    slug: "esports-coordinator",
    title: "eSports Coordinator",
    capacity: 2,
    eligibleYears: [2],
    division: "esports",
    summary: "Operate brackets, lobbies, broadcasts, and fair competitive play.",
    signal: "Run the lobby",
  },
  {
    slug: "graphic-designer",
    title: "Graphic Designer",
    capacity: 2,
    eligibleYears: [1, 2],
    division: "creative",
    summary: "Build the visual language behind campaigns, match days, and stories.",
    signal: "Shape the signal",
  },
  {
    slug: "photographer",
    title: "Photographer",
    capacity: 1,
    eligibleYears: [2],
    division: "creative",
    summary: "Find the decisive moments on fields, courts, stages, and screens.",
    signal: "Frame the moment",
  },
  {
    slug: "video-editor",
    title: "Video Editor",
    capacity: 2,
    eligibleYears: [1, 2],
    division: "creative",
    summary: "Cut raw energy into recaps, promos, and stories people remember.",
    signal: "Cut the story",
  },
  {
    slug: "social-media-pr",
    title: "Social Media & PR",
    capacity: 1,
    eligibleYears: [2],
    division: "creative",
    summary: "Give every fixture, player, and milestone a clear public voice.",
    signal: "Own the narrative",
  },
  {
    slug: "tech-coordinator",
    title: "Tech Coordinator",
    capacity: 2,
    eligibleYears: [2],
    division: "technology",
    summary: "Build dependable registration, scoring, streaming, and web systems.",
    signal: "Power the system",
  },
];

export const totalOpenings = positions.reduce(
  (total, position) => total + position.capacity,
  0,
);

export function formatEligibleYears(years: EligibleYear[]) {
  return years.map((year) => `${year}${year === 1 ? "st" : year === 2 ? "nd" : "rd"}`).join(" / ");
}
