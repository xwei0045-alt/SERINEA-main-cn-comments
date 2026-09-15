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
  -> PostgresReachRepository (online database)
```

## Object-oriented responsibilities

- `ReachApiClient` owns browser-to-server communication.
- `ReachController` owns HTTP parsing and safe HTTP errors.
- `ReachService` owns the 15-minute round-trip business rule.
- `ReachRepository` defines the data-source contract.
- `CsvDatasetLoader` is an archived fixture reader under `backend/test-support/`; it is not used by production API factories.
- `PostgresReachRepository` reads mapped nearby POIs from PostgreSQL.
- `PostgresDatabase` owns the PostgreSQL connection pool.
- `Environment` owns validated backend configuration.
- `ReachServiceFactory` wires the selected implementation together.

## Current data flow

`REACH_DATA_SOURCE` defaults to `database`. `/api/reach` queries `public.regional_pois` directly; `/api/localities` aggregates that same table for town search. CSV loaders remain only in offline test support and are not a runtime data source.

## AWS database mode

The externally deployed database exposes `public.regional_pois` with POI attributes and PostGIS geography. Both `/api/reach` and `/api/localities` use it whenever the application runs; the frontend API client does not change.
