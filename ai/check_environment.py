import sys
from importlib.metadata import version

# Confirm that a virtual environment is active.
assert sys.prefix != sys.base_prefix, "Please activate .venv-ai first."
print("[PASS] Virtual environment is active.")

# Import the tools needed for training.
import torch
from datasets import Dataset
from setfit import SetFitModel, Trainer, TrainingArguments

print("[PASS] Training tools imported successfully.")

# Show installed versions for troubleshooting.
for package in ("setfit", "transformers", "sentence-transformers", "torch"):
    print(f"{package}: {version(package)}")

# Check that PyTorch can perform a basic CPU calculation.
numbers = torch.tensor([1.0, 2.0, 3.0], device="cpu")
assert numbers.sum().item() == 6.0, "PyTorch calculation failed."
print("[PASS] PyTorch CPU calculation works.")

# Check that a small dataset can be created.
dataset = Dataset.from_dict({
    "text": ["I need a supermarket nearby."],
    "label": [0],
})
assert len(dataset) == 1, "Dataset creation failed."
print("[PASS] Dataset creation works.")

print("Environment check passed.")