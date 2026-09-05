import os

# Use local model files only; do not download anything.
os.environ["HF_HUB_OFFLINE"] = "1"

import json
from pathlib import Path
from setfit import SetFitModel

from training_data import LABEL_NAMES
from prediction_guard import check_prediction


def main():
    # Accept one English request, using the same length limit as the API.
    message = input("Describe your preferences in English: ").strip()
    if not 1 <= len(message) <= 500:
        print("Please enter between 1 and 500 characters.")
        return

    # Load the exact V2 model without training it again.
    model_dir = (
        Path(__file__).parent / "runs"
        / "demo-en-v2-20260904-232226" / "model"
    )
    assert model_dir.is_dir(), f"Model folder not found: {model_dir}"
    print("Loading the saved V2 model...")
    model = SetFitModel.from_pretrained(
        str(model_dir),
        device="cpu",
        multi_target_strategy="multi-output",
        trust_remote_code=False,
        local_files_only=True,
    )
    assert model.labels == LABEL_NAMES, "The label order does not match."

    # Predict one sentence and extract its 20 binary values.
    predictions = model.predict([message], as_numpy=True, use_labels=False)
    assert predictions.shape == (1, len(LABEL_NAMES))
    raw = predictions[0].tolist()
    original = raw.copy()

    # Check the prediction without changing the model's original output.
    result = check_prediction(raw)
    assert raw == original, "The original prediction was changed."
    print("[PASS] Model output format and guard integration.")

    # Show raw labels separately from the guarded result.
    labels = [name for name, value in zip(LABEL_NAMES, raw) if value == 1]
    print("\nRaw model labels:")
    print(", ".join(labels) or "(none)")
    print("\nChecked result:")
    print(json.dumps(result, indent=2))
    print("\nNo retraining. No website filters were changed.")


if __name__ == "__main__":
    main()