import os

# Load existing local files without downloading anything.
os.environ["HF_HUB_OFFLINE"] = "1"

from pathlib import Path
import numpy as np
from setfit import SetFitModel
from sklearn.metrics import accuracy_score, f1_score

from training_data import LABEL_NAMES, load_training_data
from check_dataset_split import check_split


def label_text(values):
    # Turn binary predictions into readable label names.
    return ", ".join(
        name for name, value in zip(LABEL_NAMES, values) if value == 1
    ) or "(none)"


def main():
    # Use the exact model saved by the English training run.
    # Evaluate the saved V2 model.
    model_dir = (
        Path(__file__).parent / "runs"
        / "demo-en-v2-20260904-232226" / "model"
    )
    assert model_dir.is_dir(), f"Model folder not found: {model_dir}"

    # Check V2 training data against the development set.
    train = load_training_data("preferences_en_v2_train.json")
    test = load_training_data("preferences_en_demo_dev.json")
    check_split(train, test)

    # Load our own saved model without training it again.
    model = SetFitModel.from_pretrained(
        str(model_dir),
        device="cpu",
        multi_target_strategy="multi-output",
        trust_remote_code=False,
        local_files_only=True,
    )
    assert model.labels == LABEL_NAMES, "The label order does not match."

    # Compare predictions with the expected labels.
    expected = np.array([row["label"] for row in test])
    predicted = model.predict(
        [row["text"] for row in test],
        as_numpy=True,
        use_labels=False,
    )

    assert predicted.shape == expected.shape
    assert np.isin(predicted, [0, 1]).all()
    print(f"[PASS] Evaluation output shape: {predicted.shape}")

    # Exact match requires every label in a sentence to be correct.
    matches = np.all(expected == predicted, axis=1)
    print(f"Exact matches: {int(matches.sum())}/{len(test)}")
    print(f"Exact-match accuracy: {accuracy_score(expected, predicted):.1%}")
    print(
        f"Micro F1: "
        f"{f1_score(expected, predicted, average='micro', zero_division=0):.3f}"
    )

    # Show mistakes without changing predictions or expected answers.
    for index, row in enumerate(test):
        if not matches[index]:
            print(f"\n[MISMATCH] {row['id']}: {row['text']}")
            print(f"Expected:  {label_text(expected[index])}")
            print(f"Predicted: {label_text(predicted[index])}")

    # These scores describe development performance only.
    print(
        "\nV2 development evaluation completed. "
        "Synthetic demo data only; no retraining."
    )

if __name__ == "__main__":
    main()