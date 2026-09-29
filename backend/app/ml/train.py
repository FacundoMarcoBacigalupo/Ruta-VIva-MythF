"""Entrenamiento del modelo XGBoost de riesgo vial.

Uso:
    python -m app.ml.train

Requiere tener datos en la tabla `incidents` (correr `python seed.py` primero
o consolidar ingesta real de ANSV).

Salida: `backend/models/xgb_risk.json` que `risk_engine.py` carga en runtime
como refinamiento sobre el baseline heurístico.
"""
from __future__ import annotations

import math
import os
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.metrics import classification_report, roc_auc_score
from sklearn.model_selection import train_test_split
from xgboost import XGBClassifier

from app.core.database import SessionLocal
from app.models.incident import Incident

MODELS_DIR = Path(__file__).resolve().parents[2] / "models"
MODELS_DIR.mkdir(parents=True, exist_ok=True)
MODEL_PATH = MODELS_DIR / "xgb_risk.json"
META_PATH = MODELS_DIR / "meta.joblib"


def build_dataframe() -> pd.DataFrame:
    db = SessionLocal()
    rows = db.query(Incident).all()
    db.close()
    data = [
        {
            "lat": r.lat,
            "lon": r.lon,
            "hour": r.occurred_at.hour,
            "weekday": r.occurred_at.weekday(),
            "month": r.occurred_at.month,
            "severity": r.severity,
            "fatalities": r.fatalities,
            "injuries": r.injuries,
            "vehicles": r.vehicles_involved,
            "road_type": r.road_type or "desconocido",
            "weather": r.weather or "desconocido",
            "province": r.province or "desconocido",
        }
        for r in rows
    ]
    return pd.DataFrame(data)


def make_training_set(df: pd.DataFrame) -> tuple[pd.DataFrame, np.ndarray]:
    """
    Como el dataset crudo contiene solo positivos (siniestros), generamos
    'negativos sintéticos' muestreando coordenadas sobre Argentina continental
    donde la densidad local de siniestros es baja. Esto aproxima el problema
    de 'probabilidad de siniestro en un punto-hora dado'.
    """
    if df.empty:
        raise RuntimeError("No hay incidentes en la base. Corré seed.py primero.")

    # Positivos
    pos = df.copy()
    pos["label"] = 1

    # Negativos: samples aleatorios en el bounding box de Argentina continental
    rng = np.random.default_rng(42)
    n_neg = len(pos) * 3
    lat_min, lat_max = -55.0, -22.0
    lon_min, lon_max = -73.0, -53.0
    neg = pd.DataFrame(
        {
            "lat": rng.uniform(lat_min, lat_max, n_neg),
            "lon": rng.uniform(lon_min, lon_max, n_neg),
            "hour": rng.integers(0, 24, n_neg),
            "weekday": rng.integers(0, 7, n_neg),
            "month": rng.integers(1, 13, n_neg),
            "severity": 0,
            "fatalities": 0,
            "injuries": 0,
            "vehicles": 0,
            "road_type": "desconocido",
            "weather": "desconocido",
            "province": "desconocido",
        }
    )

    # Filtrar negativos que estén a <20km de cualquier positivo (si no, serían falsos negativos)
    def haversine(lat1, lon1, lat2, lon2):
        r = 6371.0
        phi1, phi2 = np.radians(lat1), np.radians(lat2)
        dphi = np.radians(lat2 - lat1)
        dl = np.radians(lon2 - lon1)
        a = np.sin(dphi / 2) ** 2 + np.cos(phi1) * np.cos(phi2) * np.sin(dl / 2) ** 2
        return 2 * r * np.arcsin(np.sqrt(a))

    pos_lat = pos["lat"].to_numpy()
    pos_lon = pos["lon"].to_numpy()
    keep = []
    for i, row in neg.iterrows():
        d = haversine(row["lat"], row["lon"], pos_lat, pos_lon)
        if d.min() > 20:
            keep.append(i)
    neg = neg.loc[keep].copy()
    neg["label"] = 0

    full = pd.concat([pos, neg], ignore_index=True)
    # One-hot encoding para categóricas
    full = pd.get_dummies(full, columns=["road_type", "weather", "province"], drop_first=False)

    y = full["label"].to_numpy()
    X = full.drop(columns=["label"])
    return X, y


def train():
    df = build_dataframe()
    print(f"Incidentes cargados: {len(df)}")
    X, y = make_training_set(df)
    print(f"Dataset final: {X.shape}, positivos={(y == 1).sum()}, negativos={(y == 0).sum()}")

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

    model = XGBClassifier(
        n_estimators=300,
        max_depth=6,
        learning_rate=0.08,
        subsample=0.8,
        colsample_bytree=0.8,
        objective="binary:logistic",
        eval_metric="auc",
        random_state=42,
        n_jobs=-1,
    )
    model.fit(X_train, y_train)

    preds = model.predict(X_test)
    probs = model.predict_proba(X_test)[:, 1]
    print("\nClassification report:")
    print(classification_report(y_test, preds, digits=3))
    try:
        print(f"ROC AUC: {roc_auc_score(y_test, probs):.3f}")
    except Exception:
        pass

    model.save_model(str(MODEL_PATH))
    joblib.dump({"columns": X.columns.tolist()}, META_PATH)
    print(f"\nModelo guardado en: {MODEL_PATH}")
    print(f"Metadata guardada en: {META_PATH}")


if __name__ == "__main__":
    train()
