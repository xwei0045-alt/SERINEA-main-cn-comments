import path from "path";
import { readFile } from "fs/promises";
import { parse } from "csv-parse/sync";
import { validateRecord, type SubsidyRecord, type SubsidyRepository } from "../repositories/SubsidyRepository";

type CsvRow = Record<string, string>;
const FILE_NAME = "SERINEA_mock_subsidies_450.csv";

// 作用：实现 requiredText 的后端职责；实现：在函数体内完成参数处理、数据访问或结果转换。
function requiredText(row: CsvRow, key: string, line: number): string {
  const value = row[key]?.trim();
  if (!value) throw new Error(`${FILE_NAME}:${line} is missing ${key}.`);
  return value;
}

// 作用：实现 optionalNumber 的后端职责；实现：在函数体内完成参数处理、数据访问或结果转换。
function optionalNumber(value: string | undefined): number | null {
  if (!value?.trim()) return null;
  const number = Number(value);
  if (!Number.isFinite(number)) throw new Error(`Invalid subsidy number: ${value}`);
  return number;
}

export class CsvSubsidyRepository implements SubsidyRepository {
  readonly dataSource = FILE_NAME as "SERINEA_mock_subsidies_450.csv";

  // 作用：实现 constructor 的后端职责；实现：在函数体内完成参数处理、数据访问或结果转换。
  constructor(private readonly dataDirectory = path.join(process.cwd(), "data")) {}

  // 作用：实现 load 的后端职责；实现：在函数体内完成参数处理、数据访问或结果转换。
  async load(): Promise<SubsidyRecord[]> {
    const text = await readFile(path.join(this.dataDirectory, FILE_NAME), "utf8");
    const rows = parse(text, { bom: true, columns: true, skip_empty_lines: true }) as CsvRow[];
    if (rows.length !== 450) throw new Error(`${FILE_NAME} must contain exactly 450 records; found ${rows.length}.`);
    return rows.map((row, index) => {
      const line = index + 2;
      if (row.is_synthetic?.trim().toLowerCase() !== "true") {
        throw new Error(`${FILE_NAME}:${line} must be marked synthetic.`);
      }
      return validateRecord({
        subsidyId: requiredText(row, "subsidy_id", line),
        subsidyName: requiredText(row, "subsidy_name", line),
        category: requiredText(row, "subsidy_category", line),
        locality: requiredText(row, "locality", line).toLocaleUpperCase("en-AU"),
        lgaName: requiredText(row, "lga_name", line).toLocaleUpperCase("en-AU"),
        anchorLatitude: optionalNumber(row.anchor_latitude),
        anchorLongitude: optionalNumber(row.anchor_longitude),
        benefitType: requiredText(row, "benefit_type", line),
        maxAmountAud: optionalNumber(row.max_amount_aud) ?? 0,
        incomeLimitAnnual: optionalNumber(row.income_limit_aud_annual),
        occupationRestriction: row.occupation_restriction?.trim() || null,
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
      });
    });
  }
}
