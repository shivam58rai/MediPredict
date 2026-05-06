import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import accuracy_score
import pickle
import os

# ── Load dataset ──────────────────────────────────────────────────────────────
df = pd.read_csv("dataset.csv")

# Drop any unnamed/empty trailing columns
df = df.loc[:, ~df.columns.str.startswith("Unnamed")]

# ── Features & target ─────────────────────────────────────────────────────────
X = df.drop("prognosis", axis=1)
y = df["prognosis"]

# ── Encode disease labels ──────────────────────────────────────────────────────
le = LabelEncoder()
y_encoded = le.fit_transform(y)

# ── Train / test split ────────────────────────────────────────────────────────
X_train, X_test, y_train, y_test = train_test_split(
    X, y_encoded, test_size=0.2, random_state=42
)

# ── Train Random Forest ───────────────────────────────────────────────────────
model = RandomForestClassifier(n_estimators=100, random_state=42)
model.fit(X_train, y_train)

# ── Evaluate ──────────────────────────────────────────────────────────────────
y_pred = model.predict(X_test)
acc = accuracy_score(y_test, y_pred)
print(f"[OK] Model Accuracy: {acc * 100:.2f}%")
print(f"    Diseases : {le.classes_.tolist()}")
print(f"    Symptoms : {len(X.columns)} features")

# ── Persist artifacts ─────────────────────────────────────────────────────────
pickle.dump(model, open("model.pkl", "wb"))
pickle.dump(le,    open("encoder.pkl", "wb"))
print("[SAVED] model.pkl and encoder.pkl saved successfully.")