/** One point of interest read from the supplied detailed CSV file. */
export type RegionalPoiRecord = {
  osmId: string;
  name: string;
  latitude: number;
  longitude: number;
  locality: string;
  lgaName: string;
  absLgaCode: string;
  vicmapLgaCode: string;
  regionalGroup: string;
  areaType: string;
  category: string;
  subcategory: string;
  displayName: string;
  osmTagType: string;
  osmTagValue: string;
  addressHouseNumber: string;
  addressStreet: string;
  osmAddressSuburb: string;
  addressPostcode: string;
  operator: string;
  brand: string;
  phone: string;
  website: string;
  openingHours: string;
  wheelchair: string;
};

/** One category row read from the locality summary CSV file. */
export type LocalityPoiSummaryRecord = {
  locality: string;
  lgaName: string;
  absLgaCode: string;
  regionalGroup: string;
  category: string;
  subcategory: string;
  displayName: string;
  poiCount: number;
};

/** Metadata recorded while loading and validating both source files. */
export type RegionalDatasetMetadata = {
  detailFileName: string;
  summaryFileName: string;
  sourceDate: string;
  poiCount: number;
  summaryRowCount: number;
  summaryPoiCount: number;
};

/** Mean coordinate for one locality, used to drop the map pin on a town name. */
export type LocalityCentroid = {
  locality: string;
  lgaName: string;
  regionalGroup: string;
  latitude: number;
  longitude: number;
};

/** Validated in-memory representation of the complete Iteration 1 handover. */
export type RegionalDataset = {
  pois: RegionalPoiRecord[];
  localitySummaries: LocalityPoiSummaryRecord[];
  localityCentroids: LocalityCentroid[];
  metadata: RegionalDatasetMetadata;
};
