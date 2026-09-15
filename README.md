# SERINEA

**FIT5120 S2 2026 | Regional Victoria relocation prototype**

SERINEA helps people explore regional Victorian towns before relocating. Users can see what is within a 15-minute walk, compare towns by nearby facilities, and check prototype relocation incentives. The AI Recommendation page turns a free-text request into facility preferences; town rankings and incentive checks still follow backend data and rules.

## Explore the app

- **Map:** Find nearby places from a selected pin using a fixed 15-minute one-way walking estimate.
- **Compare:** Rank towns by the facilities that matter to you.
- **Incentives:** Screen fictional relocation subsidies for a selected town.
- **AI Recommendation:** Describe your needs in English and review suggested towns.

Walking times are straight-line estimates, not street navigation. Incentive records are synthetic and are not official government programs or eligibility decisions.

## Run locally

You need Node.js, npm and a populated PostgreSQL database. Copy `.env.example` to `.env.local` and set `DATABASE_URL` for your database. Keep credentials out of Git.

```bash
npm ci
npm run dev
```

Open [http://127.0.0.1:5173](http://127.0.0.1:5173). For database setup and optional AI keys, see [backend setup](docs/BACKEND.md). The Incentives page also requires a populated `public.subsidies` table; the POI import command does not populate it.

## Check the project

```bash
npm test
npm run build
```

## More detail

- [Product rules](PRODUCT.md)
- [Architecture](docs/ARCHITECTURE.md) and [backend/API notes](docs/BACKEND.md)
- [Datasets and limitations](docs/DATASET.md)
- [Deployment](docs/AUTO_DEPLOYMENT.md) and [branching](docs/BRANCHING.md)
