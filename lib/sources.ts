import type { SourceStamp } from "./types";

/** Banner copy — regional OSM extract; journeys are walking estimates. */
export const DEMO_BANNER =
  "The orange circle is a straight-line search. Pick a place to follow the streets, then start the walk for time remaining.";

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
