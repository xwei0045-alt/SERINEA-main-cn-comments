# SERINEA AI Model Training Summary

## 1. Purpose and Scope

This document describes the SERINEA language-understanding model trained by Xiaotang Ni for Iteration 2.

The model reads an English user message and returns a structured JSON interpretation. It identifies:

- the user's main intent;
- relocation stage;
- profile facts, such as occupation or income;
- supported lifestyle preferences;
- preference importance;
- incentive-policy question mode; and
- information that may need a follow-up question.

The model is not responsible for final town ranking, policy eligibility decisions, or government-program facts. These decisions remain with the SERINEA backend, structured policy data, and deterministic ranking rules.

## 2. Model and Fine-Tuning Method

| Item | Value |
| --- | --- |
| Base model | `Qwen3-0.6B` |
| Fine-tuning method | LoRA (Low-Rank Adaptation) |
| Final checkpoint | G2 |
| Training language | English |
| Main output | Structured JSON |
| Prepared delivery format | Transformers.js `q4f16` package |

`Qwen3-0.6B` was selected because it is much smaller than a 4B model and was practical for a lightweight prototype, browser-oriented packaging, and low-cost experimentation.

LoRA was used so that training updated small adapter weights instead of retraining every base-model parameter.

The final G2 adapter was merged with the base model and prepared as a Transformers.js `q4f16` package. The package was approximately 525 MB. This size is relevant to browser download time and device compatibility; it does not prove that the currently deployed website is using this package.

## 3. Training Data

The training set combined approximately six project CSV sources with purpose-built structured examples.

The examples covered:

- relocation and town-recommendation requests;
- lifestyle preferences, such as schools, hospitals, parks, public transport, and pharmacies;
- preference importance levels;
- user profile facts, including occupation, age, income, children, and relocation stage;
- incentive and policy questions;
- personal eligibility questions;
- missing-information and follow-up cases;
- preference removal and priority-change messages;
- unsupported needs, such as housing affordability; and
- contrastive examples, including negation and similar wording.

The final documented dataset split was:

| Split | Records | Purpose |
| --- | ---: | --- |
| Training | 943 | Learn the LoRA adapter weights |
| Validation | 77 | Compare training rounds and select the checkpoint |
| Independent test | 77 | Final evaluation after model selection |

The dataset was split using a stable SHA-256 fingerprint. This means the same input records will produce the same training, validation, and test partitions.

## 4. Output Contract

The model was trained to return JSON in the following structure:

```json
{
  "intent": "relocation_recommendation",
  "relocation_stage": "unknown",
  "profile": {
    "age": null,
    "income": null,
    "income_scope": "unknown",
    "income_period": "unknown",
    "income_basis": "unknown",
    "occupation": "registered nurse",
    "has_child": null,
    "child_ages": [],
    "locality": null,
    "lga_name": null,
    "move_distance_km": null,
    "days_since_move": null,
    "new_resident": null
  },
  "preferences": [
    {
      "target": "hospital",
      "importance": "high",
      "evidence": "I need a hospital nearby."
    }
  ],
  "removed_targets": [],
  "unsupported": [],
  "needs_incentive_guidance": false,
  "policy_query_mode": "none"
}
```

| Field | Meaning |
| --- | --- |
| `intent` | Main user goal: `relocation_recommendation`, `incentive_query`, or `other` |
| `relocation_stage` | `planning_to_move`, `already_moved`, or `unknown` |
| `profile` | User facts explicitly stated in the message |
| `preferences` | Supported lifestyle needs extracted from the message |
| `target` | A supported SERINEA catalogue category |
| `importance` | `very_high`, `high`, `medium`, `low`, or `very_low` |
| `evidence` | The wording from the user message that supports the preference |
| `removed_targets` | Preferences the user explicitly asked to remove |
| `unsupported` | Needs that cannot be mapped safely to the supported catalogue |
| `needs_incentive_guidance` | Whether the separate incentive flow is needed |
| `policy_query_mode` | `none`, `general_information`, or `eligibility_check` |

The backend must validate the JSON before using it. The model must not invent facilities, policy facts, eligibility decisions, or town scores.

## 5. Exact System Prompt Used for Fine-Tuning

The model receives two inputs:

- `CURRENT_MEMORY`: structured context from previous messages.
- `LATEST_MESSAGE`: the newest English message from the user.

The model should extract only new information from `LATEST_MESSAGE`. `CURRENT_MEMORY` provides context, but it is not new evidence.

The following system prompt was used in `serinea_tiny_training.py`:

```text
You are the SERINEA understanding model. Read CURRENT_MEMORY and LATEST_MESSAGE.
Return exactly one JSON object, with no prose and no markdown.
Extract only changes explicitly stated in LATEST_MESSAGE. CURRENT_MEMORY is context, not new evidence.
Allowed intent: relocation_recommendation, incentive_query, other.
Allowed relocation_stage: planning_to_move, already_moved, unknown.
Allowed importance: very_high, high, medium, low, very_low.
Allowed policy_query_mode: none, general_information, eligibility_check.
For a general policy question, use general_information and do not request personal details.
For a personal eligibility question, use eligibility_check.
Use catalogue IDs, not surface synonyms: dental clinic means dentist, chemist means pharmacy, and parks means park.
"Relocated", "moved", and "finished moving" mean already_moved. A profile fact alone has intent other.
For income, personal means individual, yearly means annual, before tax means gross, and after tax means net.
Output income_scope only as unknown, individual, or household; income_period only as unknown, weekly, or annual; income_basis only as unknown, gross, or net.
Copy an explicitly stated occupation into profile.occupation as concise lower-case text. Never infer an occupation from a policy name.
Housing or rent affordability is unsupported even when the same message contains a supported preference.
"Would be useful" means low importance unless stronger words are present. A question about website features alone has intent other.
Never drop a supported catalogue preference when the same message also contains an unsupported need.
Never infer a school from a child's age. Never rank towns or decide incentive eligibility.
Use removed_targets for explicitly removed preferences and unsupported for requests outside the catalogue.
/no_think
```

## 6. Training Input Format

Each training example used this format:

```text
CURRENT_MEMORY:
{"intent":"other","relocation_stage":"unknown","profile":{"age":null,"income":null,"income_scope":"unknown","income_period":"unknown","income_basis":"unknown","occupation":null,"has_child":null,"child_ages":[],"locality":null,"lga_name":null,"move_distance_km":null,"days_since_move":null,"new_resident":null},"preferences":[],"removed_targets":[],"unsupported":[],"needs_incentive_guidance":false,"policy_query_mode":"none"}

LATEST_MESSAGE:
I am a registered nurse and I need a hospital nearby.
```

Expected JSON output:

```json
{
  "intent": "relocation_recommendation",
  "relocation_stage": "unknown",
  "profile": {
    "occupation": "registered nurse"
  },
  "preferences": [
    {
      "target": "hospital",
      "importance": "high",
      "evidence": "I need a hospital nearby."
    }
  ],
  "removed_targets": [],
  "unsupported": [],
  "needs_incentive_guidance": false,
  "policy_query_mode": "none"
}
```

## 7. Training Rounds and Adjustments

The final training process used controlled comparison rather than selecting the first trained model.

| Round | Main setting | Observation | Decision |
| --- | --- | --- | --- |
| G1 | 1 epoch, learning rate `1e-4` | Basic intent recognition and JSON structure were learned, but minority intent classes had weaker macro F1 | Continue training and add difficult examples |
| G2 | 2 epochs, learning rate `1e-4` | Validation performance improved and passed the model-selection gate | Select G2 as the final checkpoint |

The LoRA rank and target-module shape remained stable during this comparison.

The main adjustments were:

- use another epoch to address under-learning;
- add hard examples for similar language, such as `chemist` and `pharmacy`;
- add contrastive examples for unsupported needs and mixed requests;
- keep supported preferences even when the same message includes an unsupported need; and
- use a lower learning rate for any future continuation training to reduce the risk of overwriting useful behaviour.

## 8. Final Independent-Test Results

The following results were measured on the independent 77-record test split after G2 was selected:

| Metric | Result | Interpretation |
| --- | ---: | --- |
| Valid JSON | 100.0% | Every evaluated response could be parsed as JSON |
| Intent accuracy | 98.7% | The main intent was correct for almost all test messages |
| Intent macro F1 | 95.0% | Intent performance remained strong across both common and less common classes |
| Core exact match | 93.5% | The complete core JSON interpretation exactly matched the expected result in most cases |
| Slot micro F1 | 99.8% | Extracted details, such as preferences and profile fields, were highly accurate overall |
| Occupation accuracy | 100.0% | Occupation extraction was correct in the evaluation cases |
| Policy-mode accuracy | 100.0% | Policy-question mode was correctly identified |
| Follow-up decision accuracy | 100.0% | The documented follow-up cases were correctly identified |

Accuracy means the proportion of correct predictions.

Macro F1 is especially useful for intent recognition because it gives every intent class equal importance. It helps identify whether a model performs well only for common examples while failing less common but important intents.

## 9. Evaluation Coverage

Testing included:

- valid JSON parsing;
- main intent classification;
- policy-query mode classification;
- occupation extraction;
- relocation-stage extraction;
- preference extraction;
- preference importance;
- negation and preference removal;
- unsupported needs;
- missing-information and follow-up decisions; and
- separation of lifestyle preferences from incentive-policy guidance.

Example:

> User message: “I am a registered nurse and I need a hospital nearby.”

Expected interpretation:

- occupation: `registered nurse`;
- supported preference: `hospital`;
- importance: `high`;
- final ranking: decided later by deterministic backend rules;
- incentive eligibility: decided later using structured policy data.

## 10. Why the Prompt Is Designed This Way

The prompt design makes the AI behaviour more predictable and safer.

- It restricts output to one JSON object.
- It restricts output values to defined categories.
- It maps common wording to SERINEA catalogue IDs.
- It preserves evidence from the user's message.
- It separates supported preferences from unsupported needs.
- It prevents invented town rankings.
- It prevents invented eligibility decisions.
- It prevents unsupported inference, for example inferring a school need only from a child's age.
- It uses memory as context without treating old information as newly provided information.

## 11. RAG and Data Authority

This model is not a Retrieval-Augmented Generation (RAG) system.

It does not retrieve live policy articles, browse external websites, or act as a complete policy knowledge base.

The AI model performs language understanding. Structured SERINEA records and deterministic backend logic remain the source of truth for:

- town ranking;
- facility availability;
- policy data;
- eligibility checks; and
- user-facing recommendations.

## 12. Integration Boundary

The trained `Qwen3-0.6B` G2 model is an AI-understanding component.

A correct integration flow is:

1. The user submits an English message.
2. The model returns structured JSON.
3. The backend validates the JSON.
4. Supported lifestyle preferences are sent to the deterministic Compare/ranking service.
5. Incentive-related requests are sent to the separate policy-screening flow.
6. The website presents recommendations based on validated SERINEA data.

The model must not override deterministic ranking, create policy facts, or make an eligibility decision.

## 13. Important Model-Version Note

This document describes Xiaotang's trained `Qwen3-0.6B` LoRA/G2 model artifact.

If the production backend is configured to call a separate cloud model through `HF_MODEL`, that cloud model must be documented separately.

The project should not claim that the deployed website uses the G2 `Qwen3-0.6B` package until the deployed backend or browser configuration has been verified.

## 14. Supporting Artefacts

- `SERINEA_Qwen3_0_6B_G2_training_colab.ipynb`: documented training notebook.
- `AI_training_record.md`: detailed training rounds, dataset splits, parameter changes, and evaluation record.
- `AI_model_test_results.md`: detailed test evidence.
- `SERINEA_Qwen3_0_6B_G2_q4f16.zip`: packaged browser-oriented model artifact.
- `serinea_tiny_training.py`: training-data preparation, prompt definition, training, evaluation, and model-merge code.

The detailed artefacts can be submitted through the project evidence repository or PGP. This file is a concise technical summary for the code documentation folder.
