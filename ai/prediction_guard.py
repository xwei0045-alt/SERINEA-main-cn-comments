from training_data import CATEGORIES, LABEL_NAMES, encode_labels


def check_prediction(values):
    # Accept one binary prediction vector in the existing label order.
    if len(values) != len(LABEL_NAMES) or any(v not in (0, 1) for v in values):
        raise ValueError("Expected 20 binary values.")

    # Decode include and exclude predictions without changing the input.
    count = len(CATEGORIES)
    include = [c for i, c in enumerate(CATEGORIES) if values[i] == 1]
    exclude = [c for i, c in enumerate(CATEGORIES) if values[count + i] == 1]
    conflicts = [c for c in include if c in exclude]

    # Ask for clarification if predictions conflict or contain no preference.
    clarify = bool(conflicts) or not (include or exclude)

    # Non-conflicting suggestions still require user confirmation.
    return {
        "status": "needs_clarification" if clarify else "needs_confirmation",
        "include": [] if clarify else include,
        "exclude": [] if clarify else exclude,
        "conflicts": conflicts,
    }


if __name__ == "__main__":
    # Check ordinary suggestions and an exclude-only request.
    for include, exclude in [(["grocery", "school"], ["gym"]), ([], ["park"])]:
        result = check_prediction(encode_labels(include, exclude))
        assert result["status"] == "needs_confirmation"
        assert result["include"] == include and result["exclude"] == exclude
        assert result["conflicts"] == []
    print("[PASS] Non-conflicting suggestions require confirmation.")

    # Check contradictory predictions for every category.
    for category in CATEGORIES:
        raw = encode_labels([category], [])
        raw[LABEL_NAMES.index(f"exclude_{category}")] = 1
        original = raw.copy()
        result = check_prediction(raw)
        assert result["status"] == "needs_clarification"
        assert result["conflicts"] == [category]
        assert result["include"] == [] and result["exclude"] == []
        assert raw == original
    print("[PASS] All 10 category conflicts require clarification.")
    print("[PASS] Raw predictions remain unchanged.")

    # Do not interpret an empty prediction as a reliable recommendation.
    result = check_prediction(encode_labels([], []))
    assert result["status"] == "needs_clarification"
    assert result["include"] == [] and result["exclude"] == []
    print("[PASS] Empty predictions require clarification.")

    # Reject incorrect lengths and non-binary values.
    for invalid in ([0] * 19, [0] * 19 + [2]):
        try:
            check_prediction(invalid)
        except ValueError:
            pass
        else:
            raise AssertionError("Invalid output was accepted.")
    print("[PASS] Invalid prediction formats are rejected.")
    print("Guard checks passed. Model accuracy has not changed.")