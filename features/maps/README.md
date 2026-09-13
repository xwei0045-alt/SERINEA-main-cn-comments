# feature/maps

**Branch:** `feature/maps`

## Owns

| Path | Role |
| --- | --- |
| `app/map/**` | Map page, MapApp, ReachMap, WalkHud |
| `app/api/reach/**` | Reachability API |
| `app/api/walk/**` | Street walking route API |
| `frontend/api/ReachApiClient.ts` | Browser reach client |
| `frontend/api/WalkRouteClient.ts` | Browser walk client |
| `backend/services/ReachService.ts` | Round-trip rule |
| `backend/services/EstimatedJourneyCalculator.ts` | Walk minutes |
| `backend/repositories/*Reach*` | POI spatial search |
| `lib/mapMarks.ts` | Marker letters / labels |
| `lib/geo.ts`, `lib/reach.ts` | Geo helpers used by map |

## Out of scope

Compare preference ranking, AI Assistant page, landing marketing copy, AWS deploy scripts.
