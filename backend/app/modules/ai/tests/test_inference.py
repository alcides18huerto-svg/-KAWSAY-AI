import hashlib
import json
import shutil
import socket
import subprocess
import sys

import pytest
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.naive_bayes import MultinomialNB

from app.modules.ai import inference
from app.modules.ai.inference import ModelUnavailable, OfflineClassifier, get_classifier
from app.modules.ai.schemas import ClassificationRequest
from app.modules.ai.training.dataset import load_dataset, split_dataset
from app.modules.ai.training.preprocessing import features, tokens


def test_offline_prediction_and_low_confidence(monkeypatch):
    def no_network(*args, **kwargs):
        raise AssertionError("Network forbidden")
    monkeypatch.setattr(socket, "socket", no_network)
    classifier = get_classifier()
    prediction = classifier.classify(ClassificationRequest(text="Cuenta las semillas de una mazorca y escribe el número observado"))
    assert prediction.method == "trained_ml"
    assert prediction.model_version
    assert prediction.dataset_origin == "synthetic"
    assert prediction.teacher_review_required
    unknown = classifier.classify(ClassificationRequest(text="xyzabc qwernop zzzfrr"))
    assert unknown.abstained and unknown.difficulty is None
    assert not unknown.confidence_calibrated


def test_export_matches_sklearn():
    classifier = get_classifier()
    rows, _ = load_dataset(inference.MODELS_DIR.parent / "data" / "synthetic.csv")
    training, _, test = split_dataset(rows, 42)
    vectorizer = TfidfVectorizer(tokenizer=tokens, token_pattern=None, lowercase=False, max_features=8000)
    x = vectorizer.fit_transform([features(r) for r in training])
    model = (LogisticRegression(random_state=42, max_iter=1000, C=4)
             if classifier.model["algorithm"] == "logistic_regression" else MultinomialNB(alpha=0.5))
    model.fit(x, [r.label for r in training])
    for row, expected in zip(test, model.predict_proba(vectorizer.transform([features(r) for r in test])), strict=True):
        assert classifier.probabilities(row.text)[0] == pytest.approx(expected, abs=1e-10)


def test_runtime_does_not_import_training_or_network_dependencies():
    code = """
import importlib.abc
import sys
class Block(importlib.abc.MetaPathFinder):
    def find_spec(self, fullname, *args):
        if fullname.split('.')[0] in {'sklearn', 'numpy', 'scipy', 'httpx'}:
            raise AssertionError('Forbidden runtime dependency: ' + fullname)
sys.meta_path.insert(0, Block())
from app.modules.ai.inference import get_classifier
assert get_classifier().probabilities('Cuenta las semillas')[0]
"""
    subprocess.run([sys.executable, "-c", code], check=True, timeout=20)


def test_missing_model_fails_safely(tmp_path, monkeypatch):
    get_classifier.cache_clear()
    monkeypatch.setattr(inference, "MODELS_DIR", tmp_path)
    result = inference.classify_activity(ClassificationRequest(text="Un ejercicio nuevo"))
    assert result.method == "unavailable" and result.abstained
    get_classifier.cache_clear()


@pytest.mark.parametrize("corruption", ["checksum", "dimensions", "nan", "preprocessing"])
def test_corrupt_model_rejected(tmp_path, corruption):
    classifier = get_classifier()
    source = inference.MODELS_DIR / classifier.model["version"]
    release = tmp_path / "release"
    shutil.copytree(source, release)
    path = release / "model.json"
    model = json.loads(path.read_text())
    if corruption == "dimensions":
        model["weights"][0] = []
    elif corruption == "nan":
        model["bias"][0] = float("nan")
    elif corruption == "preprocessing":
        model["preprocessing"] = "unknown"
    else:
        model["version"] = "tampered"
    path.write_text(json.dumps(model), encoding="utf-8")
    if corruption != "checksum":
        meta_path = release / "metadata.json"
        meta = json.loads(meta_path.read_text())
        meta["sha256"] = hashlib.sha256(path.read_bytes()).hexdigest()
        meta_path.write_text(json.dumps(meta), encoding="utf-8")
    with pytest.raises(ModelUnavailable):
        OfflineClassifier(release)
