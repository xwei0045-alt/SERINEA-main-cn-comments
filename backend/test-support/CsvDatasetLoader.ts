import path from "path";
import { readFile } from "fs/promises";
import { parse } from "csv-parse/sync";
import type {
  LocalityCentroid,
  LocalityPoiSummaryRecord,
  RegionalDataset,
  RegionalPoiRecord
} from "../data/RegionalDataset";

type CsvRow = Record<string, string>;

const DETAIL_FILE_NAME = "regional_pois_detail_optimized_iteration1.csv";
const SUMMARY_FILE_NAME = "locality_poi_summary_iteration1.csv";
const DATASET_HANDOVER_DATE = "2026-09-02";

export class CsvDatasetLoader {
  private datasetPromise: Promise<RegionalDataset> | undefined;

  // 作用：实现 constructor 的后端职责；实现：在函数体内完成参数处理、数据访问或结果转换。
  constructor(private readonly dataDirectory = path.join(process.cwd(), "data")) {}

  // 作用：实现 load 的后端职责；实现：在函数体内完成参数处理、数据访问或结果转换。
  load(): Promise<RegionalDataset> {
    if (!this.datasetPromise) {
      this.datasetPromise = this.readDataset();
    }
    return this.datasetPromise;
  }

  // 作用：实现 readDataset 的后端职责；实现：在函数体内完成参数处理、数据访问或结果转换。
  private async readDataset(): Promise<RegionalDataset> {
    const detailPath = path.join(this.dataDirectory, DETAIL_FILE_NAME);
    const summaryPath = path.join(this.dataDirectory, SUMMARY_FILE_NAME);
    const [detailText, summaryText] = await Promise.all([
      readFile(detailPath, "utf8"),
      readFile(summaryPath, "utf8")
    ]);

    const detailRows = this.parseRows(detailText, DETAIL_FILE_NAME);
    const summaryRows = this.parseRows(summaryText, SUMMARY_FILE_NAME);
    const pois = detailRows.map((row, index) => this.toPoi(row, index + 2));
    const localitySummaries = summaryRows.map((row, index) =>
      this.toSummary(row, index + 2)
    );

    this.validateUniquePoiIds(pois);
    const summaryPoiCount = localitySummaries.reduce(
      (total, row) => total + row.poiCount,
      0
    );

    if (summaryPoiCount !== pois.length) {
      throw new Error(
        `Dataset totals disagree: detail has ${pois.length} POIs but summary totals ${summaryPoiCount}.`
      );
    }

    return {
      pois,
      localitySummaries,
      localityCentroids: this.centroidsFrom(pois),
      metadata: {
        detailFileName: DETAIL_FILE_NAME,
        summaryFileName: SUMMARY_FILE_NAME,
        sourceDate: DATASET_HANDOVER_DATE,
        poiCount: pois.length,
        summaryRowCount: localitySummaries.length,
        summaryPoiCount
      }
    };
  }

  // 作用：实现 centroidsFrom 的后端职责；实现：在函数体内完成参数处理、数据访问或结果转换。
  private centroidsFrom(pois: RegionalPoiRecord[]): LocalityCentroid[] {
    const totals = new Map<
      string,
      {
        locality: string;
        lgaName: string;
        regionalGroup: string;
        latitude: number;
        longitude: number;
        count: number;
      }
    >();

    for (const poi of pois) {
      const key = `${poi.locality}\u0000${poi.lgaName}\u0000${poi.regionalGroup}`;
      const current = totals.get(key);
      if (!current) {
        totals.set(key, {
          locality: poi.locality,
          lgaName: poi.lgaName,
          regionalGroup: poi.regionalGroup,
          latitude: poi.latitude,
          longitude: poi.longitude,
          count: 1
        });
        continue;
      }
      current.latitude += poi.latitude;
      current.longitude += poi.longitude;
      current.count += 1;
    }

    return [...totals.values()].map((entry) => ({
      locality: entry.locality,
      lgaName: entry.lgaName,
      regionalGroup: entry.regionalGroup,
      latitude: entry.latitude / entry.count,
      longitude: entry.longitude / entry.count
    }));
  }

  // 作用：实现 parseRows 的后端职责；实现：在函数体内完成参数处理、数据访问或结果转换。
  private parseRows(text: string, fileName: string): CsvRow[] {
    try {
      return parse(text, {
        bom: true,
        columns: true,
        skip_empty_lines: true,
        relax_column_count: false
      }) as CsvRow[];
    } catch (error) {
      throw new Error(`Could not parse ${fileName}.`, { cause: error });
    }
  }

  // 作用：实现 toPoi 的后端职责；实现：在函数体内完成参数处理、数据访问或结果转换。
  private toPoi(row: CsvRow, line: number): RegionalPoiRecord {
    const latitude = this.requiredNumber(row.latitude, "latitude", DETAIL_FILE_NAME, line);
    const longitude = this.requiredNumber(
      row.longitude,
      "longitude",
      DETAIL_FILE_NAME,
      line
    );
    const osmId = this.requiredText(row.osm_id, "osm_id", DETAIL_FILE_NAME, line);

    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      throw new Error(`${DETAIL_FILE_NAME}:${line} contains invalid coordinates.`);
    }

    return {
      osmId,
      name: row.name?.trim() ?? "",
      latitude,
      longitude,
      locality: this.requiredText(row.locality, "locality", DETAIL_FILE_NAME, line),
      lgaName: this.requiredText(row.lga_name, "lga_name", DETAIL_FILE_NAME, line),
      absLgaCode: row.abs_lga_code?.trim() ?? "",
      vicmapLgaCode: row.vicmap_lga_code?.trim() ?? "",
      regionalGroup: row.regional_group?.trim() ?? "",
      areaType: row.area_type?.trim() ?? "",
      category: this.requiredText(row.category, "category", DETAIL_FILE_NAME, line),
      subcategory: this.requiredText(
        row.subcategory,
        "subcategory",
        DETAIL_FILE_NAME,
        line
      ),
      displayName: row.display_name?.trim() ?? "",
      osmTagType: row.osm_tag_type?.trim() ?? "",
      osmTagValue: row.osm_tag_value?.trim() ?? "",
      addressHouseNumber: row.addr_housenumber?.trim() ?? "",
      addressStreet: row.addr_street?.trim() ?? "",
      osmAddressSuburb: row.osm_addr_suburb?.trim() ?? "",
      addressPostcode: row.addr_postcode?.trim() ?? "",
      operator: row.operator?.trim() ?? "",
      brand: row.brand?.trim() ?? "",
      phone: row.phone?.trim() ?? "",
      website: row.website?.trim() ?? "",
      openingHours: row.opening_hours?.trim() ?? "",
      wheelchair: row.wheelchair?.trim() ?? ""
    };
  }

  // 作用：实现 toSummary 的后端职责；实现：在函数体内完成参数处理、数据访问或结果转换。
  private toSummary(row: CsvRow, line: number): LocalityPoiSummaryRecord {
    const poiCount = this.requiredNumber(
      row.poi_count,
      "poi_count",
      SUMMARY_FILE_NAME,
      line
    );

    if (!Number.isInteger(poiCount) || poiCount < 0) {
      throw new Error(`${SUMMARY_FILE_NAME}:${line} contains an invalid poi_count.`);
    }

    return {
      locality: this.requiredText(row.locality, "locality", SUMMARY_FILE_NAME, line),
      lgaName: this.requiredText(row.lga_name, "lga_name", SUMMARY_FILE_NAME, line),
      absLgaCode: row.abs_lga_code?.trim() ?? "",
      regionalGroup: row.regional_group?.trim() ?? "",
      category: this.requiredText(row.category, "category", SUMMARY_FILE_NAME, line),
      subcategory: this.requiredText(
        row.subcategory,
        "subcategory",
        SUMMARY_FILE_NAME,
        line
      ),
      displayName: row.display_name?.trim() ?? "",
      poiCount
    };
  }

  private requiredText(
    value: string | undefined,
    column: string,
    fileName: string,
    line: number
  ): string {
    const normalized = value?.trim();
    if (!normalized) {
      throw new Error(`${fileName}:${line} is missing ${column}.`);
    }
    return normalized;
  }

  private requiredNumber(
    value: string | undefined,
    column: string,
    fileName: string,
    line: number
  ): number {
    const number = Number(value);
    if (!value?.trim() || !Number.isFinite(number)) {
      throw new Error(`${fileName}:${line} contains an invalid ${column}.`);
    }
    return number;
  }

  // 作用：实现 validateUniquePoiIds 的后端职责；实现：在函数体内完成参数处理、数据访问或结果转换。
  private validateUniquePoiIds(pois: RegionalPoiRecord[]): void {
    const ids = new Set<string>();
    for (const poi of pois) {
      if (ids.has(poi.osmId)) {
        throw new Error(`The detailed dataset contains duplicate osm_id ${poi.osmId}.`);
      }
      ids.add(poi.osmId);
    }
  }
}
