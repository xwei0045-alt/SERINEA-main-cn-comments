import path from "path";
import { readFile } from "fs/promises";
import { parse } from "csv-parse/sync";
import { Environment } from "@/backend/config/Environment";
import { PostgresDatabase } from "@/backend/database/PostgresDatabase";

export type SubsidyRecord = {
  subsidyId: string;
  subsidyName: string;
  category: string;
  locality: string;
  lgaName: string;
  benefitType: string;
  maxAmountAud: number;
  incomeLimitAnnual: number | null;
  incomeAssessmentUnit: "individual" | "household";
  ageSubject: "applicant" | "dependent_child";
  ageMin: number | null;
  ageMax: number | null;
  newResidentRequired: boolean;
  applyWithinDays: number | null;
  minimumMoveDistanceKm: number | null;
  eligibilitySummary: string;
  requiredEvidence: string;
  mockStatus: "mock_open" | "mock_upcoming" | "mock_closed";
  recordNotice: string;
};

export interface SubsidyRepository {
  readonly dataSource: "database" | "SERINEA_mock_subsidies_450.csv";
  load(): Promise<SubsidyRecord[]>;
}

type DatabaseRow = Omit<SubsidyRecord,
  "maxAmountAud" | "incomeLimitAnnual" | "ageMin" | "ageMax" |
  "applyWithinDays" | "minimumMoveDistanceKm"> & {
    maxAmountAud: string | number | null;
    incomeLimitAnnual: string | number | null;
    ageMin: string | number | null;
    ageMax: string | number | null;
    applyWithinDays: string | number | null;
    minimumMoveDistanceKm: string | number | null;
  };

function nullableNumber(value: string | number | null): number | null {
  if (value == null) return null;
  const number = Number(value);
  if (!Number.isFinite(number)) throw new Error(`Invalid subsidy number: ${value}`);
  return number;
}

/** Reads the synthetic subsidy dataset from the production PostgreSQL table. */
export class PostgresSubsidyRepository implements SubsidyRepository {
  readonly dataSource = "database" as const;

  constructor(private readonly database = PostgresDatabase.getInstance(
    Environment.getInstance().databaseUrl as string
  )) {}

  async load(): Promise<SubsidyRecord[]> {
    const result = await this.database.query<DatabaseRow>(`SELECT
      subsidy_id AS "subsidyId",
      subsidy_name AS "subsidyName",
      subsidy_category AS category,
      UPPER(locality) AS locality,
      UPPER(lga_name) AS "lgaName",
      benefit_type AS "benefitType",
      max_amount_aud AS "maxAmountAud",
      income_limit_aud_annual AS "incomeLimitAnnual",
      income_assessment_unit AS "incomeAssessmentUnit",
      age_subject AS "ageSubject",
      age_min AS "ageMin",
      age_max AS "ageMax",
      new_resident_required AS "newResidentRequired",
      apply_within_days_of_move AS "applyWithinDays",
      minimum_move_distance_km AS "minimumMoveDistanceKm",
      eligibility_summary AS "eligibilitySummary",
      required_evidence AS "requiredEvidence",
      mock_status AS "mockStatus",
      record_notice AS "recordNotice"
      FROM public.subsidies
      WHERE is_synthetic IS TRUE`);

    return result.rows.map((row) => ({
      ...row,
      maxAmountAud: nullableNumber(row.maxAmountAud) ?? 0,
      incomeLimitAnnual: nullableNumber(row.incomeLimitAnnual),
      ageMin: nullableNumber(row.ageMin),
      ageMax: nullableNumber(row.ageMax),
      applyWithinDays: nullableNumber(row.applyWithinDays),
      minimumMoveDistanceKm: nullableNumber(row.minimumMoveDistanceKm)
    }));
  }
}

type CsvRow = Record<string, string>;
const FILE_NAME = "SERINEA_mock_subsidies_450.csv";

function requiredText(row: CsvRow, key: string, line: number): string {
  const value = row[key]?.trim();
  if (!value) throw new Error(`${FILE_NAME}:${line} is missing ${key}.`);
  return value;
}

function optionalNumber(value: string | undefined): number | null {
  if (!value?.trim()) return null;
  const number = Number(value);
  if (!Number.isFinite(number)) throw new Error(`Invalid subsidy number: ${value}`);
  return number;
}

/** CSV adapter retained for local dataset validation and isolated unit tests only. */
export class CsvSubsidyRepository implements SubsidyRepository {
  readonly dataSource = FILE_NAME as "SERINEA_mock_subsidies_450.csv";

  constructor(private readonly dataDirectory = path.join(process.cwd(), "data")) {}

  async load(): Promise<SubsidyRecord[]> {
    const text = await readFile(path.join(this.dataDirectory, FILE_NAME), "utf8");
    const rows = parse(text, { bom: true, columns: true, skip_empty_lines: true }) as CsvRow[];
    if (rows.length !== 450) throw new Error(`${FILE_NAME} must contain exactly 450 records; found ${rows.length}.`);
    return rows.map((row, index) => {
      const line = index + 2;
      if (row.is_synthetic?.trim().toLowerCase() !== "true") {
        throw new Error(`${FILE_NAME}:${line} must be marked synthetic.`);
      }
      return {
        subsidyId: requiredText(row, "subsidy_id", line),
        subsidyName: requiredText(row, "subsidy_name", line),
        category: requiredText(row, "subsidy_category", line),
        locality: requiredText(row, "locality", line).toLocaleUpperCase("en-AU"),
        lgaName: requiredText(row, "lga_name", line).toLocaleUpperCase("en-AU"),
        benefitType: requiredText(row, "benefit_type", line),
        maxAmountAud: optionalNumber(row.max_amount_aud) ?? 0,
        incomeLimitAnnual: optionalNumber(row.income_limit_aud_annual),
        incomeAssessmentUnit: requiredText(row, "income_assessment_unit", line) as SubsidyRecord["incomeAssessmentUnit"],
        ageSubject: requiredText(row, "age_subject", line) as SubsidyRecord["ageSubject"],
        ageMin: optionalNumber(row.age_min),
        ageMax: optionalNumber(row.age_max),
        newResidentRequired: row.new_resident_required?.trim().toLowerCase() === "true",
        applyWithinDays: optionalNumber(row.apply_within_days_of_move),
        minimumMoveDistanceKm: optionalNumber(row.minimum_move_distance_km),
        eligibilitySummary: requiredText(row, "eligibility_summary", line),
        requiredEvidence: requiredText(row, "required_evidence", line),
        mockStatus: requiredText(row, "mock_status", line) as SubsidyRecord["mockStatus"],
        recordNotice: requiredText(row, "record_notice", line)
      };
    });
  }
}
