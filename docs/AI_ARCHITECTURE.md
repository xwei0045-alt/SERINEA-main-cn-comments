# SERINEA AI Architecture and Prompt Boundary

## Design principle

SERINEA keeps catalogue extraction and ranking deterministic. The optional cloud Qwen review can identify a disagreement, but it never silently replaces the deterministic preference set or changes the ranking formula.

## Components

| Component | Role |
| --- | --- |
| `extractRecommendation` | Deterministically extracts supported catalogue preferences and unsupported requests from the user message. |
| `POST /api/ai/review` | Validates a review request, runs the deterministic extractor and invokes the optional reviewer. |
| `HuggingFaceAiReviewProvider` | Calls the configured Hugging Face provider using server-side credentials. |
| `AiReviewService` | Creates cache keys, compares reviewer output with deterministic output and reports `cache`, `inference` or `fallback`. |
| `PostgresAiReviewCacheRepository` | Stores successful, validated review results in RDS. |

The configured provider model is `Qwen/Qwen3-4B-Instruct-2507` through `HF_MODEL`. It requires `HF_TOKEN` and `DATABASE_URL`. If either configuration is absent, the provider times out, or its structured response is invalid, the endpoint returns `source: "fallback"` and keeps the deterministic result active.

## Review workflow

```mermaid
sequenceDiagram
  participant B as Browser
  participant D as Deterministic extractor
  participant A as /api/ai/review
  participant C as RDS cache
  participant Q as Hugging Face Qwen
  B->>A: Message (1-2000 characters)
  A->>D: Extract supported preferences
  A->>C: Look up SHA-256 cache key
  alt Cache hit
    C-->>A: Validated review result
    A-->>B: source = cache
  else Cache miss
    A->>Q: Structured review request
    Q-->>A: Candidate structured result
    A->>C: Save validated success
    A-->>B: source = inference
  else Provider unavailable or invalid
    A-->>B: source = fallback; deterministic result retained
  end
```

## Cache key and prompt boundary

The cache key is a SHA-256 hash of the normalized message, deterministic extraction, model version and policy version. Whitespace and Unicode are normalized before hashing. This prevents a response produced under one policy or model version from being reused under another.

The reviewer receives the user request together with the deterministic catalogue result. Its allowed task is to assess supported preference targets and importance. It must not invent facilities, financial eligibility, factual locality claims, or a new ranking. The server validates reviewer output with the shared AI-review schema before it can be cached.

The exact system prompt sent by `HuggingFaceAiReviewProvider` is:

> Understand the user's request and produce the best supported catalogue preferences. Return JSON only with preferences [{target, importance}] and unsupported [string]. Importance must be very_high, high, medium, low or very_low. Use only supported targets present in the catalogue; remove negated requirements and correct deterministic extraction when the user's meaning is clear.

The PostgreSQL cache is best-effort. A cache read or write failure no longer prevents a valid Hugging Face request; inference continues and returns `source: inference`, while provider/configuration/schema failures still return the deterministic fallback.

## Ranking boundary

AI does not own the score weights. `CompareService` applies the backend composite: user needs 75%, POI coverage 15%, and SAL/LGA profile evidence 10%. The profile component applies seven explicit dimensions: employment/industry 25%, income/economic 20%, demographic 15%, socioeconomic 15%, community/culture 10%, regional capacity 10%, and data quality 5%.
