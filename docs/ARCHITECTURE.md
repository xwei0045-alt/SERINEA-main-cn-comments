# Frontend and backend architecture

This project keeps the frontend, backend, and shared contracts visibly separated.

## Folder ownership

| Folder | Responsibility |
| --- | --- |
| `app/` | Existing Next.js pages and UI components |
| `frontend/` | Browser-only API clients and future frontend helpers |
| `backend/` | Configuration, controllers, services, repositories, and database access |
| `shared/` | Request and response contracts used by both sides |
| `app/api/` | Thin backend entry points required by the Next.js App Router |

## Request flow

```text
MapApp
  -> ReachApiClient
  -> GET /api/reach
  -> ReachController
  -> ReachService
  -> ReachRepository
  -> CsvReachRepository (default now)
  -> DemoReachRepository (optional fallback)
  -> PostgresReachRepository (future AWS database step)
```

## Object-oriented responsibilities

- `ReachApiClient` owns browser-to-server communication.
- `ReachController` owns HTTP parsing and safe HTTP errors.
- `ReachService` owns the 15-minute round-trip business rule.
- `ReachRepository` defines the data-source contract.
- `CsvDatasetLoader` parses and validates both supplied files once per service instance.
- `SpatialGridIndex` limits statewide POI searches to nearby grid cells.
- `CsvReachRepository` maps supported data categories and calculates walking estimates.
- `DemoReachRepository` adapts the existing static data to that contract.
- `PostgresDatabase` owns the PostgreSQL connection pool.
- `Environment` owns validated backend configuration.
- `ReachServiceFactory` wires the selected implementation together.

## Current data flow

`REACH_DATA_SOURCE` defaults to `csv`. The detailed file powers `/api/reach`; the locality summary file powers `/api/localities`. The loader rejects malformed coordinates, duplicate OSM IDs, invalid counts, or a mismatch between detailed and summary totals.

## Future AWS database step

The API contract and repository boundary are already stable. Moving to RDS PostgreSQL will require a migration/import process and a `PostgresReachRepository`, followed by integration and performance tests. The frontend API client does not need to change.
