# feature/data

**Branch:** `feature/data` (tracks revised extract from `backend-integration-new-dataset`)

## Owns

| Path | Role |
| --- | --- |
| `data/*.csv` | Iteration 1 POI detail + locality summary |
| `backend/data/poiDedupe.ts` | Near-duplicate collapse (safety net) |
| `backend/data/RegionalDataset.ts` | Dataset types |
| `backend/mappers/RegionalPoiMapper.ts` | Subcategory → map category |
| `docs/DATASET.md` | Handover notes |
| `backend/test-support/CsvDatasetLoader.ts` | Archived CSV fixture for offline tests only |
| `database/**` | Postgres schema / import (when used) |

## Current tip

The revised regional extract was imported into PostgreSQL. Runtime demos and coverage checks should read the online database; the CSV files remain only as offline test fixtures.

## Out of scope

UI pages, Groq keys, AWS EC2 bootstrap (infra owner).
