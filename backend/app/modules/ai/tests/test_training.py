import json
from pathlib import Path

import pytest

from app.modules.ai.training.dataset import load_dataset, split_dataset
from app.modules.ai.training.synthetic import create_fixture
from app.modules.ai.training.train import train

DATA = Path(__file__).resolve().parents[1] / "data" / "synthetic.csv"


def test_csv_json_and_duplicate_cleaning(tmp_path):
    rows, report = load_dataset(DATA)
    path = tmp_path / "data.json"
    path.write_text(json.dumps([r.model_dump() for r in rows] + [rows[0].model_dump()]), encoding="utf-8")
    restored, quality = load_dataset(path)
    assert restored == rows
    assert quality["duplicates_removed"] == 1
    assert report["origin"] == "synthetic"


@pytest.mark.parametrize("data", [[], {}, [{"text": "a"}], [{"text": "Valid exercise", "label": "WRONG"}]])
def test_invalid_data(tmp_path, data):
    path = tmp_path / "data.json"
    path.write_text(json.dumps(data), encoding="utf-8")
    with pytest.raises(ValueError):
        load_dataset(path)


def test_schema_excludes_personal_fields_and_mixed_origins(tmp_path):
    rows, _ = load_dataset(DATA)
    data = [r.model_dump() for r in rows]
    path = tmp_path / "data.json"
    data[0]["dni"] = "12345678"
    path.write_text(json.dumps(data), encoding="utf-8")
    with pytest.raises(ValueError):
        load_dataset(path)
    del data[0]["dni"]
    data[0]["origin"] = "authorized"
    path.write_text(json.dumps(data), encoding="utf-8")
    with pytest.raises(ValueError, match="mezclar"):
        load_dataset(path)


def test_group_splits_are_disjoint_and_deterministic():
    rows, _ = load_dataset(DATA)
    parts = split_dataset(rows, 42)
    assert parts == split_dataset(rows, 42)
    families = [{r.family_id for r in part} for part in parts]
    assert not families[0] & families[1]
    assert not families[0] & families[2]
    assert not families[1] & families[2]
    assert [len(part) for part in parts] == [27, 9, 9]


def test_insufficient_families():
    rows, _ = load_dataset(DATA)
    with pytest.raises(ValueError):
        split_dataset(rows[:3], 42)


def test_training_reproducible_and_fixture_reproducible(tmp_path):
    fixture = tmp_path / "fixture.csv"
    create_fixture(fixture)
    assert load_dataset(fixture)[0] == load_dataset(DATA)[0]
    a = train(DATA, tmp_path / "a")
    b = train(DATA, tmp_path / "b")
    assert a["version"] == b["version"]
    assert (Path(a["directory"]) / "model.json").read_bytes() == (Path(b["directory"]) / "model.json").read_bytes()
    assert b"\r\n" not in (Path(a["directory"]) / "model.json").read_bytes()
    report = json.loads((Path(a["directory"]) / "evaluation.json").read_text())
    assert set(report["validation"]) == {"logistic_regression", "multinomial_nb"}
    assert 0 <= report["test"]["accuracy"] <= 1
    assert "baseline_test" in report
