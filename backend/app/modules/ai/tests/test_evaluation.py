from app.modules.ai.inference import MODELS_DIR, get_classifier
from app.modules.ai.training.evaluate import evaluate
from app.modules.ai.training.metrics import metrics


def test_metrics_known_confusion():
    result = metrics(["BASIC", "ADVANCED", "INTERMEDIATE"], ["BASIC", "BASIC", "INTERMEDIATE"])
    assert result["accuracy"] == 2 / 3
    assert result["confusion_matrix"] == [[1, 0, 0], [0, 1, 0], [1, 0, 0]]
    assert result["per_class"]["ADVANCED"]["recall"] == 0
    assert len(result["errors"]) == 1


def test_frozen_evaluation():
    version = get_classifier().model["version"]
    report = evaluate(MODELS_DIR.parent / "data" / "synthetic.csv", MODELS_DIR / version)
    assert report["model_version"] == version
    assert report["dataset"]["origin"] == "synthetic"
    assert report["metrics"]["log_loss"] >= 0
