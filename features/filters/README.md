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
| `lib/types.ts` → `COMPARE_PREFERENCES` | Preference ids / subcategories |
| `shared/contracts/compare.ts` | Compare request/response types |

## Out of scope

Leaflet map canvas, AI chat drawer / Groq routes (those are `feature/ai-assistant`), CSV pipeline changes (`feature/data`).
