import json

import pytest

from app.modules.ai.training.dataset import Example, load_dataset, split_dataset
from app.modules.ai.training.synthetic import TASKS


def test_numeric_variants_stay_together():
    rows = [Example(text=text, label=label, family_id=f"{label}-{i}", origin="synthetic", source="fixture")
            for label, texts in TASKS.items() for i, text in enumerate(texts)]
    rows.extend([
        Example(text="Cuenta 12 semillas del huerto", label="BASIC", family_id="seed-a", origin="synthetic", source="fixture"),
        Example(text="Cuenta 15 semillas del huerto", label="BASIC", family_id="seed-b", origin="synthetic", source="fixture"),
    ])
    parts = split_dataset(rows, 42)
    assert sum(any(r.family_id == "seed-a" for r in p) and any(r.family_id == "seed-b" for r in p) for p in parts) == 1


def test_contradictory_duplicate_rejected(tmp_path):
    row = {"text": "Cuenta semillas del huerto", "label": "BASIC", "family_id": "a", "origin": "synthetic", "source": "fixture"}
    path = tmp_path / "data.json"
    path.write_text(json.dumps([row, {**row, "label": "ADVANCED"}]), encoding="utf-8")
    with pytest.raises(ValueError, match="contradictoria"):
        load_dataset(path)


def test_missing_optional_features_are_reported(tmp_path):
    row = {"text": "Cuenta semillas del huerto", "label": "BASIC", "family_id": "a", "origin": "synthetic", "source": "fixture"}
    path = tmp_path / "data.json"
    path.write_text(json.dumps([row]), encoding="utf-8")
    _, quality = load_dataset(path)
    assert quality["missing_values"]["grade"] == 1
    assert quality["missing_values"]["competency"] == 1


def test_obvious_identifiers_in_training_text_are_rejected(tmp_path):
    row = {"text": "Contactar alumno@example.com", "label": "BASIC", "family_id": "a", "origin": "synthetic", "source": "fixture"}
    path = tmp_path / "data.json"
    path.write_text(json.dumps([row]), encoding="utf-8")
    with pytest.raises(ValueError, match="identificador personal"):
        load_dataset(path)
