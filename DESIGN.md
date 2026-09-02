---
name: SERINEA
description: Melbourne public-transport reach as a street-directory plate — 15 minutes printed as the only overlay, listed places the only index.
colors:
  ink: "#1c211c"
  ink-soft: "#4a5248"
  paper: "#eef1ea"
  paper-2: "#e3e8e0"
  paper-3: "#c5cbc4"
  land: "#d8dece"
  water: "#5a9aab"
  park: "#7d9a5c"
  arterial: "#c4452a"
  overlay: "#d4782a"
  grid: "#b7c0b4"
  enamel: "#f7f8f4"
  halt: "#9b1c1c"
  halt-wash: "#6f1414"
  map-wash: "#d4dcd4"
typography:
  display:
    fontFamily: "Barlow Condensed, Segoe UI, sans-serif"
    fontSize: "clamp(2.4rem, 5vw, 3.6rem)"
    fontWeight: 800
    lineHeight: 0.92
    letterSpacing: "-0.02em"
  wordmark:
    fontFamily: "Barlow Condensed, Segoe UI, sans-serif"
    fontSize: "1.35rem"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "0.06em"
  headline:
    fontFamily: "Barlow Condensed, Segoe UI, sans-serif"
    fontSize: "1.55rem"
    fontWeight: 800
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  window:
    fontFamily: "Barlow Condensed, Segoe UI, sans-serif"
    fontSize: "2.1rem"
    fontWeight: 800
    lineHeight: 1
  action:
    fontFamily: "Barlow Condensed, Segoe UI, sans-serif"
    fontSize: "1.05rem"
    fontWeight: 700
    letterSpacing: "0.02em"
  operate-title:
    fontFamily: "Barlow Condensed, Segoe UI, sans-serif"
    fontSize: "1.35rem"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  how-display:
    fontFamily: "Barlow Condensed, Segoe UI, sans-serif"
    fontSize: "2rem"
    fontWeight: 800
    lineHeight: 1.05
    letterSpacing: "-0.03em"
  step:
    fontFamily: "Barlow Condensed, Segoe UI, sans-serif"
    fontSize: "1.4rem"
    fontWeight: 800
  leg-min:
    fontFamily: "Barlow Condensed, Segoe UI, sans-serif"
    fontSize: "1.35rem"
    fontWeight: 800
    lineHeight: 1.1
  place-label:
    fontFamily: "Barlow Condensed, Segoe UI, sans-serif"
    fontSize: "13px"
    fontWeight: 700
    letterSpacing: "0.08em"
  grid-ref:
    fontFamily: "Barlow Condensed, Segoe UI, sans-serif"
    fontWeight: 700
  title:
    fontFamily: "Barlow, Segoe UI, sans-serif"
    fontSize: "1.2rem"
    fontWeight: 650
    lineHeight: 1.2
  body:
    fontFamily: "Barlow, Segoe UI, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.45
    fontFeature: '"tnum" 1, "ss01" 0'
  nav:
    fontFamily: "Barlow, Segoe UI, sans-serif"
    fontSize: "0.95rem"
    fontWeight: 600
  label:
    fontFamily: "Barlow, Segoe UI, sans-serif"
    fontSize: "0.78rem"
    fontWeight: 700
    letterSpacing: "0.06em"
  lead:
    fontFamily: "Barlow, Segoe UI, sans-serif"
    fontSize: "1.15rem"
    fontWeight: 400
  result:
    fontFamily: "Barlow, Segoe UI, sans-serif"
    fontSize: "1.05rem"
    fontWeight: 650
    lineHeight: 1.2
  filter:
    fontFamily: "Barlow, Segoe UI, sans-serif"
    fontSize: "0.88rem"
    fontWeight: 600
  small:
    fontFamily: "Barlow, Segoe UI, sans-serif"
    fontSize: "0.92rem"
    fontWeight: 400
  caption:
    fontFamily: "Barlow, Segoe UI, sans-serif"
    fontSize: "0.86rem"
    fontWeight: 400
  micro:
    fontFamily: "Barlow, Segoe UI, sans-serif"
    fontSize: "0.82rem"
    fontWeight: 400
  attribution:
    fontFamily: "Barlow, Segoe UI, sans-serif"
    fontSize: "10px"
    fontWeight: 400
  empty:
    fontFamily: "Barlow, Segoe UI, sans-serif"
    fontSize: "1.15rem"
    fontWeight: 650
rounded:
  none: "0px"
spacing:
  xs: "4px"
  sm: "6px"
  md: "8px"
  lg: "12px"
  xl: "16px"
  2xl: "18px"
  3xl: "28px"
  4xl: "32px"
  5xl: "40px"
components:
  button-cta:
    backgroundColor: "{colors.arterial}"
    textColor: "{colors.enamel}"
    typography: "{typography.action}"
    rounded: "{rounded.none}"
    padding: "12px 22px"
    height: "48px"
  button-cta-hover:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.enamel}"
    rounded: "{rounded.none}"
    padding: "12px 22px"
    height: "48px"
  button-locate:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.enamel}"
    rounded: "{rounded.none}"
    padding: "10px 14px"
  button-locate-hover:
    backgroundColor: "{colors.arterial}"
    textColor: "{colors.enamel}"
    rounded: "{rounded.none}"
    padding: "10px 14px"
  button-filter:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "6px 10px"
  button-filter-on:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.enamel}"
    rounded: "{rounded.none}"
    padding: "6px 10px"
  card-legend:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "28px 26px 24px"
  card-index:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
  card-leg:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "8px 10px"
  card-source:
    backgroundColor: "{colors.paper-2}"
    textColor: "{colors.ink-soft}"
    rounded: "{rounded.none}"
    padding: "10px 12px"
  banner:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.enamel}"
    rounded: "{rounded.none}"
    padding: "10px 28px"
  status-halt:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.halt-wash}"
    rounded: "{rounded.none}"
    padding: "12px 18px"
---

# Design System: SERINEA

## Overview

**Creative North Star: "The Street Directory Plate"**

SERINEA is a Melbourne street directory that happens to live on a screen. Cool atlas paper, cyan water, olive park plates, arterial-red roads and pin, a solid orange 15-minute overlay, and a hairline letter-number grid. Home is the printed plate: inner Melbourne full-bleed, Flinders Street as the square marker, listed places as the only index. Map and How it works are the same atlas opened on the kitchen table — the map is the field, not a hero screenshot.

The world refuses night sounding charts, SaaS map heroes, cream editorial landings, Victorian bond-form chrome, and split-flap lettering. Fifteen minutes is printed once, as an opaque overlay with an ink stroke. Places that fit outbound but blow the return are ghosts: open squares, never indexed.

**Key Characteristics:**
- Cool atlas paper on every chrome surface; cyan water and olive parks only on the plate and as map materials
- Barlow Condensed for titles, wordmark, the 15, and grid refs; Barlow for operate reading
- Arterial red for pin, CTA, current nav, selected marks, and the window numeral
- Solid overlay orange for the 15-minute field, circuit spine, and grid-ref type — never dashed 30 or 60
- Square chrome and square marks (radius 0); listed = filled, omitted = open
- Journeys always posted as one outbound–return circuit; Carto tiles washed to atlas paper

## Colors

Cool atlas paper with cyan water, olive parks, one arterial red, one overlay orange.

### Primary
- **Arterial red** (`{colors.arterial}`): the square pin, primary CTA, current-nav underline, hover/selected marks, the fixed “15”, how-it-works step numerals, locater hover, filter hover stroke. A printed arterial, not a page fill.

### Secondary
- **Overlay orange** (`{colors.overlay}`): the only 15-minute field — opaque fill, ink stroke. Also grid-ref type, the journey-circuit spine, and the demonstration-banner emphasis.

### Tertiary
- **Harbour cyan** (`{colors.water}`): plate field, Yarra, harbour, Albert Park Lake. The directory’s water, not a night chart.
- **Park olive** (`{colors.park}`): park plates on the homepage atlas, 88% opacity.

### Neutral
- **Atlas ink** (`{colors.ink}` / `{colors.ink-soft}`): body type, overlay stroke, listed-mark fill, pin stroke, pressed filters, locate fill, footer.
- **Cool paper** (`{colors.paper}` / `{colors.paper-2}` / `{colors.paper-3}`): chrome field, ghost column, source plates, hairline rules. Green-grey atlas stock, not cream.
- **Land wash** (`{colors.land}`): inner-Melbourne land on the plate.
- **Grid hairline** (`{colors.grid}`): 1px letter-number ticks on the plate.
- **Map wash** (`{colors.map-wash}`): Leaflet stage behind atlas-filtered tiles.
- **Enamel** (`{colors.enamel}`): type on arterial and ink; selected index/result rows.
- **Halt** (`{colors.halt}` / `{colors.halt-wash}`): pin-in-water and empty-service states.

### Named Rules
**The Solid Overlay Rule.** Fifteen minutes is one opaque `{colors.overlay}` plate with a `{colors.ink}` stroke. No dashed 30, no 60, no translucent GIS wash.

**The Arterial Pin Rule.** `{colors.arterial}` is the pin, the CTA, and the selected mark. It is not a background.

**The Atlas Stock Rule.** Chrome sits on `{colors.paper}`. Water and parks are map materials. Do not cream the paper or night the water.

## Typography

**Display Font:** Barlow Condensed (with Segoe UI, sans-serif) — next/font weights 600, 700, 800
**Body Font:** Barlow (with Segoe UI, sans-serif) — next/font weights 400, 500, 600, 700

**Character:** Condensed is the directory title, the wordmark, the printed 15, and the grid reference. Barlow is the operate face so O stays O and W stays W. Tabular numerals are on for minutes.

### Hierarchy
- **Display** (800, clamp 2.4–3.6rem, line-height 0.92, tracked −0.02em): homepage legend H1 only. Measure ~12ch.
- **How display** (800, 2rem, tracked −0.03em): how-it-works H1.
- **Wordmark** (800, 1.35rem, tracked 0.06em): SERINEA in the mast.
- **Headline** (800, 1.55rem): homepage rule-band headings.
- **Window** (800, 2.1rem, `{colors.arterial}`): the fixed “15” on index and map panel.
- **Action** (700, 1.05rem, tracked 0.02em): primary CTA.
- **Operate title** (700, 1.35rem): map panel H1 in condensed.
- **Place label** (700, 13px, tracked 0.08em, 45% ink): suburb names on the plate.
- **Grid ref** (700, `{colors.overlay}`): index and result grid cells.
- **Leg minutes** (800, 1.35rem): journey-cell numerals.
- **Step** (800, 1.4rem, `{colors.arterial}`): how-it-works counters.
- **Title** (650, 1.2rem): how-it-works step headings; result names 1.05rem at 650.
- **Body** (400, 16px, line-height 1.45): reading copy. Legend measure ~38ch; how-it-works ~58ch.
- **Nav** (600, 0.95rem): mast links.
- **Label** (700, 0.78rem, tracked 0.06em, uppercase): journey heads and mode tags.
- **Filter** (600, 0.88rem): category chips.

### Named Rules
**The Condensed Title Rule.** Titles, wordmark, the 15, grid refs, and leg minutes are Barlow Condensed. Operate copy, filters, results, and source plates are Barlow.

**The Window Numeral Rule.** The “15” is Condensed 800 in arterial red. It is not a picker and not a second display face.

## Layout

Home is a full-bleed inner-Melbourne plate (`min-height: calc(100svh - 57px)`). Copy sits on a three-column overlay: legend lower-left (`minmax(280px, 36vw)`), open plate in the middle, index strip on the right (`minmax(280px, 340px)`), padding 28px. Below the plate, a two-column rule band (ghost column + collophon) with ink hairlines. Footer is ink.

Map is a two-column operate shell: atlas stage (`1.35fr`) plus a 300–400px paper panel. A sticky paper mast and an ink demonstration banner sit above. How-it-works is a 42rem reading column on paper.

At 900px: plate stacks (map 48svh, then legend, then index), rule band stacks, map stage is ~48svh, panel border moves to the top, mast padding tightens to 14×16.

Rhythm: 4 / 6 / 8 / 12 / 16 / 18 / 28 / 32 / 40. Mast 16×28; legend 28×26; panel rows 14×18; rule-band cells 40×32.

## Elevation & Depth

The directory is flat printed stock. Depth is plate layers (water, land, parks, arterials, grid, overlay, marks) and 1px ink or paper-3 rules — not card lift. The only shadow is the current-nav inset underline. Selected index and result rows invert to enamel. The CTA presses 1px down on active (killed under `prefers-reduced-motion`). Map pan is 0.35s.

### Shadow Vocabulary
- **Nav current** (`box-shadow: inset 0 -2px 0 {colors.arterial}`): current mast item.

### Named Rules
**The Printed-Flat Rule.** Surfaces are flat. Do not hang the legend, pin, or results on offset shadows.

## Shapes

Chrome is square: buttons, filters, legend, index strip, source plates, leg cells, pin, and POI marks use radius 0. Listed places are filled 8px squares (10px when selected); omitted places are open 8px squares with an ink-soft stroke; the pin is a 12px (home) / 14px (map) arterial square with an ink stroke. Overlay and key swatches are square. Hairlines are 1px ink on plates, 1px paper-3 on operate rows.

### Named Rules
**The Square Mark Rule.** The pin and every POI are squares. Listed = filled. Ghost = open. Do not pill chrome or draw Leaflet circle markers.

## Components

For each component, lead with character, then shape, color, and states.

### Buttons
- **Shape:** square (0 radius). Primary min-height 48px.
- **Primary CTA:** arterial fill, enamel type, Condensed 700, padding 12×22. Hover inverts to ink on enamel. Active translates 1px down (killed under reduced motion).
- **Locate:** ink fill, enamel type, padding 10×14. Hover goes arterial. Disabled is paper-3 on ink-soft.
- **Filters:** hairline ink-soft; pressed inverts to ink fill and enamel type. Hover tints stroke and type arterial (pressed hover keeps enamel type).

### Chips
Category filters on the index and map panel. Unpressed: transparent, 1px ink-soft. Pressed: ink field, enamel type. Not pills. Hovering an index row lights the matching plate mark arterial.

### Cards / Containers
- **Legend:** paper mixed toward white, 1px ink frame, 28×26 padding. Sits on the plate, lower-left. Not a SaaS card.
- **Index strip:** same paper mix, 1px ink frame, right column. Rows are 8×16 with a 2.6rem grid-ref column.
- **Rule band:** paper field; ghost column on paper-2 with a right ink rule.
- **Source plate:** paper-2, 10×12 padding, ink name then dim note. Two plates per result (OSM, GTFS), each with a date.
- **Leg cell:** paper, 1px ink frame, 8×10 padding. Mode in arterial uppercase; minutes in Condensed 800.
- **Halt status:** paper washed with halt (12%), type in halt-wash.

### Inputs / Fields
No free-text fields. The pin is the input. Focus-visible is 2px `{colors.arterial}`, offset 3px, on every control. Caret is arterial. Selection is overlay mixed 70% toward ink, enamel type.

### Navigation
Sticky paper mast, 1px paper-3 bottom rule. Wordmark Condensed tracked. Links Barlow 600, 8×12 padding. Current item: inset 2px arterial underline. Hover type goes arterial.

### Directory plate (signature, Home)
Full-bleed inner Melbourne: cyan water, land wash, olive parks, arterial roads at 55% opacity, 12×10 hairline grid, suburb labels at 45% ink. Solid overlay on top. Flinders pin as a 12px square. Listed marks filled; omitted marks open. Legend lower-left with one action: Open the map. Index strip lists grid ref, name, minutes.

### Reach map (signature, Map)
Carto `light_nolabels` tiles with atlas filter (`grayscale(0.2) sepia(0.18) hue-rotate(62deg) saturate(0.75) brightness(1.06)`, opacity 0.92) on map-wash. Isochrone polygon fill `{colors.overlay}` at opacity 1, ink stroke 1.5px. Square arterial pin with ink stroke. Square POI marks — ink at rest, arterial when selected. Opening a place highlights it; every listed journey stays posted as one circuit (there, back, OSM source + date, GTFS source + date).

## Do's and Don'ts

### Do:
- **Do** print the 15-minute field as opaque `{colors.overlay}` with an ink stroke — on the plate and on the map.
- **Do** list only round-trip places; draw outbound-only as open ghost squares.
- **Do** keep chrome square and marks square (radius 0).
- **Do** set titles, wordmark, 15, and grid refs in Barlow Condensed; operate copy in Barlow.
- **Do** post outbound and return as one visible circuit with source + date on every result.
- **Do** set focus at 2px `{colors.arterial}`, offset 3px, and honour `prefers-reduced-motion` on the CTA press.

### Don't:
- **Don't** revive night sounding charts, ECDIS water, magenta beacons, or teal contours.
- **Don't** ship Inter, cream paper, purple-blue hero gradients, or a SaaS map screenshot card.
- **Don't** dash a 30 or 60 overlay, or fade the 15-minute field into a GIS wash.
- **Don't** pill buttons, round the pin, or use circle POI markers.
- **Don't** put Condensed on operate labels, or Barlow on the legend H1 and window 15.
- **Don't** invent a Fit Score, suburb ranking, or a duration picker.
