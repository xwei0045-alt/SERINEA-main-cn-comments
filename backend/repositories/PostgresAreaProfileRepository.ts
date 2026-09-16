import type { QueryResultRow } from "pg";
import type { PostgresDatabase } from "@/backend/database/PostgresDatabase";
import {
  areaProfileKey,
  type AreaProfile,
  type AreaProfileEvidence,
  type AreaProfileRepository
} from "./AreaProfileRepository";

type ProfileRow = QueryResultRow & {
  code: string;
  name: string;
  population: string | number | null;
  medianAgeYears: string | number | null;
  medianPersonalIncomeWeeklyAud: string | number | null;
  medianHouseholdIncomeWeeklyAud: string | number | null;
  unemploymentRatePct: string | number | null;
  labourForceParticipationPct: string | number | null;
  irsadScore: string | number | null;
  irsadDecile: string | number | null;
  ierScore: string | number | null;
  ierDecile: string | number | null;
  censusYear: string | number | null;
  seifaYear: string | number | null;
  seifaStatus: string | null;
  incomeYear?: string | number | null;
  jobsYear?: string | number | null;
};

/** Converts PostgreSQL numeric strings while preserving unavailable values as null. */
function nullableNumber(value: string | number | null | undefined): number | null {
  if (value == null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Maps one database row to the small profile shape returned by the backend. */
function mapProfile(row: ProfileRow): AreaProfile {
  return {
    code: row.code,
    name: row.name,
    population: nullableNumber(row.population),
    medianAgeYears: nullableNumber(row.medianAgeYears),
    medianPersonalIncomeWeeklyAud: nullableNumber(row.medianPersonalIncomeWeeklyAud),
    medianHouseholdIncomeWeeklyAud: nullableNumber(row.medianHouseholdIncomeWeeklyAud),
    unemploymentRatePct: nullableNumber(row.unemploymentRatePct),
    labourForceParticipationPct: nullableNumber(row.labourForceParticipationPct),
    irsadScore: nullableNumber(row.irsadScore),
    irsadDecile: nullableNumber(row.irsadDecile),
    ierScore: nullableNumber(row.ierScore),
    ierDecile: nullableNumber(row.ierDecile),
    censusYear: nullableNumber(row.censusYear),
    seifaYear: nullableNumber(row.seifaYear),
    seifaStatus: row.seifaStatus
  };
}

/** Reads SAL and LGA profiles in two batched, parameterised queries. */
export class PostgresAreaProfileRepository implements AreaProfileRepository {
  /** Stores the shared database connection used by the other repositories. */
  constructor(private readonly database: PostgresDatabase) {}

  /** Finds profile evidence for the ranked areas without treating null as zero. */
  async findForAreas(areas: ReadonlyArray<{ locality: string; lgaName: string }>): Promise<Map<string, AreaProfileEvidence>> {
    const localityNames = [...new Set(areas.map((area) => area.locality.trim()).filter(Boolean))];
    const lgaNames = [...new Set(areas.map((area) => area.lgaName.trim()).filter(Boolean))];
    if (!areas.length) return new Map();

    const [salResult, lgaResult] = await Promise.all([
      this.database.query<ProfileRow>(`SELECT
        sal_code AS code, sal_name AS name, census_population AS population,
        median_age_years AS "medianAgeYears",
        census_median_personal_income_weekly_aud AS "medianPersonalIncomeWeeklyAud",
        census_median_household_income_weekly_aud AS "medianHouseholdIncomeWeeklyAud",
        unemployment_rate_pct AS "unemploymentRatePct",
        labour_force_participation_pct AS "labourForceParticipationPct",
        irsad_score AS "irsadScore", irsad_decile AS "irsadDecile",
        ier_score AS "ierScore", ier_decile AS "ierDecile",
        census_year AS "censusYear", seifa_year AS "seifaYear", seifa_status AS "seifaStatus"
        FROM public.sal_profiles WHERE UPPER(sal_name) = ANY($1::text[])`,
      [localityNames.map((name) => name.toLocaleUpperCase("en-AU"))]),
      this.database.query<ProfileRow>(`SELECT
        lga_code AS code, lga_name AS name, census_population AS population,
        median_age_years AS "medianAgeYears",
        census_median_personal_income_weekly_aud AS "medianPersonalIncomeWeeklyAud",
        census_median_household_income_weekly_aud AS "medianHouseholdIncomeWeeklyAud",
        unemployment_rate_pct AS "unemploymentRatePct",
        labour_force_participation_pct AS "labourForceParticipationPct",
        irsad_score AS "irsadScore", irsad_decile AS "irsadDecile",
        ier_score AS "ierScore", ier_decile AS "ierDecile",
        census_year AS "censusYear", seifa_year AS "seifaYear", seifa_status AS "seifaStatus",
        income_year AS "incomeYear", jobs_year AS "jobsYear"
        FROM public.lga_profiles WHERE UPPER(lga_name) = ANY($1::text[])`,
      [lgaNames.map((name) => name.toLocaleUpperCase("en-AU"))])
    ]);

    // A duplicated SAL name is ambiguous because the supplied SAL table has no LGA key.
    const salBuckets = new Map<string, ProfileRow[]>();
    for (const row of salResult.rows) {
      const key = row.name.toLocaleUpperCase("en-AU");
      salBuckets.set(key, [...(salBuckets.get(key) ?? []), row]);
    }
    const lgaByName = new Map(lgaResult.rows.map((row) => [row.name.toLocaleUpperCase("en-AU"), row]));

    const output = new Map<string, AreaProfileEvidence>();
    for (const area of areas) {
      const salRows = salBuckets.get(area.locality.toLocaleUpperCase("en-AU")) ?? [];
      const lgaRow = lgaByName.get(area.lgaName.toLocaleUpperCase("en-AU"));
      output.set(areaProfileKey(area.locality, area.lgaName), {
        sal: salRows.length === 1 ? mapProfile(salRows[0]) : null,
        lga: lgaRow ? {
          ...mapProfile(lgaRow),
          incomeYear: nullableNumber(lgaRow.incomeYear),
          jobsYear: nullableNumber(lgaRow.jobsYear)
        } : null
      });
    }
    return output;
  }
}
