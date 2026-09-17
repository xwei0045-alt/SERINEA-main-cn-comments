# SERINEA AI Architecture and Prompt Boundary

## Design principle

SERINEA keeps catalogue extraction and ranking deterministic. The optional cloud Qwen review can refine a supported preference target or importance level. When it differs, the UI displays the validated Qwen result for user confirmation before ranking; Qwen never changes the ranking formula, source data or incentive eligibility.

## Components

| Component | Role |
| --- | --- |
| `extractRecommendation` | Deterministically extracts supported catalogue preferences and unsupported requests from the user message. |
| `POST /api/ai/review` | Validates a review request, runs the deterministic extractor and invokes the optional reviewer. |
| `HuggingFaceEndpointAiReviewProvider` | Calls a private Hugging Face Endpoint from the server and keeps its token out of browser code. |
| `AiReviewService` | Creates cache keys, compares reviewer output with deterministic output and reports `cache`, `inference` or `fallback`. |
| `PostgresAiReviewCacheRepository` | Stores successful, validated review results in RDS. |

The configured review model is SERINEA Qwen3-0.6B G2 q4f16 (`qwen3-0.6b-g2-q4f16-hf-endpoint-v1`), served by the private Hugging Face Endpoint `serinea-qwen3-06b`. The Hub repository URL is not itself an inference API: the endpoint uses the repository's custom `handler.py`, which runs the ONNX model through ONNX Runtime. The application requires `HF_ENDPOINT_URL`, a server-only endpoint token, and `DATABASE_URL`. During a scale-to-zero startup, HTTP 502/503/504 responses are retried for up to three minutes. If configuration is absent, that wait expires, or the structured response is invalid, the route returns `source: "fallback"` and keeps the deterministic result active. See [AI Model Training and Runtime Summary](AI_MODEL_TRAINING_SUMMARY.md).

## Review workflow

```mermaid
sequenceDiagram
  participant B as Browser
  participant D as Deterministic extractor
  participant A as /api/ai/review
  participant C as RDS cache
  participant Q as Hugging Face Endpoint
  B->>A: Message (1-2000 characters)
  A->>D: Extract supported preferences
  A->>C: Look up SHA-256 cache key
  alt Cache hit
    C-->>A: Validated review result
    A-->>B: source = cache; validated preferences
  else Cache miss
    A->>Q: Authenticated custom-handler request
    Q-->>A: Candidate structured result
    A->>C: Save validated success
    A-->>B: source = inference; validated preferences
  else Provider unavailable or invalid
    A-->>B: source = fallback; deterministic result retained
  end
```

## Cache key and prompt boundary

The cache key is a SHA-256 hash of the normalized message, deterministic extraction, model version and policy version. Whitespace and Unicode are normalized before hashing. This prevents a response produced under one policy or model version from being reused under another.

The reviewer receives the user request together with the deterministic catalogue result. Its allowed task is to assess supported preference targets and importance. It must not invent facilities, financial eligibility, factual locality claims, or a new ranking. The server validates reviewer output with the shared AI-review schema before it can be cached or shown for user confirmation.

After deployment, the backend sends the user message, deterministic extraction and policy version to the endpoint's custom handler. The endpoint owns the model prompt and canonicalisation. The required API response is validated against the shared `preferences` and `unsupported` schema before it can be cached.

The PostgreSQL cache is best-effort. A cache read or write failure no longer prevents a valid Qwen API request; inference continues and returns `source: inference`, while provider/configuration/schema failures still return the deterministic fallback.

## Ranking boundary

AI does not own the score weights. `CompareService` applies the backend composite: user needs 75%, POI coverage 15%, and SAL/LGA profile evidence 10%. The profile component applies seven explicit dimensions: employment/industry 25%, income/economic 20%, demographic 15%, socioeconomic 15%, community/culture 10%, regional capacity 10%, and data quality 5%.
