# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Next.js 15 App Router, React 19, TypeScript, CSS. Leaflet is loaded only on `/map` via dynamic import. Reach queries run through Next.js APIs over the Iteration 1 regional extract.

## Users

Primary: people living in or moving to **regional Victoria** who need to know what they can actually reach from a pin — typically without assuming inner-city tram frequency. Desktop-first for the industry-mentor demo; still usable on a phone.

Not for: inner Melbourne CBD coverage this pass, live door-to-door GTFS, or statewide access-gap comparison (Iteration 3).

Persona: someone in a regional centre (Shepparton, Mildura, Wodonga) who needs a GP, grocery, pharmacy, park or gym they can get to **and back from** in fifteen minutes.

## Product Purpose

SERINEA Iteration 1 is **the 15 minute map** for **regional Victoria**: drop a pin and see parks, groceries, GPs, pharmacies and gyms reachable in a **fixed 15-minute window**, including the return. Success is a truthful reachable set — if you cannot get back in the same budget, the place does not appear.

## Positioning

The mechanism neighbouring “nearby” maps do not ship: **round-trip awareness inside a hard 15-minute budget**. Outbound-only nearby is treated as a lie. Every result shows the journey (legs, minutes) and the data source plus date. This pass uses **walking estimates**; public-transport times wait on GTFS.

## Operating Context

FIT5120 S2 2026, Team SERINEA (TA06), Assignment 1 Iteration 1 (Week 6, 10%). Desktop-first prototype. Places come from a regional OpenStreetMap extract joined with ABS LGA and Vicmap locality fields (32,569 POIs, 1,778 localities). Journeys are straight-line walking at 4.8 km/h, labelled as such. No live GTFS.

## Capabilities and Constraints

**In Iteration 1:**
- Drop a pin by clicking the map, searching a town, or using geolocation; default **Shepparton** if location is denied.
- Travel window is **fixed at 15 minutes**. No 30 or 60 option. No duration picker.
- Show POIs in: park, grocery, GP, pharmacy, gym (mapped from the regional extract).
- Round-trip filter in code: a place appears only if outbound minutes + return minutes ≤ 15. If outbound fits but return does not, it is omitted.
- Each result shows journey (mode, legs, minutes) and source + date.
- Empty/error states in plain language: nothing in range, location denied, pin outside the extract.
- Routes: `/` (marketing), `/map` (tool), `/how` (short how-it-works). No Iteration 2/3 routes.

**Out of scope Iteration 1:** inner Melbourne coverage; live GTFS routing; food / general shops / museum filters (not in the mapped extract); accounts; suburb ranking.

**Open (labelled, not invented as live transit):** OpenStreetMap places are real coordinates. Walking times are estimates until DTP GTFS is ingested.

## Brand Commitments

Product name: **SERINEA**. Voice: plain English. Trust is provenance (source + date), not personality. Do not claim live GTFS. Do not offer 30 or 60 minute windows. Homepage is regional Victoria — no Melbourne CBD welcome. The map is a clean operate tool on `/map`. Barlow / Barlow Condensed on operate surfaces.

## Evidence on Hand

Regional POI CSVs in `data/` (OSM + ABS LGA + Vicmap locality). Walking estimates from `EstimatedJourneyCalculator`. Intended later: DTP GTFS Schedule for public-transport journeys.

## Product Principles

1. Fifteen minutes is the product, not a default in a picker.
2. Round-trip is a filter, not a caption.
3. Show the working: journey legs and source + date on every result.
4. Name the estimate: this pass is walking, not live GTFS.
5. Homepage persuades; the map operates. Both must say regional Victoria.

## Accessibility & Inclusion

WCAG-oriented: keyboard operable, visible focus, contrast ≥ 4.5:1 for body text, `prefers-reduced-motion` honoured. Audience includes people new to Australian English and to regional geography — labels stay plain. Map type uses a complete Latin sans (Barlow) so O/C and W/V stay distinct.
