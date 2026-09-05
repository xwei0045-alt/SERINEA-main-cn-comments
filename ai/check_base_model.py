import numpy as np
from sentence_transformers import SentenceTransformer

# Load the pretrained model on CPU.
# The first run downloads the model files.
MODEL_ID = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"

print("Loading the base model...")

model = SentenceTransformer(
    MODEL_ID,
    device="cpu",
    trust_remote_code=False,
    model_kwargs={"use_safetensors": True},
)

print("[PASS] Model loaded.")

# Compare an English sentence, its Chinese equivalent,
# and an unrelated sentence.
sentences = [
    "I need a supermarket nearby.",
    "我需要附近有一家超市。",
    "An astronaut is travelling to the moon.",
]

# Convert each sentence into a normalized numerical vector.
embeddings = model.encode(
    sentences,
    normalize_embeddings=True,
    convert_to_numpy=True,
)

# Check the output size and numerical validity.
assert embeddings.shape == (3, 384), "Unexpected embedding shape."
assert np.isfinite(embeddings).all(), "Embeddings contain invalid numbers."

print(f"[PASS] Embedding shape: {embeddings.shape}")
print("[PASS] All embedding values are finite.")

# Calculate cosine similarity using normalized vectors.
same_meaning = float(embeddings[0] @ embeddings[1])
different_meaning = float(embeddings[0] @ embeddings[2])

print(f"English / Chinese similarity: {same_meaning:.4f}")
print(f"English / unrelated similarity: {different_meaning:.4f}")

# The translated sentence should be more similar.
assert same_meaning > different_meaning, (
    "Model loaded, but the semantic comparison needs review."
)

print("[PASS] Cross-language example check.")
print("Base-model check passed.")