/** A compact, explainable subset of the uploaded ABS profile tables. */
export type AreaProfile = {
  code: string;
  name: string;
  population: number | null;
  medianAgeYears: number | null;
  medianPersonalIncomeWeeklyAud: number | null;
  medianHouseholdIncomeWeeklyAud: number | null;
  unemploymentRatePct: number | null;
  labourForceParticipationPct: number | null;
  irsadScore: number | null;
  irsadDecile: number | null;
  ierScore: number | null;
  ierDecile: number | null;
  censusYear: number | null;
  seifaYear: number | null;
  seifaStatus: string | null;
};

export type AreaProfileEvidence = {
  sal: AreaProfile | null;
  lga: (AreaProfile & { incomeYear: number | null; jobsYear: number | null }) | null;
};

/** Reads suburb and LGA evidence without exposing database access to the UI. */
export interface AreaProfileRepository {
  findForAreas(areas: ReadonlyArray<{ locality: string; lgaName: string }>): Promise<Map<string, AreaProfileEvidence>>;
}

/** Creates a stable lookup key for one ranked area. */
export function areaProfileKey(locality: string, lgaName: string): string {
  return `${locality.trim().toLocaleUpperCase("en-AU")}\u0000${lgaName.trim().toLocaleUpperCase("en-AU")}`;
}
