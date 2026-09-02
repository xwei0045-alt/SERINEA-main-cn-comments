/** Scroll-reel story — rural / regional Victoria framing. Roles until real names are pasted. */

export type TeamSeat = {
  id: string;
  role: string;
  focus: string;
  short: string;
};

export type Phase = {
  id: string;
  n: string;
  title: string;
  body: string;
};

export type FunFact = {
  id: string;
  kicker: string;
  line: string;
};

export type ChapterId =
  | "name"
  | "lie"
  | "cut"
  | "orbit"
  | "filter"
  | "crew"
  | "lock"
  | "phase"
  | "fact"
  | "go";

export const TEAM: TeamSeat[] = [
  { id: "ds", role: "Data Science", focus: "Reach maths for sparse routes", short: "DS" },
  { id: "it", role: "IT Systems", focus: "App stack & map plumbing", short: "IT" },
  { id: "ai", role: "AI", focus: "Smarter defaults on thin networks", short: "AI" },
  { id: "bis", role: "BIS", focus: "Town needs & stakeholder fit", short: "BIS" },
  { id: "cyber", role: "Cybersecurity", focus: "Keep pins & paths from leaking", short: "SEC" },
  { id: "ux", role: "Experience", focus: "Clear reach for rural towns & settlements", short: "UX" }
];

export const PHASES: Phase[] = [
  {
    id: "i1",
    n: "01",
    title: "Hard fifteen, round trip",
    body: "Drop a pin in a small town. Keep only places you can reach and return from on PT in 15."
  },
  {
    id: "i2",
    n: "02",
    title: "Small towns & regional Victoria",
    body: "Built for places with one bus line and a long wait — not inner-city frequency."
  },
  {
    id: "i3",
    n: "03",
    title: "Where the network thins out",
    body: "Surface the gaps between services — the hour after the pin still matters."
  }
];

export const FACTS: FunFact[] = [
  {
    id: "f1",
    kicker: "Small towns first",
    line: "For regional and rural life — where the GP, shop, and bus stop rarely sit on the same street."
  },
  {
    id: "f2",
    kicker: "Hard window",
    line: "No 30. No 60. Fifteen is the product — there and back."
  },
  {
    id: "f3",
    kicker: "Team SERINEA",
    line: "Six of us · TA06 · FIT5120 — rural reach without the marketing fluff."
  }
];

export const BEATS = [
  { at: 0, label: "NAME" },
  { at: 0.08, label: "LIE" },
  { at: 0.16, label: "CUT" },
  { at: 0.32, label: "ORBIT" },
  { at: 0.52, label: "FILTER" },
  { at: 0.66, label: "CREW" },
  { at: 0.78, label: "LOCK" },
  { at: 0.87, label: "PHASE" },
  { at: 0.93, label: "FACT" },
  { at: 0.98, label: "GO" }
] as const;

export function chapterAt(p: number): ChapterId {
  if (p < 0.08) return "name";
  if (p < 0.16) return "lie";
  if (p < 0.32) return "cut";
  if (p < 0.52) return "orbit";
  if (p < 0.66) return "filter";
  if (p < 0.78) return "crew";
  if (p < 0.87) return "lock";
  if (p < 0.93) return "phase";
  if (p < 0.98) return "fact";
  return "go";
}
