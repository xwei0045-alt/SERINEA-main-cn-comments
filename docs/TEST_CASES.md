# Iteration 1 test cases

Written to ISO/IEC/IEEE 29119-3 (test case spec) and scored against ISO/IEC 25010 quality.

Run the automated ones with `npm test`. The manual ones are for the live map once the URL is frozen.

No debugger statements in the app. If a test fails, the product rule broke.

## How to read an ID

`TC-F01` means functional. `TC-P` is performance. `TC-R` is reliability. `TC-U` is usability. `TC-S` is security of input.

## Automated cases

### TC-F01 Round trip both ways
- Characteristic: functional completeness
- Priority: high
- Precondition: ReachService with a fake list that includes a one way only place
- Steps: search with a 15 minute window
- Expected: only places with there and back, and round trip at most 15, stay in the list
- Automated: `backend/iso/iso29119.test.ts`

### TC-F02 Category filter
- Characteristic: functional correctness
- Priority: high
- Precondition: mixed park and pharmacy rows
- Steps: search with categories pharmacy
- Expected: every returned place is pharmacy
- Automated: `backend/iso/iso29119.test.ts`

### TC-F03 Dataset totals
- Characteristic: functional correctness
- Priority: high
- Precondition: both Iteration 1 CSV files in `/data`
- Steps: load the dataset
- Expected: unique osm ids, positive total, and summary total matches detail; this is an offline fixture test, not a live coverage count
- Automated: `CsvDatasetLoader.test.ts`

### TC-F06 Town search
- Characteristic: functional completeness
- Priority: high
- Precondition: locality summary CSV
- Steps: search q=ABBEYARD
- Expected: one match and a positive fixture-wide POI total still reported
- Automated: `LocalitySummaryService.test.ts`

### TC-F07 Postgres contract
- Characteristic: compatibility
- Priority: medium
- Precondition: fake database rows
- Steps: search through PostgresReachRepository
- Expected: same response shape the map already uses
- Automated: `PostgresReachRepository.test.ts`

### TC-F08 Remaining path
- Characteristic: functional correctness
- Priority: high
- Precondition: three point path, walker on the middle point
- Steps: remainingAlongPath
- Expected: remaining metres drop, leftover path still has two points
- Automated: `lib/walkCopy.test.ts`

### TC-F09 Mapper keeps map types only
- Characteristic: functional completeness
- Priority: high
- Precondition: park, doctor, school rows
- Steps: RegionalPoiMapper.toMapPoi
- Expected: park stays park, doctor becomes gp, school is skipped
- Automated: `backend/iso/iso29119.test.ts`

### TC-F10 Reject a 30 minute window
- Characteristic: functional correctness
- Priority: high
- Precondition: reach query schema
- Steps: send window=30
- Expected: parse fails. Product is 15 minutes only
- Automated: `backend/iso/iso29119.test.ts`

### TC-P02 Walk time at 4.8 km/h
- Characteristic: performance efficiency
- Priority: high
- Precondition: 0.8 km straight line
- Steps: EstimatedJourneyCalculator
- Expected: about 10 minutes one way, 20 minutes round trip
- Automated: `backend/iso/iso29119.test.ts`

### TC-P03 Walking seconds helper
- Characteristic: performance efficiency
- Priority: medium
- Steps: 4800 m at 4.8 km/h
- Expected: 3600 seconds
- Automated: `lib/walkCopy.test.ts`

### TC-R01 Street router ignores driving speed
- Characteristic: reliability
- Priority: high
- Precondition: fake OSRM that returns 4800 m in 200 seconds
- Steps: FootWalkRouter.route
- Expected: duration uses 4.8 km/h, not the car time
- Automated: `backend/iso/iso29119.test.ts`

### TC-U01 Plain English turns
- Characteristic: usability
- Priority: high
- Steps: describeWalkStep for left turn, depart, arrive
- Expected: "Turn left onto Pall Mall", "Start walking along Edward Street", "You have arrived"
- Automated: `lib/walkCopy.test.ts`

### TC-U02 Remaining clock
- Characteristic: usability
- Priority: medium
- Steps: formatRemainingClock(62)
- Expected: 1:02
- Automated: `lib/walkCopy.test.ts`

### TC-S01 Bad coordinates rejected
- Characteristic: security of input (ISO 25010 security)
- Priority: high
- Steps: lat=999 on reach query, missing toLat on walk query
- Expected: schema fails. API would return 400
- Automated: `backend/iso/iso29119.test.ts`

### TC-F11 Postgres town search
- Characteristic: compatibility
- Priority: medium
- Precondition: fake database locality rows
- Steps: LocalitySummaryService through PostgresLocalitySummaryRepository
- Expected: town search still returns the grouped row
- Automated: `PostgresLocalitySummaryRepository.test.ts`

## Manual cases (live map, do not skip)

### TC-M01 Shepparton has a list
- Open `/map`
- Expected: pin on Shepparton, places in the list, no empty Melbourne screen

### TC-M02 Filters
- Tap Park, then All
- Expected: list shrinks then comes back. Map markers match the list. Layout does not jump off the page

### TC-M03 Town search
- Type Mildura, pick it
- Expected: pin moves, new places load, landing page still looks the same if you go home

### TC-M04 Street path
- Pick a grocery
- Expected: orange line on streets, There and Back minutes, Start walk enabled

### TC-M05 Start walk
- Press Start walk
- Expected: remaining clock, overlay stays on screen, pin cannot be dragged until you end the walk

### TC-M06 Phone layout
- Open `/map` on a phone
- Expected: map still fills, search does not zoom the page, buttons are easy to hit

Copy this file into the PGP Testing folder when you freeze the build.
