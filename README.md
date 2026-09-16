# SERINEA — The 15 minute map (Iteration 2)

**FIT5120 S2 2026 · Team SERINEA (TP06) · Assignment 1 — Iteration 2**

Full-stack prototype for a **15-minute walking reach map**, framed for **small towns and regional Victoria**. The current version lets users explore nearby POIs, compare towns by supported facility records, screen synthetic relocation incentives, and describe preferences through the AI Recommendation page. These are prototype features, not complete routing, policy or personalised advice services.

POI coordinates, locality counts, SAL profiles, and LGA profiles are served from PostgreSQL at runtime. Map reach and list times use straight-line walking estimates; the current map UI does not show a verified street route or public transport journey.

## Team branching

Use **feature branches**, not dump branches:

| Branch | Focus |
| --- | --- |
| `feature/maps` | Map, reach, walk |
| `feature/filters` | Compare preferences and ranking |
| `feature/ai-assistant` | Recommendation and optional AI review |
| `feature/data` | Regional data and loaders |
| `feature/home` | Home and story UI |

Ownership lists live in `features/<name>/README.md`. Full rules: [`docs/BRANCHING.md`](docs/BRANCHING.md).

## Quick start

Node.js, npm, and a populated PostgreSQL database are required. Copy `.env.example` to `.env.local`, set `DATABASE_URL`, and keep credentials out of Git. Database preparation is covered in [`docs/BACKEND.md`](docs/BACKEND.md). Production readiness checks require `public.regional_pois`, `public.subsidies`, `public.sal_profiles`, and `public.lga_profiles`.

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
npm test
```

## Stack

| Layer | Technology |
| --- | --- |
| Framework | Next.js 15 (App Router) |
| UI | React 19, TypeScript |
| Styling | CSS Modules + global CSS |
| Map | Leaflet (client-only on `/map`) |
| Backend | Next.js route handlers, service and repository layers |
| Current data | PostgreSQL, populated from validated regional POI CSV files |
| Database | Versioned PostgreSQL schema, importer, and repositories |

## Routes

| Path | Purpose |
| --- | --- |
| `/` | Home / product story |
| `/map` | Pin, estimated walking reach and nearby POIs; no street-path overlay in the current UI |
| `/compare` | Town comparison using supported POI facility records, not all aspects of liveability |
| `/incentives` | Synthetic subsidy screening; job input is present but occupation matching is not supported by current records |
| `/ai-assistant` | English free-text extraction for supported facilities and backend-ranked town suggestions; optional Cloud Qwen review |
| `/api/reach` | Nearby POIs within the one-way walking window |
| `/api/localities` | Searchable locality/LGA summaries |
| `/api/health` | Repository and database readiness |

Other API routes are implemented under `app/api/`; their request contracts live under `shared/contracts/`.

## Repository layout

```
SERINEA/
├── app/                    # Next.js pages and thin API route handlers
│   ├── components/         # Shared UI
│   ├── map/                # Map page and Leaflet shell
│   ├── compare/            # Town comparison UI
│   ├── incentives/         # Incentive screening UI
│   ├── ai-assistant/        # AI Recommendation UI
│   ├── globals.css         # Design tokens and base styles
│   └── layout.tsx          # Root layout and fonts
├── backend/                # Controllers, services, repositories, data loading
│   └── iso/                # ISO 29119 automated test cases
├── frontend/               # Browser-side API clients
├── shared/                 # Runtime-validated API contracts
├── data/                   # Supplied POI files and prototype subsidy data
├── database/               # PostgreSQL schema
├── scripts/                # Dataset validation, migration, import
├── lib/                    # Shared UI types, map helpers, recommendation rules
├── docs/                   # Architecture, backend, dataset, deployment notes
├── PRODUCT.md              # Product rules
├── DESIGN.md               # Visual / UX direction
└── package.json
```

## Data stance (Iteration 2)

- **Online regional POIs.** Runtime POI and locality data come from PostgreSQL; the row count follows the database rather than an old CSV snapshot.
- **Backend-only area profiles.** Compare results are enriched from `public.sal_profiles` and `public.lga_profiles`. Census/SEIFA evidence keeps its 2021 year, LGA income/jobs evidence keeps its 2023 year, and missing values stay `null` rather than becoming zero.
- **User priorities remain authoritative.** Profile evidence is explanatory and does not alter facility ranking unless a future, explicit profile preference contract enables it.
- **Not live GTFS.** Journeys are straight-line walking estimates at 4.8 km/h.
- **Fixed 15-minute window.** A place fits when the estimated walk **from the pin** is no more than 15 minutes; return time is not included.
- **Incomplete route guidance.** A street-path backend endpoint exists, but the current map does not display its path; a real walk may take longer than the estimate.
- **Prototype incentives.** Subsidy records are synthetic, not official government programs or eligibility decisions. Occupation-based matching is not available yet.
- **Limited recommendation evidence.** Ranking uses supported POI facilities, not safety, housing cost, internet quality or other unverified requests. Cloud Qwen review is optional and off by default; facility ranking and incentive screening remain backend rule-based.

See [`docs/BACKEND.md`](docs/BACKEND.md) for integration points and [`docs/DATASET.md`](docs/DATASET.md) for data limitations.

See [`docs/AWS_DEPLOYMENT.md`](docs/AWS_DEPLOYMENT.md) and [`docs/AUTO_DEPLOYMENT.md`](docs/AUTO_DEPLOYMENT.md) for deployment details.

## Branch

Backend and data integration were developed on **`backend-integration`**. Current integration is on `main`.

## Team

Team SERINEA (TP06) — roles and phases are summarised in the home story (`lib/landingStory.ts`).
