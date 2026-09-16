import type { QueryResultRow } from "pg";
import type { PostgresDatabase } from "@/backend/database/PostgresDatabase";
import {
  areaProfileKey,
  type AreaProfile,
  type AreaProfileEvidence,
  type AreaProfileRepository
} from "./AreaProfileRepository";

type ProfileRow = QueryResultRow & Record<string, unknown>;

/** Converts PostgreSQL numeric strings while preserving unavailable values as null. */
function nullableNumber(value: string | number | null | undefined): number | null {
  if (value == null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Preserves text provenance and converts PostgreSQL numeric strings for scoring. */
function profileAttributes(row: ProfileRow): Record<string, number | string | null> {
  const attributes = Object.fromEntries(Object.entries(row).map(([field, value]) => {
    if (value == null) return [field, null];
    if (typeof value === "number") return [field, Number.isFinite(value) ? value : null];
    if (typeof value !== "string") return [field, String(value)];
    if (/(?:_source|_status|_quality|_code|_name)$/.test(field)) return [field, value];
    const parsed = Number(value);
    return [field, Number.isFinite(parsed) ? parsed : value];
  }));
  const aliases: Record<string, string> = {
    sal_code: "code", sal_name: "name", lga_code: "code", lga_name: "name",
    census_population: "population", median_age_years: "medianAgeYears",
    census_median_personal_income_weekly_aud: "medianPersonalIncomeWeeklyAud",
    census_median_household_income_weekly_aud: "medianHouseholdIncomeWeeklyAud",
    unemployment_rate_pct: "unemploymentRatePct", labour_force_participation_pct: "labourForceParticipationPct",
    irsad_score: "irsadScore", irsad_decile: "irsadDecile", ier_score: "ierScore", ier_decile: "ierDecile",
    census_year: "censusYear", seifa_year: "seifaYear", seifa_status: "seifaStatus",
    income_year: "incomeYear", jobs_year: "jobsYear"
  };
  for (const [source, alias] of Object.entries(aliases)) {
    if (attributes[alias] == null && attributes[source] != null) attributes[alias] = attributes[source];
  }
  return attributes;
}

/** Maps a complete database row while keeping a compact public summary. */
function mapProfile(row: ProfileRow, geography: "sal" | "lga"): AreaProfile {
  const attributes = profileAttributes(row);
  const canonicalAliases: Record<string, string> = {
    census_population: "population", median_age_years: "medianAgeYears",
    census_median_personal_income_weekly_aud: "medianPersonalIncomeWeeklyAud",
    census_median_household_income_weekly_aud: "medianHouseholdIncomeWeeklyAud",
    unemployment_rate_pct: "unemploymentRatePct", labour_force_participation_pct: "labourForceParticipationPct",
    irsad_score: "irsadScore", irsad_decile: "irsadDecile", ier_score: "ierScore", ier_decile: "ierDecile",
    census_year: "censusYear", seifa_year: "seifaYear", seifa_status: "seifaStatus"
  };
  const read = (field: string) => nullableNumber((attributes[field] ?? attributes[canonicalAliases[field]]) as string | number | null);
  return {
    code: String(attributes[`${geography}_code`] ?? attributes.code ?? ""),
    name: String(attributes[`${geography}_name`] ?? attributes.name ?? ""),
    population: read("census_population"),
    medianAgeYears: read("median_age_years"),
    medianPersonalIncomeWeeklyAud: read("census_median_personal_income_weekly_aud"),
    medianHouseholdIncomeWeeklyAud: read("census_median_household_income_weekly_aud"),
    unemploymentRatePct: read("unemployment_rate_pct"),
    labourForceParticipationPct: read("labour_force_participation_pct"),
    irsadScore: read("irsad_score"),
    irsadDecile: read("irsad_decile"),
    ierScore: read("ier_score"),
    ierDecile: read("ier_decile"),
    censusYear: read("census_year"),
    seifaYear: read("seifa_year"),
    seifaStatus: typeof attributes.seifa_status === "string" ? attributes.seifa_status : null,
    attributes
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
      this.database.query<ProfileRow>(`SELECT * FROM public.sal_profiles
        WHERE UPPER(sal_name) = ANY($1::text[])`,
      [localityNames.map((name) => name.toLocaleUpperCase("en-AU"))]),
      this.database.query<ProfileRow>(`SELECT * FROM public.lga_profiles
        WHERE UPPER(lga_name) = ANY($1::text[])`,
      [lgaNames.map((name) => name.toLocaleUpperCase("en-AU"))])
    ]);

    // A duplicated SAL name is ambiguous because the supplied SAL table has no LGA key.
    const salBuckets = new Map<string, ProfileRow[]>();
    for (const row of salResult.rows) {
      const key = String(row.sal_name ?? row.name).toLocaleUpperCase("en-AU");
      salBuckets.set(key, [...(salBuckets.get(key) ?? []), row]);
    }
    const lgaByName = new Map(lgaResult.rows.map((row) => [String(row.lga_name ?? row.name).toLocaleUpperCase("en-AU"), row]));

    const output = new Map<string, AreaProfileEvidence>();
    for (const area of areas) {
      const salRows = salBuckets.get(area.locality.toLocaleUpperCase("en-AU")) ?? [];
      const lgaRow = lgaByName.get(area.lgaName.toLocaleUpperCase("en-AU"));
      output.set(areaProfileKey(area.locality, area.lgaName), {
        sal: salRows.length === 1 ? mapProfile(salRows[0], "sal") : null,
        lga: lgaRow ? {
          ...mapProfile(lgaRow, "lga"),
          incomeYear: nullableNumber((lgaRow.income_year ?? lgaRow.incomeYear) as string | number | null),
          jobsYear: nullableNumber((lgaRow.jobs_year ?? lgaRow.jobsYear) as string | number | null)
        } : null
      });
    }
    return output;
  }
}
