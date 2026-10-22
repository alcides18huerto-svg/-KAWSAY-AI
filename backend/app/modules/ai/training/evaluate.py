"""Evaluate a frozen JSON release on an independently supplied dataset."""
import argparse
import json
from pathlib import Path

from app.modules.ai.inference import OfflineClassifier

from .dataset import load_dataset
from .metrics import metrics


def evaluate(dataset: Path, release: Path):
    rows, quality = load_dataset(dataset)
    classifier = OfflineClassifier(release)
    probabilities = [classifier.probabilities(row.text)[0] for row in rows]
    classes = classifier.model["classes"]
    predictions = [classes[max(range(3), key=lambda i: p[i])] for p in probabilities]
    return {"dataset": quality, "model_version": classifier.model["version"],
            "independence": "Caller must verify this dataset was not used for training or selection",
            "metrics": metrics([r.label for r in rows], predictions, probabilities, classes)}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("dataset", type=Path)
    parser.add_argument("release", type=Path)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    args.output.write_text(json.dumps(evaluate(args.dataset, args.release), indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
