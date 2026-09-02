# Backend integration

The Next.js backend now uses both Iteration 1 CSV files supplied by the data team. The map consumes `/api/reach`; locality statistics are available through `/api/localities`; `/api/health` reports whether the selected repository is ready.

## Run and verify

```bash
npm install
npm run data:validate
npm test
npm run dev
```

CSV mode is the default and needs no secret configuration. To make the selection explicit, copy `.env.example` to `.env.local` and keep:

```env
REACH_DATA_SOURCE=csv
```

## API routes

### Reachability

```http
GET /api/reach?lat=-37.024456&lng=146.695987&window=15
GET /api/reach?lat=-37.024456&lng=146.695987&window=15&categories=park,gp
```

The response contains mapped POIs, outbound and inbound legs, a 15-minute round-trip hull, source notes, and `dataSource: "csv"`. The backend only returns POIs whose outbound plus return estimate is 15 minutes or less.

### Locality summaries

```http
GET /api/localities?q=ABBEYARD&limit=10
```

The endpoint searches locality, LGA, and regional group names. It returns category and subcategory totals from `locality_poi_summary_iteration1.csv`.

### Health

```http
GET /api/health
```

CSV mode returns `status: "ok"` only after both source files parse and reconcile successfully. PostgreSQL remains `not-configured` until a connection string is supplied.

## Product rule

```text
roundTripMinutes = outboundMinutes + inboundMinutes
include only when roundTripMinutes <= 15
```

No transit feed was supplied. `EstimatedJourneyCalculator` therefore uses straight-line distance at 4.8 km/h and labels every result accordingly. This estimate must be replaced with actual routing when GTFS and a routing method become available.

## Object-oriented backend structure

| Class | Responsibility |
| --- | --- |
| `CsvDatasetLoader` | Parse, type, cache, and cross-check both files |
| `RegionalPoiMapper` | Convert supplied subcategories to existing UI categories |
| `SpatialGridIndex` | Avoid a full statewide scan for every pin movement |
| `EstimatedJourneyCalculator` | Create explicitly labelled walking estimates |
| `CsvReachRepository` | Retrieve nearby mapped POIs from CSV data |
| `ReachService` | Enforce round-trip and category business rules |
| `ReachController` | Validate HTTP input and return safe errors |
| `LocalitySummaryService` | Aggregate and search the supplied summary data |
| `PostgresDatabase` | Own the future PostgreSQL connection pool |

## What remains before database mode

1. Create the AWS RDS PostgreSQL instance and private/network access rules.
2. Confirm whether PostGIS is permitted and choose the production schema.
3. Import and reconcile both CSV files in a staging table before replacing production data.
4. Implement and test `PostgresReachRepository` against that confirmed schema.
5. Store `DATABASE_URL` in the deployment secret manager and set `REACH_DATA_SOURCE=database`.
6. Add GTFS data and real round-trip routing if the product is expected to show public-transport times.
