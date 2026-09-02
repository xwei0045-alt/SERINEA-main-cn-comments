# SERINEA — The 15 minute map (Iteration 1)

**FIT5120 S2 2026 · Team SERINEA (TA06) · Assignment 1 — Iteration 1**

Frontend prototype for a **15-minute public-transport round-trip reach map**, framed for **small towns and regional Victoria** (not inner-city “nearby”).

This repository is **frontend only**. Map POIs, stops, and journey times are **demonstration data** in `lib/` until the backend/GTFS integration is wired in by the data team.

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

## Stack

| Layer | Technology |
| --- | --- |
| Framework | Next.js 15 (App Router) |
| UI | React 19, TypeScript |
| Styling | CSS Modules + global CSS |
| Map | Leaflet (client-only on `/map`) |

## Routes

| Path | Purpose |
| --- | --- |
| `/` | Scroll-driven landing / product story |
| `/map` | Operate tool — pin, isochrone, reachable POIs |
| `/how` | Short how-it-works |

## Repository layout

```
SERINEA/
├── app/                    # Next.js App Router
│   ├── components/         # Shared UI (Chrome, landing reel)
│   ├── map/                # Map page + Leaflet shell
│   ├── how/                # How-it-works page
│   ├── globals.css         # Design tokens & base styles
│   └── layout.tsx          # Root layout + fonts
├── lib/                    # Data & domain logic (demo today)
│   ├── pois.ts             # Demo POI catalogue
│   ├── stops.ts            # Demo PT stops
│   ├── reach.ts            # Round-trip reach calculation (client)
│   ├── landingDemo.ts      # Homepage atlas demo pins
│   ├── landingStory.ts     # Scroll-reel copy & beats
│   ├── types.ts            # Shared TypeScript types
│   └── sources.ts          # Source stamps & demo banner
├── docs/
│   └── BACKEND.md          # Where backend / GTFS will plug in
├── PRODUCT.md              # Product spec (mentor reference)
├── DESIGN.md               # Visual / UX direction
└── package.json
```

## Data stance (Iteration 1)

- **Not live GTFS.** All journeys and POIs are labelled demonstration data.
- **Fixed 15-minute window** — outbound + return must fit; no 30/60 options.
- **Round-trip filter:** if return does not fit, the place is omitted (or shown as ghost on the landing demo only).

See `docs/BACKEND.md` for integration points for the backend developer.

## Branch

Active development for the mentor demo: **`Iteration-1`**.

## Team

Team SERINEA (TA06) — roles and phases are summarised on the landing scroll reel (`lib/landingStory.ts`).
