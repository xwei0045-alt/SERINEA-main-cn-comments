# Backend integration

The Next.js backend reads the online PostgreSQL database. The map consumes `/api/reach`; locality statistics are available through `/api/localities`; `/api/health` reports whether the selected repository is ready.

## Run and verify

```bash
npm install
npm test
npm run dev
```

`npm test` runs the ISO 29119 cases in `backend/iso/iso29119.test.ts`. The written versions live in `docs/TEST_CASES.md`.

Runtime POI and area profile data come from AWS RDS (`public.regional_pois`, `public.sal_profiles`, and `public.lga_profiles`). Copy `.env.example` to `.env.local` and set:

```env
REACH_DATA_SOURCE=database
DATABASE_URL=postgresql://USER:PASSWORD@RDS_ENDPOINT:5432/serinea?sslmode=require&uselibpqcompat=true
```

Set the same `REACH_DATA_SOURCE` and `DATABASE_URL` values in the host environment for any deployed instance (for example EC2 systemd env, or your process manager). CSV files remain only as offline test fixtures — they are not the runtime data source.

To create and import a PostgreSQL database (maintainers with write access):

```bash
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE" npm run db:migrate
```

## API routes

### Reachability

```http
GET /api/reach?lat=-37.024456&lng=146.695987&window=15
GET /api/reach?lat=-37.024456&lng=146.695987&window=15&categories=park,gp
```

The response contains mapped POIs, outbound and inbound legs, a 15-minute round-trip hull, source notes, and `dataSource: "database"`. The backend only returns POIs whose outbound plus return estimate is 15 minutes or less.

### Locality summaries

```http
GET /api/localities?q=ABBEYARD&limit=10
```

The endpoint searches locality, LGA, and regional group names. It returns category and subcategory totals derived from the online `public.regional_pois` table.

### SAL and LGA profile enrichment

`/api/compare` attaches a compact `profileEvidence` object to ranked areas. `PostgresAreaProfileRepository` batches SAL lookups by `sal_name` and LGA lookups by `lga_name`. The uploaded SAL table has no LGA key, so duplicate SAL names are deliberately left unresolved instead of being assigned to the wrong LGA. Profile evidence is backend-only, preserves `null` values, and reports source years separately.

The final ranking is calculated for every eligible area before the requested result limit is applied: explicit user needs contribute 75%, overall POI coverage contributes 15%, and SAL/LGA profile indicators contribute 10%. Preference-order weights remain inside the user-needs component. For each available geographic level, the profile score averages IRSD decile, IER decile, inverse unemployment, labour-force participation, and capped weekly household income; the available SAL and LGA level scores are then averaged. A missing indicator is omitted; a completely missing profile receives zero for the 10% component. The response exposes all three values and weights in `scoreComponents`.

### Health

```http
GET /api/health
```

Database health depends on a configured connection string and successful PostgreSQL query; offline CSV fixtures are not part of runtime health.

## Product rule

```text
roundTripMinutes = outboundMinutes + inboundMinutes
include only when roundTripMinutes <= 15
```

No transit feed was supplied. `EstimatedJourneyCalculator` therefore uses straight-line distance at 4.8 km/h and labels every result accordingly. This estimate must be replaced with actual routing when GTFS and a routing method become available.

## Object-oriented backend structure

| Class | Responsibility |
| --- | --- |
| `backend/test-support/CsvDatasetLoader` | Parse and cross-check the archived CSV fixture in offline tests |
| `RegionalPoiMapper` | Convert supplied subcategories to existing UI categories |
| `EstimatedJourneyCalculator` | Create explicitly labelled walking estimates |
| `ReachService` | Enforce round-trip and category business rules |
| `ReachController` | Validate HTTP input and return safe errors |
| `LocalitySummaryService` | Search locality summaries supplied by the selected repository |
| `PostgresDatabase` | Own the PostgreSQL connection pool and transactions |
| `PostgresReachRepository` | Query nearby POIs from the active database version |
| `PostgresAreaProfileRepository` | Batch SAL and LGA background evidence for ranked areas |
| `PostgresLocalitySummaryRepository` | Query locality summaries from the active version |

## AWS development deployment

The current AWS deployment runs Next.js on EC2 and reads PostgreSQL from RDS. See `AWS_DEPLOYMENT.md` for deployment and database configuration.

For a production architecture, move PostgreSQL to private RDS, add managed secrets, HTTPS, backups, monitoring, and multiple application instances. GTFS data and real routing are still required before journey times can be described as public transport.
