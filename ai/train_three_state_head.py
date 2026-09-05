import os

# Reuse local files without downloading another model.
os.environ["HF_HUB_OFFLINE"] = "1"

import json
from datetime import datetime
from pathlib import Path

import joblib
import numpy as np
from setfit import SetFitModel
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, f1_score
from sklearn.multioutput import MultiOutputClassifier

from check_dataset_split import check_split
from prediction_guard import check_prediction
from training_data import CATEGORIES, LABEL_NAMES, encode_labels, load_training_data

COUNT = len(CATEGORIES)


def to_states(binary):
    # Convert 20 binary labels to 10 mutually exclusive states.
    binary = np.asarray(binary)
    assert binary.ndim == 2 and binary.shape[1] == 2 * COUNT
    assert np.isin(binary, [0, 1]).all()
    include, exclude = binary[:, :COUNT], binary[:, COUNT:]
    assert not np.any((include == 1) & (exclude == 1))
    return include + 2 * exclude


def to_binary(states):
    # Keep the existing API format: include labels, then exclude labels.
    states = np.asarray(states)
    assert states.ndim == 2 and states.shape[1] == COUNT
    assert np.isin(states, [0, 1, 2]).all()
    return np.concatenate([states == 1, states == 2], axis=1).astype(int)


def show_metrics(name, expected, predicted):
    # Score all 20 original labels, including mistakes and empty outputs.
    conflicts = np.any(
        (predicted[:, :COUNT] == 1) & (predicted[:, COUNT:] == 1), axis=1
    )
    print(
        f"{name}: exact={accuracy_score(expected, predicted):.1%}, "
        f"micro_f1={f1_score(expected, predicted, average='micro', zero_division=0):.3f}, "
        f"conflicts={int(conflicts.sum())}/{len(predicted)}"
    )


def main():
    # Check the label conversion before fitting anything.
    probe = np.array([encode_labels(["grocery"], ["park"]), [0] * (2 * COUNT)])
    assert np.array_equal(to_binary(to_states(probe)), probe)
    print("[PASS] Label conversion round trip.")

    train = load_training_data("preferences_en_v2_train.json")
    dev = load_training_data("preferences_en_demo_dev.json")
    check_split(train, dev)
    y_train = np.array([row["label"] for row in train])
    y_dev = np.array([row["label"] for row in dev])
    states = to_states(y_train)
    assert all(set(states[:, i]) == {0, 1, 2} for i in range(COUNT))
    print(f"[PASS] Data: {len(train)} training / {len(dev)} development samples.")

    model_dir = Path(__file__).parent / "runs" / "demo-en-v2-20260904-232226" / "model"
    assert model_dir.is_dir(), f"Model folder not found: {model_dir}"
    model = SetFitModel.from_pretrained(
        str(model_dir), device="cpu", multi_target_strategy="multi-output",
        trust_remote_code=False, local_files_only=True,
    )
    assert model.labels == LABEL_NAMES

    # Freeze the experiment's encoder: encode only, with no encoder training.
    embeddings = model.model_body.encode(
        [row["text"] for row in train + dev],
        normalize_embeddings=model.normalize_embeddings,
        show_progress_bar=False,
    )
    assert np.isfinite(embeddings).all()
    x_train, x_dev = embeddings[:len(train)], embeddings[len(train):]

    # Train one three-class classifier per facility, using training data only.
    head = MultiOutputClassifier(
        LogisticRegression(class_weight="balanced", max_iter=1000, random_state=66)
    )
    head.fit(x_train, states)
    print("[PASS] Three-state head trained; encoder unchanged.")

    # Compare both heads on identical embeddings and the same 20-label scale.
    for name, x, expected in [("train", x_train, y_train), ("dev", x_dev, y_dev)]:
        show_metrics(f"V2 {name}", expected, model.model_head.predict(x))
        show_metrics(f"V3 {name}", expected, to_binary(head.predict(x)))

    # Save a separate candidate; never overwrite the V2 model.
    run_dir = Path(__file__).parent / "runs" / datetime.now().strftime("demo-en-v3-head-%Y%m%d-%H%M%S")
    run_dir.mkdir(parents=True, exist_ok=False)
    head_path = run_dir / "head.joblib"
    joblib.dump({
        "head": head,
        "encoder_dir": str(model_dir.resolve()),
        "categories": CATEGORIES,
        "label_names": LABEL_NAMES,
        "states": {0: "not_expressed", 1: "include", 2: "exclude"},
        "normalize_embeddings": model.normalize_embeddings,
    }, head_path)

    # Reload only the trusted file just created by this script.
    restored = joblib.load(head_path)
    assert restored["categories"] == CATEGORIES
    assert np.array_equal(restored["head"].predict(x_dev), head.predict(x_dev))
    print("[PASS] Saved head reloads with matching predictions.")
    print(f"Candidate saved to: {head_path}")

    # Inspect fixed regression examples; these are not a final test set.
    examples = [
        ("I need a school nearby.", ["school"], []),
        ("Schools should not affect my ranking.", [], ["school"]),
        ("I want a supermarket, but parks should not affect my ranking.", ["grocery"], ["park"]),
    ]
    sample_embeddings = model.model_body.encode(
        [text for text, _, _ in examples],
        normalize_embeddings=model.normalize_embeddings, show_progress_bar=False,
    )
    predictions = to_binary(restored["head"].predict(sample_embeddings))
    for (text, include, exclude), predicted in zip(examples, predictions):
        matches = np.array_equal(predicted, encode_labels(include, exclude))
        print(f"\n[{'MATCH' if matches else 'MISMATCH'}] {text}")
        print(f"Expected include={include}, exclude={exclude}")
        print(json.dumps(check_prediction(predicted.tolist()), indent=2))

    print("\nCandidate experiment only. Synthetic development data; no website changes.")


if __name__ == "__main__":
    main()
