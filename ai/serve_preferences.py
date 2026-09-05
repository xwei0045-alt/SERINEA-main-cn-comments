import os

# This service is for local development, not public hosting.
os.environ["HF_HUB_OFFLINE"] = "1"

import json
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path

import joblib
import numpy as np
from setfit import SetFitModel

from prediction_guard import check_prediction
from training_data import CATEGORIES, LABEL_NAMES
from train_three_state_head import to_binary


def load_predictor():
    # Load only the V3 file produced by your own training script.
    head_path = Path(__file__).parent / "runs" / "demo-en-v3-head-20260904-235750" / "head.joblib"
    saved = joblib.load(head_path)
    assert saved["categories"] == CATEGORIES and saved["label_names"] == LABEL_NAMES
    model = SetFitModel.from_pretrained(
        saved["encoder_dir"], device="cpu", multi_target_strategy="multi-output",
        trust_remote_code=False, local_files_only=True,
    )
    assert model.labels == LABEL_NAMES
    assert model.normalize_embeddings == saved["normalize_embeddings"]

    def predict(message):
        # Reuse the loaded encoder and head; never train during a request.
        embedding = model.model_body.encode(
            [message], normalize_embeddings=model.normalize_embeddings,
            show_progress_bar=False,
        )
        assert np.isfinite(embedding).all()
        prediction = to_binary(saved["head"].predict(embedding))
        assert prediction.shape == (1, len(LABEL_NAMES))
        return check_prediction(prediction[0].tolist())

    return predict


def read_message(body):
    # Validate user input before passing it to the model.
    data = json.loads(body)
    if not isinstance(data, dict) or not isinstance(data.get("message"), str):
        raise ValueError("Expected a message string.")
    message = data["message"].strip()
    if not 1 <= len(message) <= 500:
        raise ValueError("Message must contain 1 to 500 characters.")
    return message


class Handler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        # Do not log user requests or message contents.
        pass

    def reply(self, status, data):
        body = json.dumps(data).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        try:
            self.wfile.write(body)
        except (BrokenPipeError, ConnectionResetError):
            pass  # The web request may have been cancelled.

    def allowed(self):
        # Accept server-to-server calls, not browser calls from other websites.
        return self.headers.get("Host") in {"127.0.0.1:8001", "localhost:8001"} \
            and not self.headers.get("Origin")

    def do_GET(self):
        if not self.allowed():
            self.reply(403, {"error": "Local server calls only."})
        elif self.path == "/health":
            self.reply(200, {"status": "ok", "model": "local-v3-head"})
        else:
            self.reply(404, {"error": "Not found."})

    def do_POST(self):
        if not self.allowed():
            return self.reply(403, {"error": "Local server calls only."})
        if self.path != "/predict":
            return self.reply(404, {"error": "Not found."})
        try:
            if self.headers.get_content_type() != "application/json":
                raise ValueError("Expected JSON.")
            length = int(self.headers.get("Content-Length", "0"))
            if not 1 <= length <= 4096:
                raise ValueError("Invalid body size.")
            self.connection.settimeout(5)
            message = read_message(self.rfile.read(length))
        except (ValueError, UnicodeError, TimeoutError):
            return self.reply(400, {"error": "Send a JSON message containing 1 to 500 characters."})
        try:
            result = self.server.predictor(message)
        except Exception:
            return self.reply(500, {"error": "Prediction failed. Keep using manual filters."})
        self.reply(200, result)


if __name__ == "__main__":
    # ponytail: one local user; use a production service before public deployment.
    predictor = load_predictor()
    with HTTPServer(("127.0.0.1", 8001), Handler) as server:
        server.predictor = predictor
        print("[READY] Local V3 assistant: http://127.0.0.1:8001", flush=True)
        print("Keep this terminal open. Press Control+C to stop.", flush=True)
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            print("\nLocal model service stopped.")
