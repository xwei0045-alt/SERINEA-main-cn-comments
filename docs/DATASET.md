# Iteration 1 dataset notes

## Supplied files

| File | Rows | Backend use |
| --- | ---: | --- |
| `regional_pois_detail_optimized_iteration1.csv` | 32,569 | Coordinates and POI details for `/api/reach` |
| `locality_poi_summary_iteration1.csv` | 6,532 | Locality/category counts for `/api/localities` |

Validation confirms 32,569 unique `osm_id` values, valid coordinates, and a summary `poi_count` total of 32,569. The summary covers 1,778 localities and 51 LGAs.

The API records `2026-09-02` as the handover date. This is a stable receipt date, not an assertion about when the underlying OpenStreetMap features were surveyed.

## Current map category mapping

The existing frontend has a smaller category list than the supplied data. CSV mode maps only compatible categories:

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
- Water polygons were not supplied, so CSV mode does not classify pins as bay, lake, or harbour.
- Blank POI names fall back to the supplied `display_name`.
- A future handover can be checked with `npm run data:validate` before integration.
