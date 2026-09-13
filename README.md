# SERINEA — The 15 minute map (Iteration 1)

**FIT5120 S2 2026 · Team SERINEA (TA06) · Assignment 1 — Iteration 1**

Full-stack prototype for a **15-minute round-trip reach map**, framed for **small towns and regional Victoria**. The map now reads the supplied Iteration 1 regional POI files through server-side APIs.

POI coordinates and locality counts come from the data-team CSV handover. Journey times are still clearly labelled straight-line walking estimates because the supplied files do not contain GTFS routes or timetables.

## Team branching

Use **feature branches**, not dump branches:

| Branch | Focus |
| --- | --- |
| `feature/maps` | Map, reach, walk |
| `feature/filters` | Compare prefs & ranking |
| `feature/ai-assistant` | Separate mock AI Assistant page |
| `feature/data` | CSV extract & loaders |
| `feature/home` | Landing / how-it-works UI |

Ownership lists live in `features/<name>/README.md`. Full rules: [`docs/BRANCHING.md`](docs/BRANCHING.md).

## Quick start

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:5173](http://127.0.0.1:5173).

Production build:

```bash
npm run build
npm start
```

Backend checks:

```bash
npm run data:validate
npm test
```

## Stack

| Layer | Technology |
| --- | --- |
| Framework | Next.js 15 (App Router) |
| UI | React 19, TypeScript |
| Styling | CSS Modules + global CSS |
| Map | Leaflet (client-only on `/map`) |
| Backend | Next.js route handlers, object-oriented service/repository layers |
| Current data | Validated CSV files with an in-memory spatial index |
| Database | Versioned PostgreSQL schema, transactional importer, and repositories |

## Routes

| Path | Purpose |
| --- | --- |
| `/` | Scroll-driven landing / product story |
| `/map` | Operate tool — pin, isochrone, reachable POIs |
| `/how` | Short how-it-works |
| `/api/reach` | Nearby mapped POIs and estimated round trips |
| `/api/localities` | Searchable locality/LGA/regional POI summaries |
| `/api/health` | Repository and database readiness |

## Repository layout

```
SERINEA/
├── app/                    # Next.js pages and thin API route handlers
│   ├── components/         # Shared UI (Chrome, landing reel)
│   ├── map/                # Map page + Leaflet shell
│   ├── how/                # How-it-works page
│   ├── globals.css         # Design tokens & base styles
│   └── layout.tsx          # Root layout + fonts
├── backend/                # Controllers, services, repositories, data loading
│   └── iso/                # ISO 29119 automated test cases
├── frontend/               # Browser-side API clients
├── shared/                 # Runtime-validated API contracts
├── data/                   # Supplied Iteration 1 CSV files
├── scripts/                # Dataset validation command
├── lib/                    # Existing UI types and demonstration helpers
│   ├── pois.ts             # Demo POI catalogue
│   ├── stops.ts            # Demo PT stops
│   ├── reach.ts            # Round-trip reach calculation (client)
│   ├── landingDemo.ts      # Homepage atlas demo pins
│   ├── landingStory.ts     # Scroll-reel copy & beats
│   ├── types.ts            # Shared TypeScript types
│   └── sources.ts          # Source stamps & demo banner
├── docs/
│   ├── ARCHITECTURE.md     # Frontend/backend ownership and object flow
│   ├── AWS_DEPLOYMENT.md   # EC2, PostgreSQL, Nginx deployment details
│   ├── BACKEND.md          # API and operating instructions
│   ├── DATASET.md          # Supplied fields, mapping, and limitations
│   └── TEST_CASES.md       # ISO 29119 test cases for Iteration 1
├── PRODUCT.md              # Product spec (mentor reference)
├── DESIGN.md               # Visual / UX direction
└── package.json
```

## Data stance (Iteration 1)

- **Real supplied POIs.** The detailed file has 32,569 unique OSM IDs and valid coordinates.
- **Not live GTFS.** Journeys are straight-line walking estimates at 4.8 km/h.
- **Fixed 15-minute window** — outbound + return must fit; no 30/60 options.
- **Round-trip filter:** if return does not fit, the place is omitted (or shown as ghost on the landing demo only).

See `docs/BACKEND.md` for integration points for the backend developer.

See `docs/AWS_DEPLOYMENT.md` for the current low-cost AWS development architecture and the future dataset update process.

## Branch

Backend and data integration: **`backend-integration`**.

## Team

Team SERINEA (TA06) — roles and phases are summarised on the landing scroll reel (`lib/landingStory.ts`).
