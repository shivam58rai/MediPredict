from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import pickle
import pandas as pd
import numpy as np
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.abspath(os.path.join(BASE_DIR, "../frontend"))

app = Flask(__name__)
CORS(app)

# ── Load model artifacts ───────────────────────────────────────────────────────
model   = pickle.load(open("model.pkl",   "rb"))
encoder = pickle.load(open("encoder.pkl", "rb"))

# Canonical feature list (order matters)
FEATURES = list(model.feature_names_in_)


# ── Health check ──────────────────────────────────────────────────────────────
@app.route("/", methods=["GET"])
def index():
    return send_from_directory(FRONTEND_DIR, "index.html")

@app.route("/<path:filename>", methods=["GET"])
def static_files(filename):
    return send_from_directory(FRONTEND_DIR, filename)


# ── Symptom list endpoint (used by frontend) ──────────────────────────────────
@app.route("/symptoms", methods=["GET"])
def symptoms():
    return jsonify({"symptoms": FEATURES})


# ── Prediction endpoint ────────────────────────────────────────────────────────
@app.route("/predict", methods=["POST"])
def predict():
    try:
        data = request.get_json(force=True)

        # Accept either a dict {symptom_name: 0/1} or a list of active symptom names
        if "symptoms" not in data:
            return jsonify({"error": "Missing 'symptoms' key"}), 400

        raw = data["symptoms"]

        # Build a zero-vector aligned with model features
        vector = [0] * len(FEATURES)

        if isinstance(raw, list):
            # raw = ["fever", "headache", ...]  OR  [0,1,0,...] (full binary array)
            if len(raw) == len(FEATURES):
                # Full binary array passed directly
                vector = [int(v) for v in raw]
            else:
                # List of active symptom names
                for sym in raw:
                    sym_clean = sym.strip().lower().replace(" ", "_")
                    if sym_clean in FEATURES:
                        vector[FEATURES.index(sym_clean)] = 1
        elif isinstance(raw, dict):
            # {symptom: 0/1} mapping
            for sym, val in raw.items():
                sym_clean = sym.strip().lower().replace(" ", "_")
                if sym_clean in FEATURES:
                    vector[FEATURES.index(sym_clean)] = int(val)
        else:
            return jsonify({"error": "Invalid format for 'symptoms'"}), 400

        if sum(vector) == 0:
            return jsonify({"error": "No valid symptoms detected"}), 400

        # Predict using named DataFrame to avoid sklearn feature-name warning
        df_input  = pd.DataFrame([vector], columns=FEATURES)
        pred_idx  = model.predict(df_input)[0]
        disease   = encoder.inverse_transform([pred_idx])[0]
        probas    = model.predict_proba(df_input)[0]
        confidence = float(np.max(probas))

        # Top-3 alternatives
        top3_idx  = np.argsort(probas)[::-1][:3]
        top3      = [
            {"disease": encoder.inverse_transform([i])[0], "confidence": round(float(probas[i]) * 100, 2)}
            for i in top3_idx
        ]

        return jsonify({
            "disease":    disease,
            "confidence": round(confidence * 100, 2),
            "top3":       top3
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    print(f"[START] Disease Prediction API running - {len(FEATURES)} symptoms loaded")
    app.run(debug=True, port=5000)