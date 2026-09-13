# SERINEA AI Recommendation

## Owns

| Path | Role |
| --- | --- |
| `app/ai-assistant/**` | Assistant UI and optional browser-side Qwen review |
| `lib/recommendationAssistant.ts` | Deterministic extraction, corrections and five importance levels |
| `backend/services/CompareService.ts` | Authoritative POI ranking and documented name proxies |
| `backend/services/IncentiveService.ts` | Deterministic mock-policy retrieval and condition screening |

The assistant parses supported English facility requests locally, lets the user
confirm or correct them, and calls the same `/api/compare` ranking used by the
Compare page. Qwen3-0.6B is an optional WebGPU review and cannot alter ranking.

Production ranking reads the existing PostgreSQL/RDS source through
`CompareService.rank()`. The model runs in the browser and needs no LLM API key.

Production incentive screening reads the 450 synthetic records from
`public.subsidies` in PostgreSQL. The CSV adapter is retained only for isolated
dataset validation and unit tests. The service can answer a named-town policy
query or attach mock policy screening to the five lifestyle-ranked towns.
Incentives remain a separate signal and never alter the town order.

This website path does not use embedding RAG. Exact locality/category retrieval
and deterministic rules are safer for the structured 450-row dataset. The
earlier Colab embedding experiment remains documented evidence; a future RAG
layer may retrieve real policy text for explanation, but may not decide ranking
or eligibility.

## Out of scope

Map pin/reach logic, preference drag-and-drop editor (filters), real government
policy ingestion and official eligibility decisions.
