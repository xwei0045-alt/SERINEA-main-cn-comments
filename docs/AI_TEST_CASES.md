# SERINEA AI and Recommendation Test Cases

## Automated checks

Run the following from the repository root:

```powershell
npm test
npx tsc --noEmit
npm run build
```

## Test cases

| ID | Scenario | Expected outcome | Evidence |
| --- | --- | --- | --- |
| AI-01 | A user selects supported lifestyle preferences. | Deterministic extraction returns only catalogue-supported targets and their importance. | `lib/recommendationAssistant` tests and comparison tests. |
| AI-02 | A user supplies ordered preferences. | `CompareService` applies the supplied preference weights inside the 75% user-needs component. | `backend/services/CompareService.test.ts`. |
| AI-03 | The user corrects or removes an earlier request. | The browser submits the current confirmed preferences; ranking is recalculated from those current values. | `app/ai-assistant/AssistantClient.tsx` flow and UI testing. |
| AI-04 | A repeat message is reviewed by Qwen. | A successful validated result is reused with `source: cache`; the provider is not called again. | `backend/services/AiReviewService.test.ts`. |
| AI-05 | Qwen is unavailable, unconfigured or returns an invalid response. | The API returns `source: fallback`; deterministic extraction stays active. | `app/api/ai/review/route.ts` fallback path. |
| AI-06 | Profile data is available for otherwise eligible localities. | All candidates are scored before ordering; profile evidence contributes 10% and can change the shortlist. | `backend/services/CompareService.test.ts`. |
| AI-07 | An incentive record contains a real occupation rule. | A matching occupation is reported in `matched`; a non-matching occupation excludes the record. | `backend/services/IncentiveService.test.ts`. |
| AI-08 | An incentive record has `occupation_restriction = none`. | Occupation screening is neutral, matching the current synthetic RDS catalogue. | `backend/services/IncentiveService.ts` and RDS catalogue check. |
| AI-09 | Basic-auth credentials are missing, wrong or valid. | Missing/wrong requests are rejected; valid configured credentials continue to the API route; unconfigured middleware returns 503. | `backend/MiddlewareSecurity.test.ts`. |
| AI-10 | The PostgreSQL review cache is temporarily unavailable. | The provider is still called, a validated result returns with `source: inference`, and the failed cache write does not discard it. | `backend/services/AiReviewService.test.ts`. |
| AI-11 | The user says `My occupation is registered nurse. What incentives are available?` | The dedicated occupation extractor returns `registered nurse`; the AI Assistant forwards it through the shared incentive contract without changing the frozen recommendation shape. | `lib/recommendationAssistant.test.ts` and `app/ai-assistant/AssistantClient.tsx`. |
| AI-12 | The user says `I hate noisy places. I need nature.` | The supported part is extracted as `nature_reserve` with `high` importance. The unsupported sentiment does not create an invented facility category. | `lib/recommendationAssistant.test.ts`. |

### AI-12 expected deterministic result

```json
{
  "preferences": [
    { "target": "nature_reserve", "importance": "high" }
  ],
  "unsupported": []
}
```

## Manual end-to-end regression

1. Open `/ai-assistant`, enter a supported lifestyle request and confirm the preferences.
2. Verify that ranked towns show `userNeeds`, `poiCoverage` and `areaProfile` score components.
3. Use the separate incentive path with a town and eligibility facts. Verify the lifestyle order does not change.
4. Enter an occupation. With current RDS synthetic data (`none` rules), the result must remain neutral. Repeat with the unit-test fixture to verify a real occupational restriction is enforced.
5. Enable optional cloud review only when valid server-side Hugging Face credentials are configured. Confirm that a failure reports fallback rather than changing the deterministic extraction.
