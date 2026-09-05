import os
# Copy settings while changing selected options.
from dataclasses import replace
# Use CPU and reuse the model downloaded in the previous step.
os.environ["ACCELERATE_USE_CPU"] = "true"
os.environ["HF_HUB_OFFLINE"] = "1"

from datetime import datetime
from pathlib import Path

import numpy as np
from datasets import Dataset
from setfit import SetFitModel, Trainer, TrainingArguments

from training_data import LABEL_NAMES, load_training_data
from check_dataset_split import check_split


def main():
    # Use V2 training data; keep development data out of training.
    train_rows = load_training_data("preferences_en_v2_train.json")
    dev_rows = load_training_data("preferences_en_demo_dev.json")
    check_split(train_rows, dev_rows)

    train_dataset = Dataset.from_dict({
        "text": [row["text"] for row in train_rows],
        "label": [row["label"] for row in train_rows],
    })
    print(f"[PASS] Training data ready: {len(train_rows)} samples.")

    # Save V2 separately without overwriting the first model.
    run_name = datetime.now().strftime("demo-en-v2-%Y%m%d-%H%M%S")
    run_dir = Path(__file__).parent / "runs" / run_name
    run_dir.mkdir(parents=True, exist_ok=False)
    model_dir = run_dir / "model"

    # Add a binary classifier for each of the 20 labels.
    model = SetFitModel.from_pretrained(
        "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2",
        multi_target_strategy="multi-output",
        device="cpu",
        trust_remote_code=False,
        labels=LABEL_NAMES,
        head_params={
            "class_weight": "balanced",
            "max_iter": 1000,
            "random_state": 66,
        },
    )

    # Record one embedding to check whether the encoder changes.
    probe = [train_rows[0]["text"]]
    before = model.model_body.encode(probe, show_progress_bar=False)

    # Keep the first demonstration run short.
    args = TrainingArguments(
        output_dir=str(run_dir / "checkpoints"),
        batch_size=4,
        max_steps=20,
        body_learning_rate=1e-5,
        logging_steps=5,
        eval_strategy="no",
        save_strategy="no",
        report_to="none",
        seed=66,
    )
    trainer = Trainer(
        model=model,
        args=args,
        train_dataset=train_dataset,
    )

    # Force the internal trainer to use CPU.
    trainer.st_trainer.args = replace(
        trainer.st_trainer.args,
        use_cpu=True,
        dataloader_pin_memory=False,
    )

    # Rebuild the accelerator after changing device settings.
    trainer.st_trainer.create_accelerator_and_postprocess()

    # Keep model weights on the same device as the training data.
    model.model_body.to("cpu")

    # Check device consistency before training.
    assert trainer.st_trainer.args.device.type == "cpu"
    assert trainer.st_trainer.accelerator.device.type == "cpu"
    assert model.model_body.device.type == "cpu"

    print("[PASS] Model, trainer and accelerator all use CPU.")
    print("Starting encoder fine-tuning and classifier training...")
    trainer.train()

    # Verify that fine-tuning changed the encoder output.
    after = model.model_body.encode(probe, show_progress_bar=False)
    assert not np.allclose(before, after), "The encoder output did not change."
    print("[PASS] Encoder output changed after fine-tuning.")

    # Check the output format, not prediction quality.
    predictions = model.predict(probe, as_numpy=True, use_labels=False)
    assert predictions.shape == (1, len(LABEL_NAMES))
    assert np.isin(predictions, [0, 1]).all()
    print("[PASS] Prediction shape: (1, 20).")

    # Save the trained model and training settings locally.
    model.save_pretrained(str(model_dir))
    (run_dir / "training_args.json").write_text(
        args.to_json_string(), encoding="utf-8"
    )

    # Reload only the model we just saved ourselves.
    reloaded = SetFitModel.from_pretrained(
        str(model_dir),
        device="cpu",
        multi_target_strategy="multi-output",
    )
    restored = reloaded.predict(probe, as_numpy=True, use_labels=False)

    assert reloaded.labels == LABEL_NAMES, "Saved label order changed."
    assert np.array_equal(predictions, restored), "Reloaded predictions changed."
    print("[PASS] Saved model reloads with matching predictions.")

    print(f"Model saved to: {model_dir}")
     # Training success does not mean prediction quality is verified.
    print("V2 training passed. Development performance has not been evaluated.")

if __name__ == "__main__":
    main()