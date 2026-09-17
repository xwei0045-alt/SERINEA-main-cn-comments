# SERINEA AI Model Training and Runtime Summary

## Purpose

This document separates the delivered/trained browser model from the model currently configured for the backend AI-review endpoint. They have different model sizes, runtimes and responsibilities. They must not be described as one model or as interchangeable weights.

## Model inventory

| Item | Delivered or runtime model | Where it runs | Purpose | Training relationship |
| --- | --- | --- | --- | --- |
| Delivered browser model | SERINEA Qwen3-0.6B G2 q4f16 | Chrome WebGPU (verified by the delivery record) | Optional review of deterministic preference extraction. It cannot rank towns or apply incentive eligibility rules. | This is the trained/delivered model described by the AI developer. |
| Server reviewer | SERINEA Qwen3-0.6B G2 q4f16 | Private Hugging Face Endpoint `serinea-qwen3-06b` on AWS CPU | Same optional review contract, exposed to the backend through a private endpoint. | The endpoint custom handler runs the delivered ONNX export through ONNX Runtime. |
| Production ranking engine | No generative model | Backend `CompareService` | Calculates town scores from explicit user needs, POI coverage and profile evidence. | Deterministic code, not a trained AI model. |

## Current backend configuration

The backend uses the deployed 0.6B endpoint:

```env
HF_ENDPOINT_URL=https://YOUR_ENDPOINT.endpoints.huggingface.cloud
HF_ENDPOINT_TOKEN=hf_your_server_only_endpoint_token
AI_REVIEW_MODEL_VERSION=qwen3-0.6b-g2-q4f16-v1
```

There is no separate Qwen3-4B runtime model in this delivery. The private Hub repository contains `onnx/model_q4f16.onnx` plus the deployed custom `handler.py` and `requirements.txt`. The repository page may still report that no general Inference Provider serves the model; this is distinct from the dedicated private Endpoint. `HF_ENDPOINT_URL` must identify that endpoint, never the model repository URL.

## Safety boundary

Both reviewers are optional. The deterministic extractor remains the product source of truth. If a reviewer is disabled, unavailable, disagrees, returns invalid JSON or times out, SERINEA keeps the deterministic result. Neither reviewer can silently change the scoring formula, town order, database records or incentive eligibility decision.

## Change control

Any model replacement requires an explicit deployment decision. Update `HF_ENDPOINT_URL`, `AI_REVIEW_MODEL_VERSION`, the provider contract and the tests together; do not rename one model to look like another.
