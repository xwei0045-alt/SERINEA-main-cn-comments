import type { SourceStamp } from "./types";

/** Banner copy — demonstration / not live GTFS extracts. */
export const DEMO_BANNER =
  "Demonstration data. Journeys are approximated, not live GTFS extracts.";

export const OSM_SOURCE: SourceStamp = {
  name: "OpenStreetMap (ODbL)",
  date: "2026-08-01",
  note: "Demonstration POI placement. A live build would use an OSM amenity/shop/leisure extract."
};

export const GTFS_SOURCE: SourceStamp = {
  name: "DTP GTFS Schedule",
  date: "2026-08-18",
  note: "Demonstration journey times. A live build would use the Department of Transport and Planning GTFS Schedule."
};

export const EXTRACT_STAMP = "demo · 2026-08-18";
