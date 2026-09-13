import json
from pathlib import Path

# Keep this order fixed for training and prediction.
CATEGORIES = [
    "grocery", "school", "gp", "hospital", "pharmacy",
    "park", "gym", "library", "community", "transit",
]
ACTIONS = ("include", "exclude")

LABEL_NAMES = [
    f"{action}_{category}"
    for action in ACTIONS
    for category in CATEGORIES
]


def encode_labels(include, exclude):
    # Reject invalid categories and duplicate labels.
    for labels in (include, exclude):
        if not isinstance(labels, list):
            raise ValueError("include and exclude must be lists.")

        if any(
            not isinstance(label, str) or label not in CATEGORIES
            for label in labels
        ):
            raise ValueError(f"Unknown category in: {labels}")

        if len(labels) != len(set(labels)):
            raise ValueError(f"Duplicate category in: {labels}")

    # A category cannot be included and excluded at the same time.
    if set(include) & set(exclude):
        raise ValueError("A category appears in both include and exclude.")

    # First 10 values: include. Last 10 values: exclude.
    return [
        int(category in labels)
        for labels in (include, exclude)
        for category in CATEGORIES
    ]


def load_training_data(filename="preference_examples.json"):
    # Read the selected JSON file without changing it.
    path = Path(__file__).parent / "data" / filename
    samples = json.loads(path.read_text(encoding="utf-8"))

    if not isinstance(samples, list) or not samples:
        raise ValueError("The dataset must be a non-empty list.")

    rows = []
    seen_ids = set()

    for sample in samples:
        if not isinstance(sample, dict):
            raise ValueError("Each sample must be an object.")

        for field in ("id", "group_id", "text"):
            value = sample.get(field)
            if not isinstance(value, str) or not value.strip():
                raise ValueError(f"Missing or empty field: {field}")

        sample_id = sample["id"].strip()

        if sample_id in seen_ids:
            raise ValueError(f"Duplicate sample ID: {sample_id}")
        seen_ids.add(sample_id)

        rows.append({
            "id": sample_id,
            "group_id": sample["group_id"].strip(),
            "text": sample["text"].strip(),
            "label": encode_labels(
                sample.get("include"),
                sample.get("exclude"),
            ),
        })

    return rows


if __name__ == "__main__":
    # Check one valid example and two invalid examples.
    probe = encode_labels(["grocery"], ["park"])
    assert len(probe) == 20 and sum(probe) == 2
    assert probe[0] == 1 and probe[15] == 1

    for include, exclude in [
        (["unknown"], []),
        (["park"], ["park"]),
    ]:
        try:
            encode_labels(include, exclude)
        except ValueError:
            pass
        else:
            raise AssertionError("Invalid labels were accepted.")

    print("[PASS] Label encoding self-checks.")

    rows = load_training_data()

    print(f"[PASS] Loaded {len(rows)} valid samples.")
    print(f"Number of labels: {len(LABEL_NAMES)}")
    print(f"First sample labels: {rows[0]['label']}")

    # Report labels that have no positive examples yet.
    missing = [
        name for index, name in enumerate(LABEL_NAMES)
        if not any(row["label"][index] == 1 for row in rows)
    ]

    print(f"Labels without positive examples: {len(missing)}")
    print(", ".join(missing))
    print("Data preparation check passed. Training has not started.")