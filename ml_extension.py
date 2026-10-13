"""
ml_extension.py
---------------
Module 4 – ML prediction of game outcome from opening moves.

What this module does
---------------------
1. Encodes the opening plies as a *bag-of-moves* feature vector (multi-hot).
   Only features derived from the first NUM_PLIES plies are used — NO future
   information is included, preventing data leakage.
2. Trains Logistic Regression and Random Forest classifiers (80/20 split).
3. Reports: Accuracy, Precision, Recall, F1 (per-class), Macro F1,
            Weighted F1, and Confusion Matrix.
4. Saves metrics and model-feature importances to CSV.

⚠️  Metric distinction (viva critical)
---------------------------------------
  ML metrics (accuracy, precision, recall, F1) measure *predictive power*.
  They have NOTHING to do with association rule metrics (support/confidence/lift).
  A high-lift rule does NOT imply good predictive accuracy, and vice versa.
  Correlation ≠ causation; association ≠ causation.
"""

import logging
import os

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
)
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder, MultiLabelBinarizer

import config

log = logging.getLogger(__name__)


# ── Feature Engineering ────────────────────────────────────────────────────────

def build_features(df: pd.DataFrame) -> tuple[np.ndarray, np.ndarray, list[str], LabelEncoder]:
    """
    Build a multi-hot (bag-of-moves) feature matrix from opening plies.

    Each column represents one SAN move token seen in the training data.
    A value of 1 means that move appeared in the game's opening; 0 otherwise.

    NOTE: This is purely from the first NUM_PLIES moves — no future leakage.

    Returns
    -------
    X          : (n_games, n_unique_moves) float array
    y          : (n_games,) int array of encoded labels
    feature_names : list of SAN tokens (column names)
    le         : fitted LabelEncoder for inverse-transforming predictions
    """
    mlb = MultiLabelBinarizer()
    X = mlb.fit_transform(df["opening_plies"]).astype(np.float32)
    feature_names = list(mlb.classes_)

    le = LabelEncoder()
    y = le.fit_transform(df["outcome"])

    log.info(
        "  Feature matrix: %d games × %d features  |  Classes: %s",
        X.shape[0], X.shape[1], list(le.classes_),
    )
    return X, y, feature_names, le


# ── Train / Evaluate ───────────────────────────────────────────────────────────

def _evaluate(name: str, y_true, y_pred, labels: list[str]) -> dict:
    """Compute and log all required ML metrics."""
    acc  = accuracy_score(y_true, y_pred)
    prec = precision_score(y_true, y_pred, average=None, zero_division=0)
    rec  = recall_score(y_true, y_pred, average=None, zero_division=0)
    f1c  = f1_score(y_true, y_pred, average=None, zero_division=0)
    mac_f1  = f1_score(y_true, y_pred, average="macro",    zero_division=0)
    wt_f1   = f1_score(y_true, y_pred, average="weighted", zero_division=0)
    cm       = confusion_matrix(y_true, y_pred)

    log.info("\n── %s ──", name)
    log.info("  Accuracy:     %.4f", acc)
    log.info("  Macro F1:     %.4f", mac_f1)
    log.info("  Weighted F1:  %.4f", wt_f1)
    log.info("\n  Per-class metrics:")
    for i, lbl in enumerate(labels):
        log.info("    %-12s  Prec=%.4f  Rec=%.4f  F1=%.4f", lbl, prec[i], rec[i], f1c[i])
    log.info("\n  Confusion Matrix:\n%s", pd.DataFrame(cm, index=labels, columns=labels).to_string())

    return {
        "model":       name,
        "accuracy":    acc,
        "macro_f1":    mac_f1,
        "weighted_f1": wt_f1,
        "precision_per_class": prec.tolist(),
        "recall_per_class":    rec.tolist(),
        "f1_per_class":        f1c.tolist(),
        "confusion_matrix":    cm,
        "labels":              labels,
        "y_pred":              y_pred,
        "y_true":              y_true,
    }


def train_and_evaluate(
    X: np.ndarray,
    y: np.ndarray,
    feature_names: list[str],
    le: LabelEncoder,
) -> dict:
    """
    Split data, train Logistic Regression and Random Forest, evaluate both.

    Returns a dict containing metrics and model objects.
    """
    labels = list(le.classes_)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y,
        test_size=config.TEST_SIZE,
        random_state=config.RANDOM_STATE,
        stratify=y,
    )
    log.info(
        "  Train: %d  |  Test: %d  (stratified 80/20, random_state=%d)",
        len(X_train), len(X_test), config.RANDOM_STATE,
    )

    results = {}

    # ── Logistic Regression ──────────────────────────────────────────────────
    log.info("  Training Logistic Regression …")
    lr = LogisticRegression(
        max_iter=1000,
        random_state=config.RANDOM_STATE,
        class_weight="balanced",
        solver="lbfgs",
    )
    lr.fit(X_train, y_train)
    lr_pred = lr.predict(X_test)
    results["lr"] = _evaluate("Logistic Regression", y_test, lr_pred, labels)
    results["lr"]["model_obj"] = lr

    # ── Random Forest ────────────────────────────────────────────────────────
    log.info("  Training Random Forest …")
    rf = RandomForestClassifier(
        n_estimators=200,
        max_depth=15,
        random_state=config.RANDOM_STATE,
        class_weight="balanced",
        n_jobs=-1,
    )
    rf.fit(X_train, y_train)
    rf_pred = rf.predict(X_test)
    results["rf"] = _evaluate("Random Forest", y_test, rf_pred, labels)
    results["rf"]["model_obj"] = rf

    # ── Feature Importances (RF) ─────────────────────────────────────────────
    importances = pd.DataFrame({
        "move":       feature_names,
        "importance": rf.feature_importances_,
    }).sort_values("importance", ascending=False).reset_index(drop=True)
    results["rf_feature_importance"] = importances
    log.info("\n  Top 15 Important Moves (RF):\n%s", importances.head(15).to_string())

    # ── LR Coefficients ─────────────────────────────────────────────────────
    lr_coef = pd.DataFrame(
        lr.coef_,
        index=labels,
        columns=feature_names,
    ).T
    lr_coef["max_abs_coef"] = lr_coef.abs().max(axis=1)
    lr_coef.sort_values("max_abs_coef", ascending=False, inplace=True)
    results["lr_coef"] = lr_coef

    return results


# ── Save Metrics ──────────────────────────────────────────────────────────────

def save_ml_metrics(results: dict) -> None:
    """Save model metrics and feature importances to CSV files."""
    labels = results["lr"]["labels"]

    rows = []
    for key in ("lr", "rf"):
        r = results[key]
        row = {
            "model":       r["model"],
            "accuracy":    r["accuracy"],
            "macro_f1":    r["macro_f1"],
            "weighted_f1": r["weighted_f1"],
        }
        for i, lbl in enumerate(labels):
            row[f"precision_{lbl}"] = r["precision_per_class"][i]
            row[f"recall_{lbl}"]    = r["recall_per_class"][i]
            row[f"f1_{lbl}"]        = r["f1_per_class"][i]
        rows.append(row)

    metrics_df = pd.DataFrame(rows)
    path = os.path.join(config.CSV_DIR, "ml_metrics.csv")
    metrics_df.to_csv(path, index=False)
    log.info("  Saved → %s", path)

    # Save RF feature importances
    imp_path = os.path.join(config.CSV_DIR, "rf_feature_importance.csv")
    results["rf_feature_importance"].to_csv(imp_path, index=False)
    log.info("  Saved → %s", imp_path)

    # Save confusion matrices
    for key, name in [("lr", "logistic_regression"), ("rf", "random_forest")]:
        r = results[key]
        cm_df = pd.DataFrame(
            r["confusion_matrix"], index=labels, columns=labels
        )
        cm_path = os.path.join(config.CSV_DIR, f"confusion_matrix_{name}.csv")
        cm_df.to_csv(cm_path)
        log.info("  Saved → %s", cm_path)


# ── Orchestrator ──────────────────────────────────────────────────────────────

def run_full_ml_analysis(df: pd.DataFrame) -> dict:
    """
    Full ML pipeline: build features → train → evaluate → save.

    Returns results dict from train_and_evaluate.
    """
    log.info("=== ML Extension ===")
    X, y, feature_names, le = build_features(df)
    results = train_and_evaluate(X, y, feature_names, le)
    results["feature_names"] = feature_names
    results["label_encoder"] = le
    save_ml_metrics(results)
    return results
