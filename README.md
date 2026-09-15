# SERINEA

**FIT5120 S2 2026 | Regional Victoria relocation prototype**

SERINEA helps people explore regional towns through a 15-minute one-way walking reach map, compare towns by nearby facilities, and screen fictional relocation incentives. The AI Recommendation page accepts a free-text request, but town ranking and incentive eligibility checks use structured project data and backend rules.

## Features

| Page | What it does |
| --- | --- |
| `/map` | Shows nearby points of interest (POIs) within a fixed 15-minute walk from the selected pin. Journey times are straight-line estimates, not turn-by-turn routing or public transport schedules. |
| `/compare` | Ranks towns using selected facility preferences and the current POI records. Its optional chat assistant uses Groq when configured. |
| `/incentives` | Screens a selected town's fictional subsidy records against relocation status and any facts the user supplies. The current records do not support occupation matching, despite the job field in the form. |
| `/ai-assistant` | Extracts facility preferences from English free text, ranks towns through the same Compare backend, and shows separate incentive results when requested. |

The AI Recommendation page starts with deterministic local text extraction. **Cloud Qwen review is optional and off by default.** When enabled and configured, the server sends the message and extraction to Hugging Face Inference Providers; if review is unavailable, the local extraction remains active. Qwen does not calculate the town scores or decide subsidy eligibility. The server-only `HF_TOKEN` must never be exposed to the browser or committed.

## Data and limits

- Runtime POI and locality data is read from PostgreSQL. The supplied OSM-derived CSV files are used for validation, import and offline tests, not as the deployed runtime source.
- The map uses a fixed **15-minute one-way** window. Walking times are estimated from straight-line distance at 4.8 km/h; they are not verified street routes.
- The 450 subsidy records are **synthetic prototype data**. They are not government programs, and a displayed match is not an official eligibility decision.
- Incentives do not change the lifestyle ranking or town order. Unknown eligibility facts are shown as items to verify rather than assumed true.

## Local setup

Requires Node.js, npm and a reachable PostgreSQL database populated with the project's POI and locality tables. Incentive screening additionally needs a populated `public.subsidies` table.

```bash
npm ci
```

Create `.env.local` from [`.env.example`](.env.example) and set at least `REACH_DATA_SOURCE=database` and `DATABASE_URL` to a valid PostgreSQL connection string. `GROQ_API_KEY` is optional for Compare chat; `HF_TOKEN` and `HF_MODEL` are optional for Cloud Qwen review. Do not commit `.env.local` or real keys.

If you are preparing a new database and have write access, the repository provides schema migration and POI/locality import commands:

```bash
npm run db:migrate
npm run db:import -- --version=iteration1
```

These commands do **not** create or populate `public.subsidies`. The synthetic subsidy table must be provisioned and populated separately before the Incentives page can return records. See [backend operating notes](docs/BACKEND.md) and [dataset notes](docs/DATASET.md) for the data handover.

Start the app and open [http://127.0.0.1:5173](http://127.0.0.1:5173):

```bash
npm run dev
```

Checks and production build:

```bash
npm run data:validate
npm test
npx tsc --noEmit
npm run build
npm start
```

## API routes

| Route | Purpose |
| --- | --- |
| `GET /api/reach` | Nearby POIs within the one-way walking window |
| `GET /api/localities` | Searchable town/LGA summaries |
| `GET /api/compare` | Facility-based town ranking |
| `POST /api/incentives` | Rule-based synthetic subsidy screening |
| `POST /api/ai/review` | Optional server-side Cloud Qwen extraction review |
| `POST /api/chat` | Optional Groq-backed Compare chat |
| `GET /api/health` | Service/database readiness |
| `GET /api/walk` | Backend street-path endpoint; the current map UI does not display a street navigation path |

## Repository layout

```text
app/                  Next.js pages, UI components and thin API route handlers
backend/config/       Runtime environment validation
backend/controllers/  Request parsing and HTTP responses
backend/services/     Reach, compare, incentive and AI-review logic
backend/repositories/ PostgreSQL data access and test/offline repositories
backend/database/     Shared PostgreSQL connection pool
frontend/api/         Browser-side API clients
shared/contracts/     Validated request and response contracts
lib/                  Shared types and deterministic recommendation extraction
data/                 Supplied POI files and synthetic subsidy CSV
database/             PostgreSQL schema
scripts/              Data validation, migration and import commands
docs/                 Architecture, backend, dataset and deployment notes
.github/workflows/    Main-branch EC2 deployment workflow
```

The deployment workflow verifies tests, types and build before deploying `main` to EC2. It needs the repository's EC2 deployment secrets and a separately configured server/database; see [automatic deployment](docs/AUTO_DEPLOYMENT.md). Use feature branches and PRs for changes; see [branching rules](docs/BRANCHING.md).
