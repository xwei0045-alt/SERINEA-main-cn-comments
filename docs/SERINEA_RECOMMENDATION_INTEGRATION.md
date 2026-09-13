# SERINEA Town Recommendation — Website Integration Record

**Date:** 12 September 2026  
**Checkout:** `SERINEA-TP06-latest`  
**Status:** Local combined lifestyle + mock-incentive candidate; production acceptance still pending

The website presents this feature as **AI Recommendation**. Its English
introduction explains that lifestyle preferences, personal circumstances,
local town records and mock incentive policies are used to suggest regional
areas for the user to consider.

## 1. Final architecture

```text
English user message
        ↓
Deterministic catalogue retrieval and profile parser
        ↓
Editable preference confirmation (five importance levels)
        ↓
Existing /api/compare endpoint
        ↓
CompareService.rank() + PostgreSQL/RDS in production
        ↓
About five grounded town cards + verified POI record counts
        ↓
Town selection and existing Map page

If incentive guidance is requested:
User profile + lifestyle-ranked towns or an explicitly named town
        ↓
Local 450-row synthetic subsidy CSV retrieval
        ↓
Deterministic eligibility-condition screening
        ↓
Separate Potential Incentive / Possible Match / More Information Needed signal
```

Qwen3-0.6B is an optional browser-side review. It never produces or changes a
town ranking. A disagreement, download failure, or lack of WebGPU leaves the
deterministic extraction active.

The deployment data path remains PostgreSQL/RDS. Local development can set
`REACH_DATA_SOURCE=csv` and use the two supplied Iteration 1 CSV files through
the same repository and ranking interfaces.

## 2. Fixed product rules preserved

- AI does not rank towns by intuition.
- Lifestyle preferences determine town order.
- No overall suitability percentage is shown in the Assistant.
- Incentives are a separate request and never change lifestyle ranking.
- “Nearby” is not claimed by the recommendation cards. They show town-wide
  dataset records only.
- Counts indicate dataset availability, not quality.
- Child age never creates a school preference.
- Preferences use flexible `target + importance` objects.
- Importance has five levels: `very_high`, `high`, `medium`, `low`, `very_low`.
- Unsupported safety, housing affordability, internet quality, and service
  frequency requests remain visible and are excluded from ranking.
- Users can correct extraction through the controls or a later message.
- Planning users receive `Potential Incentive`; already-moved users receive
  `Possible Match` only when every checked field is present and passes.
- Mock incentive results never reorder the lifestyle-ranked towns.

## 3. Data and ranking integration

The Assistant calls the existing `/api/compare` route. That route validates
preference IDs and calls the existing `CompareService.rank()` implementation.
The Assistant sends numeric weights `5, 4, 3, 2, 1` for the five importance
levels. Subsidy information is not sent as a ranking feature.

The supported recommendation catalogue contains the actual extract
subcategories, six category totals, and two documented name proxies:

- `primary_school`: `subcategory == school` and POI name contains `Primary`.
- `gym`: `subcategory == sports_centre` and POI name contains `gym` or `fitness`.

Proxy counts describe existing POI rows and are not added again to category or
total POI counts. The response includes `evidenceMethod` and a user-visible
warning for each name proxy.

## 4. Browser model integration

- Model: `onnx-community/Qwen3-0.6B-ONNX`
- Runtime: `@huggingface/transformers` 3.8.1
- Device: WebGPU
- Quantisation: `q4f16`
- First model download: approximately 570 MB, then browser-cached
- External LLM API: none

The runtime is loaded only after the user enables **Local Qwen review**. The
model receives the message and deterministic catalogue matches, then returns a
small JSON review. Its output is compared with the deterministic extraction.
It cannot write preferences, scores, town names, or ranking results.

No fine-tuning was performed during website integration. Earlier frozen Tiny
evidence showed high preference-target recall but insufficient complete-field
accuracy, so the recorded product decision remains:

> Deterministic parser is primary; Tiny is auxiliary.

## 5. Chronological debugging log

### 5.1 Initial automated run was blocked by local permissions

**Observed:** `tsx` could not create its temporary IPC pipe and TypeScript could
not write `tsconfig.tsbuildinfo` from the restricted execution context.

**Diagnosis:** environment permission failure; no application assertion or type
error had run yet.

**Fix:** reran the same commands with the authorised local-checkout permission.

**Result:** the tests ran and exposed reproducible parser failures.

### 5.2 First frozen parser result: 58/67 exact

**Observed failures:** nine cases across the 30 targeted and 37 regression
inputs.

**Representative failures and causes:**

| Input pattern | Incorrect result | Root cause |
| --- | --- | --- |
| `My weekly income is 1180` | `income_scope=unknown` | Scope rule matched `my income` but not an adjective between the words. |
| `children aged 4 and 11` | user `age=4` | Adult-age pattern accepted bare `aged`. |
| `frequent train services` | added `railway_station` | Train alias was broader than the exact station requirement. |
| `I prefer a doctor and need grant guidance` | doctor became `high` | Importance fallback read the unrelated grant clause. |
| `low-crime neighbourhood` | unsupported request missed | Unsupported alias handled a space but not a hyphen. |

**Method changes:**

- Individual income now recognises `my ... income` while household remains a
  separate scope.
- Adult age requires an explicit first-person phrase.
- Railway station retrieval requires a station phrase.
- `prefer` and `want` are explicit medium-importance cues, preventing a later
  clause from changing their importance.
- Added the hyphenated low-crime alias.

**Retest:** 30/30 targeted and 37/37 regression cases passed exactly.

### 5.3 Conversation correction test

**Input 1:** `A dentist is essential and I prefer a library.`  
**Input 2:** `Remove the dentist. The library is only a minor bonus.`

**Result:** dentist was removed and library became `very_low`. The test passed.

### 5.4 Real-data ranking smoke test

The first temporary command used top-level `await`; the current `tsx -e`
module mode rejected it. Wrapping the same check in an asynchronous function
fixed the test harness without changing application code.

**Input:** `primary_school` weight 5 and `pharmacy` weight 2.  
**Source:** actual Iteration 1 CSV data.  
**Scored localities with at least one record:** 508.  
**Top five:** Wangaratta, Shepparton, Mildura, Traralgon, Warrnambool.  
**Top evidence:** Wangaratta had 7 name-identified primary-school records and 6
pharmacy records.

### 5.5 Local website initially could not rank

**Observed:** the page correctly extracted the two preferences, but
`/api/compare` returned `ECONNREFUSED` because the checkout had no `.env.local`
or reachable RDS instance.

**Diagnosis:** the deployed database-only factory was active even though the
repository already contained CSV implementations.

**Fix:** restored an explicit `REACH_DATA_SOURCE=csv|database` choice. Database
remains the default and still requires `DATABASE_URL`; `.env.local` selects CSV
only for local demonstration.

**Retest:** `/api/compare` returned HTTP 200 with five real town cards.

### 5.6 Dependency audit

**Observed:** the first install reported advisories in the old Next.js patch,
PostCSS, and Sharp.

**Changes:**

- Next.js `15.5.2` → `15.5.24`
- Sharp override → `0.35.4`
- PostCSS override → `8.5.23`

**Result:** `npm audit --omit=dev` reported zero vulnerabilities.

### 5.7 Broad and specific facility hierarchy

**Request:** replace the flat Compare facility list with broad categories that
can be selected directly or expanded to choose specific facility types.

**Implemented groups:**

| Broad category | Specific types |
| --- | --- |
| Education | School, Primary school, Kindergarten, Childcare, College |
| Healthcare | Doctor, Clinic, Dentist, Hospital, Pharmacy |
| Shopping & essentials | Supermarket, Convenience store |
| Community life | Library, Community centre, Town hall, Social facility |
| Parks & recreation | Park, Nature reserve, Playground, Garden, Sports centre, Gym or fitness centre |
| Public transport | Bus stop, Bus station, Railway station, Railway halt, Tram stop, Public transport platform, Public transport station, Public transport stop |

The broad category and its specific types are mutually exclusive. Selecting a
specific type replaces its selected parent, and selecting the parent removes
selected children in that branch. This prevents the same records from being
weighted twice while preserving choices from other branches.

**Observed UI issue:** the expanded Education types were present in the page but
the category card clipped them because the grid rows were allowed to shrink.

**Fix:** category rows now size to their content. Childcare and College were then
visibly selectable together, and choosing Education replaced both.

**Ranking retest:** Education and Healthcare ran through the existing Compare
API and returned ranked results for 588 regional localities. The result labels
showed the two broad evidence groups separately.

## 6. Verification results

| Check | Result |
| --- | --- |
| Frozen targeted extraction | 30/30 exact |
| Frozen regression extraction | 37/37 exact |
| Follow-up correction | Passed |
| Primary-school/gym proxy ranking | Passed |
| Full repository test command | 39 tests passed, 0 failed |
| TypeScript | Passed |
| Production dependency audit | 0 vulnerabilities |
| Next.js production build | Passed |
| Real CSV Assistant request | HTTP 200, five towns returned |
| Recommendation → Map | Wangaratta URL and 129 within-15-minute records rendered |

The production build retained one pre-existing Autoprefixer warning in
`app/components/landing/homeDesk.module.css` about `start` versus `flex-start`.
It is outside the Assistant integration and did not fail the build.

## 7. Implemented website behaviour

- English message input and sample prompts.
- Flexible preference extraction with five importance levels.
- User-editable importance dropdowns and remove controls.
- Multi-turn correction and removal.
- Unsupported-requirement disclosure without proxy mapping.
- About five ranked town cards from the authoritative Compare service.
- Per-town verified record counts and name-proxy warnings.
- Keep/remove town controls and Map links.
- Optional local Qwen review with WebGPU capability detection.
- Deterministic fallback when Qwen is disabled, unavailable, or disagrees.
- Local CSV mode and production RDS mode.
- Broad Compare categories with expandable, dataset-backed specific types.
- Parent/child replacement rules that prevent duplicate category weighting.

## 8. Known limitations and next integration steps

1. Production incentive screening reads 450 synthetic rows from
   `public.subsidies` in PostgreSQL. The CSV adapter is retained only for
   isolated validation and unit tests. These are fictional prototype records,
   not government programs. Real policy deployment still requires sourced
   records, update dates, ownership and expiry handling.
2. The application database role must have `SELECT` permission on
   `public.subsidies`. Verify that permission and run the same Assistant request
   against the deployed database before merging to `main`.
3. The browser model needs WebGPU and a large first download. The deterministic
   system remains fully usable without it.
4. Name-based primary-school and gym coverage is incomplete by design. The UI
   states this wherever those targets are used.
5. The current parser evaluation covers the frozen 67 English cases. Collect
   anonymised corrections from real website use and create a new unseen holdout
   before deciding whether further fine-tuning is justified.

For production, set:

```env
REACH_DATA_SOURCE=database
DATABASE_URL=postgresql://...
```

Do not add a server-side LLM key. The optional Tiny model is downloaded and run
inside the user's browser.

## 9. Combined lifestyle and incentive integration — 12 September 2026

### Data inspection before implementation

The original CSV was located beside the frozen Incentive notebook and inspected
before any website schema was written. Confirmed facts:

- 450 rows and 43 columns.
- 304 localities across 51 LGA names and 9 regional groups.
- Every row has `is_synthetic=true` and a fictional record notice.
- 330 rows are `mock_open`, 75 `mock_upcoming`, and 45 `mock_closed`.
- Eligibility fields include applicant/dependent-child age, individual/household
  annual gross income limits, new-resident requirement, move distance and the
  90-day application window.

### Frozen notebook behavior reviewed

The first notebook used `all-MiniLM-L6-v2` embeddings to retrieve candidate
subsidies, then `check_subsidy()` to decide matched, missing and failed rules.
Qwen explained the deterministic result and was explicitly forbidden from
making a new eligibility decision.

### Website decision

The website does not copy the embedding model. Its policy rows already contain
structured locality, category and eligibility fields, so exact retrieval is
more auditable and avoids another browser download. Deterministic category and
area retrieval replaces embedding RAG for this synthetic dataset. A future RAG
layer is reserved for retrieving real policy text and citations; it may not
rank towns or make eligibility decisions.

Qwen3-4B and Qwen3-0.6B are not weight-compatible stages. No 4B weights were
transferred to Tiny. The frozen 4B notebook remains the evaluated reference;
browser Tiny remains an optional extraction review. Distillation or LoRA on
Tiny would require a labelled training dataset and a new frozen evaluation, so
it was not claimed or performed here.

### Matching changes from the first notebook

- Standardises locality and LGA keys before matching.
- Filters out `mock_closed` records and labels upcoming mock records.
- Uses dependent child ages only for dependent-child rules; applicant age is
  never substituted.
- Requires income amount, individual/household scope, annual/monthly/weekly
  period and gross/net basis before comparing with an annual gross limit.
- Converts explicit weekly or monthly gross income to an annual amount.
- A known failed condition removes the policy from displayed candidates.
- Missing facts remain visible as `To verify` fields.
- Planning mode uses `Potential Incentive`; already-moved or unknown mode uses
  `More Information Needed` until all checks pass.

### New website paths

- `POST /api/incentives`: validates the request and reads synthetic records from PostgreSQL.
- Named-area mode: retrieves policies for a locality or up to five localities in
  a named LGA.
- Combined mode: receives the existing five lifestyle-ranked towns and returns
  up to three separate mock policy records for each, preserving input order.
- The Assistant now accepts incentive-only questions and combined lifestyle +
  incentive requests, displays missing facts, and keeps the mock notice visible.

### Debugging and validation results

The first direct smoke command failed before ranking because standalone `tsx`
does not load Next.js `.env.local`; the service therefore used its production
database default and correctly required `DATABASE_URL`. The command was rerun
with `REACH_DATA_SOURCE=csv`. The five lifestyle localities and five incentive
groups were returned in the identical order: Wangaratta, Shepparton, Mildura,
Traralgon and Warrnambool. Every returned policy status was `Potential
Incentive`.

The first browser run of the named-area example exposed an intent-recognition
gap: `moving support` was not included in the original grant/incentive/subsidy
keywords. The deterministic extractor therefore asked for a lifestyle
preference instead of calling the policy endpoint. The policy-intent vocabulary
was expanded to policy, benefit, rebate, voucher, financial help and moving
support, then protected by a new regression test.

Final observed checks after that fix:

- Five IncentiveService tests passed against the actual 450-row CSV.
- The frozen 30 targeted and 37 regression extraction cases remained exact.
- The new moving-support regression test passed and preserved age, income
  scope/period/basis, move timing and explicit new-resident status.
- Full repository suite: 36 tests passed, 0 failed.
- TypeScript: passed.
- Production build: passed; `/api/incentives` appears as a dynamic route.
- Browser named-town flow: Lucas returned two non-closed mock records; Moving
  Expense Support was `Possible Match`, while School Essentials Support was
  `More Information Needed` because dependent-child age was absent.
- Browser combined flow: the five lifestyle-ranked towns stayed in their
  original order and four separate policy records were shown as `Potential
  Incentive`. Traralgon correctly showed zero matching non-closed records for
  the retrieved categories.
- Visual check: policy cards use a separate warm-toned panel inside each town
  card, retain the synthetic-data notice, and do not display a combined score.

The production build still reports the pre-existing Autoprefixer warning in
`app/components/landing/homeDesk.module.css:738`; it is unrelated to this
integration.

During the final visual rename check, the already-running development server
showed `__webpack_modules__[moduleId] is not a function` after `next build` had
written to the same `.next` directory. The production build had already passed;
the failure was isolated to mixed dev/build cache state. Restarting `next dev`
restored the page. The browser then confirmed the metadata title, navigation,
heading and English introduction all use **AI Recommendation**.
