# feature/ai-assistant

## Server-side Qwen review boundary

`POST /api/ai/review` accepts only `{ "message": "..." }`. The route repeats
the deterministic catalogue extraction on the server, then asks the private
Hugging Face Inference Providers to review it. The review can report
agreement, but it cannot replace deterministic preferences or town ranking.

Successful reviews are stored in PostgreSQL `ai_review_cache`. The SHA-256 key
contains the whitespace-normalised message, deterministic extraction, model
version and policy version. Changing either version invalidates old entries.
Provider failures and invalid model output are not cached; the API returns
`source: "fallback"` and keeps the deterministic result active.

The server sends `message` and the deterministic extraction to the Hugging Face
Router. Keep `HF_TOKEN` server-side and never expose it to the browser. The
model must return:

```json
{
  "preferences": [{ "target": "library", "importance": "high" }],
  "unsupported": []
}
```

It should bind to localhost, load Qwen once before reporting ready, and reuse
that loaded model for every request. Before enabling it on EC2, record cold
start time, steady-state RSS, p50/p95 latency and timeout rate on the actual
instance. Run `npm run db:migrate` before enabling the endpoint.

**Branch:** `feature/ai-assistant`

## Owns

| Path | Role |
| --- | --- |
| `app/compare/FloatingAssistant.tsx` | Chat launcher / drawer |
| `app/compare/ChatPanel.tsx` | Server-backed chat transcript / send |
| `app/compare/*Assistant*.module.css` | Assistant styles |
| `app/api/chat/**` | Groq chat API |
| `backend/services/ChatRecommendationService.ts` | Intent → real dataset shortlist |
| `lib/chatRecommendations.ts` | Chat contracts / prompts helpers |
| `ai/**` | Offline / training experiments (not required for demo API) |

## Out of scope

Map pin/reach logic, preference drag-and-drop editor (filters), dataset CSV edits.
