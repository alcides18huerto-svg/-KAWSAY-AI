"""python -m app.modules.ai.training.train DATASET --output DIRECTORY"""
import argparse
import hashlib
import json
import platform
from pathlib import Path

import numpy
import scipy
import sklearn
from sklearn.dummy import DummyClassifier
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.naive_bayes import MultinomialNB

from .dataset import load_dataset, split_dataset
from .metrics import metrics
from .preprocessing import PREPROCESSING_VERSION, features, tokens


def write_json(path, value):
    path.write_bytes((json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2, allow_nan=False) + "\n").encode("utf-8"))


def train(dataset: Path, output: Path, seed: int = 42) -> dict:
    rows, quality = load_dataset(dataset)
    training, validation, testing = split_dataset(rows, seed)
    vectorizer = TfidfVectorizer(tokenizer=tokens, token_pattern=None, lowercase=False, max_features=8000)
    x_train = vectorizer.fit_transform([features(r) for r in training])
    x_val = vectorizer.transform([features(r) for r in validation])
    x_test = vectorizer.transform([features(r) for r in testing])
    y_train = [r.label for r in training]
    y_val = [r.label for r in validation]
    y_test = [r.label for r in testing]
    candidates = {
        "logistic_regression": LogisticRegression(random_state=seed, max_iter=1000, C=4),
        "multinomial_nb": MultinomialNB(alpha=0.5),
    }
    scores = {}
    for name, candidate in candidates.items():
        candidate.fit(x_train, y_train)
        scores[name] = metrics(y_val, candidate.predict(x_val))
    selected = max(scores, key=lambda name: scores[name]["f1_macro"])
    model = candidates[selected]
    baseline = DummyClassifier(strategy="most_frequent").fit(x_train, y_train)
    report = {
        "seed": seed, "dataset": quality, "selected": selected,
        "selection_partition": "validation", "validation": scores,
        "test": metrics(y_test, model.predict(x_test), model.predict_proba(x_test), model.classes_),
        "baseline_test": metrics(y_test, baseline.predict(x_test)),
        "split_sizes": {"train": len(training), "validation": len(validation), "test": len(testing)},
        "split_families": {name: sorted({r.family_id for r in split}) for name, split in
                           (("train", training), ("validation", validation), ("test", testing))},
    }
    artifact = {
        "format": 1, "preprocessing": PREPROCESSING_VERSION, "algorithm": selected,
        "classes": model.classes_.tolist(), "vocabulary": {k: int(v) for k, v in vectorizer.vocabulary_.items()},
        "idf": vectorizer.idf_.tolist(),
        "weights": (model.coef_ if selected == "logistic_regression" else model.feature_log_prob_).tolist(),
        "bias": (model.intercept_ if selected == "logistic_regression" else model.class_log_prior_).tolist(),
    }
    # Content-derived immutable version; refuse accidental replacement of an existing release.
    identity = json.dumps(artifact, sort_keys=True).encode()
    version = "difficulty-v1-" + hashlib.sha256(identity).hexdigest()[:12]
    artifact["version"] = version
    release = output / version
    release.mkdir(parents=True, exist_ok=True)
    model_path = release / "model.json"
    metadata_path = release / "metadata.json"
    if metadata_path.exists():
        previous = json.loads(metadata_path.read_text(encoding="utf-8"))
        if previous["dataset"]["sha256"] != quality["sha256"] or previous["seed"] != seed:
            raise ValueError("La versión existente tiene distinta procedencia; use otro directorio de releases")
    rendered = json.dumps(artifact, ensure_ascii=False, sort_keys=True, indent=2, allow_nan=False) + "\n"
    if model_path.exists() and model_path.read_text(encoding="utf-8") != rendered:
        raise ValueError("No se puede sobrescribir una versión existente")
    model_path.write_bytes(rendered.encode("utf-8"))
    metadata = {
        "version": version, "sha256": hashlib.sha256(model_path.read_bytes()).hexdigest(),
        "algorithm": selected, "dataset": quality, "seed": seed,
        "python": platform.python_version(), "scikit_learn": sklearn.__version__,
        "numpy": numpy.__version__, "scipy": scipy.__version__,
        "training_parameters": {"max_features": 8000, "logistic_C": 4, "nb_alpha": 0.5,
                                "split": [0.6, 0.2, 0.2], "selection_metric": "f1_macro"},
        "confidence_calibrated": False, "abstention_threshold": 0.65,
        "pedagogically_validated": False, "review_required": True,
        "limitations": "Synthetic technical fixture; probabilities are not calibrated; not validated for students."
                        if quality["origin"] == "synthetic" else "Requires independent pedagogical validation and calibration.",
    }
    probabilities = model.predict_proba(x_test)
    coverage = (probabilities.max(axis=1) >= metadata["abstention_threshold"])
    report["selective_test"] = {
        "threshold": metadata["abstention_threshold"], "confidence_calibrated": False,
        "confidence_only_coverage": float(coverage.mean()),
        "accepted": int(coverage.sum()), "total": len(testing),
        "note": "Runtime also abstains when vocabulary coverage is below 0.3. Fixed technical threshold, not pedagogically optimized.",
    }
    write_json(release / "metadata.json", metadata)
    write_json(release / "evaluation.json", report)
    return {"version": version, "directory": str(release), "test": report["test"]}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("dataset", type=Path)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()
    print(json.dumps(train(args.dataset, args.output, args.seed), ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
