from training_data import LABEL_NAMES, load_training_data


def check_split(train, test):
    # Prevent the same record or source group from crossing the split.
    for field in ("id", "group_id"):
        overlap = {row[field] for row in train} & {
            row[field] for row in test
        }

        if overlap:
            raise ValueError(
                f"Data leakage: shared {field}: {sorted(overlap)}"
            )

    # Catch identical text even when IDs are different.
    train_texts = {
        " ".join(row["text"].casefold().split())
        for row in train
    }
    test_texts = {
        " ".join(row["text"].casefold().split())
        for row in test
    }

    if train_texts & test_texts:
        raise ValueError("Data leakage: repeated text across the split.")

    # Each label needs positive and negative examples.
    for name, rows in (("train", train), ("test", test)):
        for index, label in enumerate(LABEL_NAMES):
            values = {row["label"][index] for row in rows}

            if values != {0, 1}:
                raise ValueError(
                    f"{name}: {label} needs both 0 and 1 examples."
                )


if __name__ == "__main__":
    # Load the expanded training set and development set.
    train = load_training_data("preferences_en_v2_train.json")
    dev = load_training_data("preferences_en_demo_dev.json")

    # Reuse the existing label and split checks.
    check_split(train, dev)

    print(f"[PASS] Training samples: {len(train)}")
    print(f"[PASS] Development samples: {len(dev)}")
    print("[PASS] No shared IDs, groups or identical text.")
    print("[PASS] Every label has positive and negative examples.")

    # Check that a deliberately leaked group is rejected.
    leaked_dev = [
        {**dev[0], "group_id": train[0]["group_id"]},
        *dev[1:],
    ]

    try:
        check_split(train, leaked_dev)
    except ValueError:
        print("[PASS] Deliberate group leakage was rejected.")
    else:
        raise AssertionError("The leakage check failed.")

    print("V2 dataset check passed. Training has not started.")