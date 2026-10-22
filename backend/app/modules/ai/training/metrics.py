"""Evaluation reports do not include exercise text or student data."""
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix, log_loss

from .preprocessing import LABELS


def metrics(expected, predicted, probabilities=None, classes=None):
    report = classification_report(expected, predicted, labels=LABELS, output_dict=True, zero_division=0)
    result = {
        "accuracy": accuracy_score(expected, predicted),
        "precision_macro": report["macro avg"]["precision"],
        "recall_macro": report["macro avg"]["recall"],
        "f1_macro": report["macro avg"]["f1-score"],
        "per_class": {label: report[label] for label in LABELS},
        "labels": LABELS, "confusion_matrix": confusion_matrix(expected, predicted, labels=LABELS).tolist(),
        "errors": [{"index": i, "expected": a, "predicted": b}
                   for i, (a, b) in enumerate(zip(expected, predicted, strict=True)) if a != b],
    }
    if probabilities is not None:
        result["log_loss"] = log_loss(expected, probabilities, labels=classes)
    return result
