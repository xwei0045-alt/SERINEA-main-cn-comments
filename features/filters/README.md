# feature/filters

**Branch:** `feature/filters`

## Owns

| Path | Role |
| --- | --- |
| `app/compare/CompareClient.tsx` | Ranking page shell (manual prefs) |
| `app/compare/ComparePriorities.tsx` | Drag/drop preference weights |
| `app/compare/CompareClient.module.css` | Compare layout |
| `app/compare/ComparePriorities.module.css` | Priority editor styles |
| `app/api/compare/**` | Ranking API |
| `frontend/api/CompareApiClient.ts` | Browser compare client |
| `backend/services/CompareService.ts` | Weighted town scores |
| `lib/comparePriorities.ts` | Weight maths |
| `lib/types.ts` → Compare preference catalogues | Broad category and specific type ids |
| `lib/preferenceHierarchy.ts` | Parent/child selection rules |
| `shared/contracts/compare.ts` | Compare request/response types |

## Out of scope

Leaflet map canvas, the separate AI Assistant page, CSV pipeline changes (`feature/data`).

## Facility hierarchy

The Compare page presents six broad categories. A user may select a broad
category directly or expand it to choose one or more specific facility types.
Within one branch, the parent and children replace one another so the same
facility records are not counted twice. Choices in other branches are kept.
