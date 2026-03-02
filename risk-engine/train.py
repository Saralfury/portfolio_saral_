"""
train.py — One-shot model trainer for the Fraud Risk Engine.

Generates a synthetic, imbalanced fraud dataset (5% fraud rate),
trains a RandomForestClassifier, and serialises it to fraud_model.pkl.

Usage:
    python train.py
"""

import joblib
import numpy as np
from sklearn.datasets import make_classification
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report
from sklearn.model_selection import train_test_split

print("── Generating synthetic fraud dataset (10,000 samples) ──")

X, y = make_classification(
    n_samples=10_000,
    n_features=20,          # 20 engineered features (see feature_vector() in main.py)
    n_informative=15,       # 15 are genuinely predictive
    n_redundant=5,
    weights=[0.95, 0.05],   # 5% fraud rate — realistic class imbalance
    flip_y=0.01,            # 1% label noise to prevent overfitting
    random_state=42,
)

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

print(f"Train: {len(X_train)} samples | Test: {len(X_test)} samples")
print(f"Fraud rate in train: {y_train.mean():.2%}")

print("\n── Training RandomForestClassifier ──")
model = RandomForestClassifier(
    n_estimators=100,
    max_depth=8,
    class_weight="balanced",   # corrects for class imbalance
    random_state=42,
    n_jobs=-1,
)
model.fit(X_train, y_train)

print("\n── Evaluation on held-out test set ──")
y_pred = model.predict(X_test)
print(classification_report(y_test, y_pred, target_names=["LEGIT", "FRAUD"]))

output_path = "fraud_model.pkl"
joblib.dump(model, output_path)
print(f"── Model saved → {output_path} ──")
