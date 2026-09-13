# Branching and feature ownership

## Rule

Work on **feature branches**, not on `main` or long-lived dump branches.

```
main / Iteration-1     → mentor / release snapshots (merge only)
feature/<name>         → one product capability
```

## Active features

| Branch | Owns | Do not mix in |
| --- | --- | --- |
| `feature/maps` | Pin, reach hull, places list, walk HUD, `/map`, `/api/reach`, `/api/walk` | Compare ranking UI, AI Assistant page |
| `feature/filters` | Compare prefs, weights, town ranking, `/compare` (manual UI), `/api/compare` | Map canvas, AI Assistant page |
| `feature/ai-assistant` | Separate `/ai-assistant` mock page | Map Leaflet code, Compare ranking |
| `feature/data` | CSV / Postgres extract, dedupe, `data/*.csv`, loaders, `DATASET.md` | UI chrome, landing copy |
| `feature/home` *(optional)* | Landing `/`, `/story`, how-it-works marketing copy | Backend ranking maths |

Legacy names (`backend-integration`, `data-integration`, `backend-integration-new-dataset`) stay as history. Prefer the `feature/*` names for new work.

## How to work

1. `git fetch`
2. Branch from the latest shared integration tip your team agrees on (usually `main` or `backend-integration` until cut over).
3. Name it `feature/<capability>`.
4. Open a PR into the shared branch. Keep the PR scoped to that feature folder list in `features/<name>/README.md`.
5. Do **not** put AWS / EC2 / domain work on feature UI branches. That is a separate infra owner track.

## File layout

Runtime routes stay under `app/` (Next.js requirement). Implementation ownership lives under `features/`:

```
features/
  maps/
  filters/
  ai-assistant/
  data/
```

Each folder’s `README.md` lists the paths that belong to that feature. Move code into these folders when you touch that feature; do not big-bang move everything in one PR.

## Data

Revised Iteration 1 extract (deduped, ~21k POIs) lives on `feature/data` (from `backend-integration-new-dataset`). Merge that before trusting Compare park/grocery counts in demos.
