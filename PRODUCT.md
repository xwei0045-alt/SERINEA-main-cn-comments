# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Next.js 15 App Router, React 19, TypeScript, CSS. Leaflet is loaded only on `/map` via dynamic import. Confirmed by the existing SERINEA app and the Iteration 1 rebuild brief.

## Users

Primary: people new to Melbourne who rely on public transport and need to know what they can actually reach from a pin — typically students and recent arrivals choosing where to live or checking a share-house. Desktop-first for the industry-mentor demo; still usable on a phone.

Not for: drivers, live door-to-door GTFS Realtime, regional Victoria (Iteration 2), or statewide access-gap comparison (Iteration 3).

Persona carried forward: Priya Raghavan, 23, new to Melbourne, no car, needs groceries, a GP, and a park she can get to **and back from** on PT before her next class.

## Product Purpose

SERINEA Iteration 1 is **the 15 minute map**: drop a pin in Melbourne and see food, shops, gyms, groceries, GPs, pharmacies, parks and museums reachable by public transport in a **fixed 15-minute window**, including the return. Success is a truthful reachable set — if you cannot get back in the same budget, the place does not appear.

## Positioning

The mechanism neighbouring journey planners do not ship: **round-trip awareness inside a hard 15-minute public-transport budget**. Outbound-only “nearby” is treated as a lie. Every result shows the actual journey (mode, legs, minutes) and the data source plus date.

## Operating Context

FIT5120 S2 2026, Team SERINEA (TA06), Assignment 1 Iteration 1 (Week 6, 10%). Desktop-first prototype. Live GTFS routing for all Melbourne is out of scope this pass; the map ships **labelled demonstration data** (synthetic / precomputed POIs and approximated journeys that *would* come from OSM ODbL and DTP GTFS Schedule).

## Capabilities and Constraints

**In Iteration 1:**
- Drop a pin by clicking the map or using geolocation; default Flinders Street, Melbourne if location is denied.
- Travel window is **fixed at 15 minutes**. No 30 or 60 option. No duration picker. Copy says 15 minutes, never 30.
- Show POIs in: food, shops, gym, grocery, GP, pharmacy, park, museum.
- Round-trip filter in code: a place appears only if outbound minutes + return minutes ≤ 15. If outbound fits but return does not, it is omitted.
- Each result shows journey (mode, legs, minutes) and source + date.
- Empty/error states in plain language: pin in water, no services, location denied.
- Routes: `/` (marketing), `/map` (tool), `/how` (short how-it-works). No Iteration 2/3 routes.

**Out of scope Iteration 1:** regional / same-day return / hospital; Victoria access-gap / ABS / compare towns / best day; live GTFS zip in the browser; accounts; Fit Score / suburb ranking (superseded).

**Open (not invented as live):** real GTFS Schedule extracts and Overpass POI extracts. Demonstration data is labelled until those exist.

## Brand Commitments

Product name: **SERINEA**. Voice: plain English. Trust is provenance (source + date), not personality. Do not claim live GTFS. Do not offer 30 or 60 minute windows. Homepage welcomes people who feel lost in Melbourne and explains what we are building — no map on the door; the map is a clean operate tool on `/map`. Barlow / Barlow Condensed (complete Latin; O≠C, W≠V) on operate surfaces. User rejected Victorian bond-form UI, split-flap lettering that clipped characters, the night nautical sounding-chart UI, and a map-first homepage.

## Evidence on Hand

Demonstration POIs and approximated public-transport journeys in `lib/`, labelled. Intended live sources (not ingested this pass): OpenStreetMap ODbL; Department of Transport and Planning GTFS Schedule. No live GTFS zip is fetched.

## Product Principles

1. Fifteen minutes is the product, not a default in a picker.
2. Round-trip is a filter, not a caption.
3. Show the working: journey legs and source + date on every result.
4. Name the demo: this pass is not live GTFS.
5. Homepage persuades; the map operates.

## Accessibility & Inclusion

WCAG-oriented: keyboard operable, visible focus, contrast ≥ 4.5:1 for body text, `prefers-reduced-motion` honoured. Audience includes people new to Australian English and to Melbourne geography — labels stay plain. Map type uses a complete Latin sans (Barlow) so O/C and W/V stay distinct.
