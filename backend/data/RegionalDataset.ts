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

export type RegionalDatasetMetadata = {
  detailFileName: string;
  summaryFileName: string;
  sourceDate: string;
  poiCount: number;
  summaryRowCount: number;
  summaryPoiCount: number;
};

export type LocalityCentroid = {
  locality: string;
  lgaName: string;
  regionalGroup: string;
  latitude: number;
  longitude: number;
};

export type RegionalDataset = {
  pois: RegionalPoiRecord[];
  localitySummaries: LocalityPoiSummaryRecord[];
  localityCentroids: LocalityCentroid[];
  metadata: RegionalDatasetMetadata;
};
