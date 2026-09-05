# feature/data

**Branch:** `feature/data` (tracks revised extract from `backend-integration-new-dataset`)

## Owns

| Path | Role |
| --- | --- |
| `data/*.csv` | Iteration 1 POI detail + locality summary |
| `backend/data/CsvDatasetLoader.ts` | CSV load + validate |
| `backend/data/poiDedupe.ts` | Near-duplicate collapse (safety net) |
| `backend/data/RegionalDataset.ts` | Dataset types |
| `backend/mappers/RegionalPoiMapper.ts` | Subcategory → map category |
| `docs/DATASET.md` | Handover notes |
| `scripts/validate-regional-data.ts` | `npm run data:validate` |
| `database/**` | Postgres schema / import (when used) |

## Current tip

Revised extract: **21,317** detail rows (deduped vs older 32,569). Prefer this branch’s CSVs for demos.

## Out of scope

UI pages, Groq keys, AWS EC2 bootstrap (infra owner).
