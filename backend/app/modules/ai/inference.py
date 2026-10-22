"""Pure-Python offline inference. No sklearn, pickle, network or executable artifacts."""
import hashlib
import json
import math
from collections import Counter
from functools import lru_cache
from pathlib import Path

from app.modules.ai.schemas import ClassificationRequest, ClassificationResult
from app.modules.ai.training.preprocessing import LABELS, PREPROCESSING_VERSION, normalize, tokens

MODELS_DIR = Path(__file__).resolve().parent / "models"


class ModelUnavailable(ValueError):
    pass


def bounded_json(path: Path, limit: int):
    if path.stat().st_size > limit:
        raise ModelUnavailable("artifact_too_large")
    return json.loads(path.read_text(encoding="utf-8"))


class OfflineClassifier:
    def __init__(self, directory: Path):
        try:
            self.metadata = bounded_json(directory / "metadata.json", 100000)
            if (directory / "model.json").stat().st_size > 5_000_000:
                raise ModelUnavailable("artifact_too_large")
            raw = (directory / "model.json").read_bytes()
            if len(raw) > 5_000_000 or hashlib.sha256(raw).hexdigest() != self.metadata["sha256"]:
                raise ModelUnavailable("checksum_mismatch")
            self.model = json.loads(raw)
            m = self.model
            if m["format"] != 1 or m["preprocessing"] != PREPROCESSING_VERSION:
                raise ModelUnavailable("unsupported_format")
            if m["version"] != self.metadata["version"] or set(m["classes"]) != set(LABELS) or len(m["classes"]) != 3:
                raise ModelUnavailable("invalid_classes_or_version")
            if m["algorithm"] not in {"logistic_regression", "multinomial_nb"}:
                raise ModelUnavailable("unsupported_algorithm")
            n = len(m["vocabulary"])
            if not 1 <= n <= 8000 or sorted(m["vocabulary"].values()) != list(range(n)):
                raise ModelUnavailable("invalid_vocabulary")
            if len(m["idf"]) != n or len(m["weights"]) != 3 or len(m["bias"]) != 3:
                raise ModelUnavailable("invalid_dimensions")
            if any(len(row) != n for row in m["weights"]):
                raise ModelUnavailable("invalid_weights")
            numbers = m["idf"] + m["bias"] + [x for row in m["weights"] for x in row]
            if not all(isinstance(x, float | int) and math.isfinite(x) and abs(x) < 1e6 for x in numbers):
                raise ModelUnavailable("nonfinite_weights")
            if any(x <= 0 for x in m["idf"]):
                raise ModelUnavailable("invalid_idf")
            threshold = self.metadata["abstention_threshold"]
            if not isinstance(threshold, float | int) or not 0.5 <= threshold <= 1:
                raise ModelUnavailable("invalid_threshold")
            if self.metadata["dataset"]["origin"] not in {"synthetic", "authorized"}:
                raise ModelUnavailable("invalid_origin")
        except (OSError, KeyError, TypeError, ValueError) as exc:
            raise ModelUnavailable("missing_or_invalid_model") from exc

    def probabilities(self, text: str):
        m = self.model
        counts = Counter(tokens(text))
        values = {m["vocabulary"][t]: count * m["idf"][m["vocabulary"][t]]
                  for t, count in counts.items() if t in m["vocabulary"]}
        norm = math.sqrt(sum(v * v for v in values.values()))
        if norm:
            values = {i: v / norm for i, v in values.items()}
        scores = [bias + sum(weights[i] * value for i, value in values.items())
                  for bias, weights in zip(m["bias"], m["weights"], strict=True)]
        exps = [math.exp(score - max(scores)) for score in scores]
        probs = [value / sum(exps) for value in exps]
        coverage = sum(count for t, count in counts.items() if t in m["vocabulary"]) / max(1, sum(counts.values()))
        return probs, coverage

    def classify(self, payload: ClassificationRequest) -> ClassificationResult:
        probs, coverage = self.probabilities(payload.text)
        confidence = max(probs)
        abstained = confidence < self.metadata["abstention_threshold"] or coverage < 0.3
        return ClassificationResult(
            difficulty=None if abstained else self.model["classes"][probs.index(confidence)],
            confidence=confidence, model_version=self.model["version"], method="trained_ml",
            abstained=abstained, reason="low_confidence_or_out_of_vocabulary" if abstained else "estimated_not_pedagogical_assessment",
            dataset_origin=self.metadata["dataset"]["origin"],
            input_sha256=hashlib.sha256(normalize(payload.text).encode()).hexdigest(),
        )


@lru_cache(maxsize=1)
def get_classifier() -> OfflineClassifier:
    # Fixed trusted local release selected at deploy time; never accept client paths.
    active = bounded_json(MODELS_DIR / "active.json", 1000)
    version = active["version"]
    if not isinstance(version, str) or not version.startswith("difficulty-v1-") or not all(c.isalnum() or c == "-" for c in version):
        raise ModelUnavailable("invalid_release")
    return OfflineClassifier(MODELS_DIR / version)


def classify_activity(payload: ClassificationRequest) -> ClassificationResult:
    try:
        return get_classifier().classify(payload)
    except (OSError, ValueError, KeyError, TypeError):
        return ClassificationResult(method="unavailable", reason="model_missing_or_corrupt")


def classify_stored_activity(text: str, grade: int, subject: str) -> ClassificationResult:
    """Legacy stored content may predate current input bounds/privacy checks."""
    try:
        payload = ClassificationRequest(text=text, grade=grade, subject=subject)
    except ValueError:
        return ClassificationResult(method="unavailable", reason="stored_content_requires_teacher_revision")
    return classify_activity(payload)
