# feature/ai-assistant

## Server-side Qwen review boundary

`POST /api/ai/review` accepts only `{ "message": "..." }`. The route repeats
the deterministic catalogue extraction on the server, then asks the private
Hugging Face Endpoint `serinea-qwen3-06b` to review it. The endpoint serves
SERINEA Qwen3-0.6B G2 q4f16 through its custom ONNX Runtime handler. A valid
review may refine the displayed preference set; the user can confirm or edit
those preferences before the deterministic ranking request is made. The model
never owns the ranking formula or incentive eligibility.

Successful reviews are stored in PostgreSQL `ai_review_cache`. The SHA-256 key
contains the whitespace-normalised message, deterministic extraction, model
version and policy version. Changing either version invalidates old entries.
Provider failures and invalid model output are not cached; the API returns
`source: "fallback"` and keeps the deterministic result active. When a
scaled-to-zero Endpoint is starting, the provider retries HTTP 502, 503 and
504 responses for up to three minutes before falling back.

The server sends `message` and the deterministic extraction to the Hugging Face
Endpoint. Keep `HF_ENDPOINT_TOKEN` (or the backwards-compatible `HF_TOKEN`)
server-side and never expose it to the browser. `HF_ENDPOINT_URL` must point to
the deployed Endpoint, not the Hub repository URL. The model must return:

```json
{
  "preferences": [{ "target": "library", "importance": "high" }],
  "unsupported": []
}
```

The private Endpoint loads Qwen once per running replica and reuses it for each
request. Its automatic scale-to-zero delay is configured in Hugging Face; it is
currently two hours after the last request.

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
