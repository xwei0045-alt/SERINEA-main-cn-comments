# Backend integration (Iteration 1+)

This repo ships **frontend only**. The map and landing page consume **static demo data** under `lib/`. A backend or data pipeline should replace or feed these modules without changing route structure.

## What the UI expects

### Types (`lib/types.ts`)

All API responses should map to these shapes:

- `Poi` — id, name, category, lat, lng, suburb
- `Stop` — id, name, lat, lng, mode (`tram` | `train` | `bus`), routes[], optional oneWay
- `Journey` — outbound/inbound legs, minute totals, `roundTripMinutes`
- `ReachablePoi` — `{ poi, journey }`
- `SourceStamp` — name, date, note (shown on every result)

### Reach rule (product invariant)

```text
roundTripMinutes = outboundMinutes + inboundMinutes
Include POI only if roundTripMinutes <= WINDOW_MINUTES (15)
```

Implemented today in `lib/reach.ts` (`reachableFromPin`). Backend can precompute or expose an endpoint; frontend will swap the caller.

## Files to replace or feed

| File | Current | Backend target |
| --- | --- | --- |
| `lib/pois.ts` | Static Melbourne demo POIs | OSM extract or API: `/pois?bbox=…` |
| `lib/stops.ts` | Static inner-Melbourne stops | GTFS stops API or bundled extract |
| `lib/reach.ts` | Client-side walk + mode approximation | GTFS routing service: `/reach?lat=&lng=&window=15` |
| `lib/sources.ts` | Hard-coded demo stamps | Return real extract dates from API |
| `lib/landingDemo.ts` | Scroll-reel demo pins only | Optional; marketing can stay static |

## Suggested API contract (future)

```http
GET /api/reach?lat=-37.82&lng=144.97&window=15
```

Response sketch:

```json
{
  "windowMinutes": 15,
  "sources": {
    "poi": { "name": "OpenStreetMap (ODbL)", "date": "2026-08-01" },
    "gtfs": { "name": "DTP GTFS Schedule", "date": "2026-08-18" }
  },
  "results": [
    {
      "poi": { "id": "…", "name": "…", "category": "grocery", "lat": 0, "lng": 0, "suburb": "…" },
      "journey": {
        "outboundMinutes": 4.2,
        "inboundMinutes": 4.8,
        "roundTripMinutes": 9.0,
        "outbound": [{ "mode": "walk", "minutes": 4.2, "text": "…" }],
        "inbound": [{ "mode": "bus", "minutes": 4.8, "text": "…" }]
      }
    }
  ]
}
```

## Frontend hook points

| Component | Import today | Swap strategy |
| --- | --- | --- |
| `app/map/MapApp.tsx` | `reachableFromPin` from `lib/reach.ts` | `fetch('/api/reach')` or server action |
| `app/map/ReachMap.tsx` | Leaflet + pin state | No change if coords come from same types |
| `app/components/landing/LandingExperience.tsx` | `DEMO_PINS` from `lib/landingDemo.ts` | Optional API for live demo town |

## Environment variables (when backend exists)

Add to `.env.local` (not committed):

```env
NEXT_PUBLIC_API_BASE_URL=https://…
```

Document the variable here when the backend URL is known.

## Out of scope this branch

- Live GTFS zip in the browser
- User accounts / auth
- Regional statewide comparison (Iteration 3)
