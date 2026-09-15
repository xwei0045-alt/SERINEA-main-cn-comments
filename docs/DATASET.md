# Regional dataset notes

## Runtime source

The live backend reads POIs, localities, and incentives from online PostgreSQL. The archived Iteration 1 CSV files below are offline test fixtures, not a production fallback. Counts in the database can change after imports; do not use the fixture totals as live coverage claims.

## Archived test files

| File | Test use |
| --- | --- |
| `regional_pois_detail_optimized_iteration1.csv` | Offline POI fixture |
| `locality_poi_summary_iteration1.csv` | Offline locality/category fixture |

Offline validation checks unique `osm_id` values, valid coordinates, and agreement between the detail and summary totals. A live database count must be checked against PostgreSQL instead of inferred from these files.

The API records `2026-09-02` as the handover date. This is a stable receipt date, not an assertion about when the underlying OpenStreetMap features were surveyed.

## Current map category mapping

The existing frontend has a smaller category list than the supplied data. The map maps only compatible categories:

| Supplied subcategory | Existing map category |
| --- | --- |
| `park`, `nature_reserve`, `playground`, `garden` | `park` |
| `sports_centre` | `gym` |
| `supermarket`, `convenience_store` | `grocery` |
| `pharmacy` | `pharmacy` |
| `doctor`, `clinic`, `hospital`, `dentist` | `gp` |

Education, community, and public-transport stop records remain present in the source files and locality summary endpoint, but the map does not display them because the current UI has no matching filters. Food, general shops, and museums are not present as compatible supplied subcategories.

## Important limitations

- The files contain POI and stop coordinates, not GTFS schedules or route networks.
- The reach result is a straight-line walking estimate, not public-transport routing.
- Water polygons were not supplied, so the POI dataset does not classify pins as bay, lake, or harbour.
- Blank POI names fall back to the supplied `display_name`.
- The archived CSV snapshot is kept only as an offline test fixture; production reads PostgreSQL.
