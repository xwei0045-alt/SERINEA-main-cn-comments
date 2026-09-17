export type ProfileAttributeValue = number | string | null;

// 一条完整的 SAL 或 LGA 区域画像；上传字段保留用于评分和数据来源说明。
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
  attributes: Record<string, ProfileAttributeValue>;
};

export type AreaProfileEvidence = {
  sal: AreaProfile | null;
  lga: (AreaProfile & { incomeYear: number | null; jobsYear: number | null }) | null;
};

// 读取 suburb 和 LGA 画像证据，但不向界面暴露数据库访问细节。
export interface AreaProfileRepository {
  findForAreas(areas: ReadonlyArray<{ locality: string; lgaName: string }>): Promise<Map<string, AreaProfileEvidence>>;
}

// 为一个排名区域生成稳定查找键，统一去除空格并转为大写。
export function areaProfileKey(locality: string, lgaName: string): string {
  return `${locality.trim().toLocaleUpperCase("en-AU")}\u0000${lgaName.trim().toLocaleUpperCase("en-AU")}`;
}
