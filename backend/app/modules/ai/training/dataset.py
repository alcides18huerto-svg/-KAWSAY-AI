"""Bounded CSV/JSON import, strict allowlist and leakage-aware grouped splits."""
import csv
import hashlib
import json
from collections import Counter
from pathlib import Path
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from .preprocessing import equivalent_key, has_obvious_identifier, normalize


class Example(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    text: str = Field(min_length=5, max_length=12000)
    label: Literal["BASIC", "INTERMEDIATE", "ADVANCED"]
    family_id: str = Field(min_length=1, max_length=100)
    origin: Literal["synthetic", "authorized"]
    source: str = Field(min_length=3, max_length=300)
    grade: int | None = Field(default=None, ge=1, le=6)
    subject: str | None = Field(default=None, max_length=120)
    competency: str | None = Field(default=None, max_length=255)
    topic: str | None = Field(default=None, max_length=180)
    activity_type: str | None = Field(default=None, max_length=100)
    prerequisites: str | None = Field(default=None, max_length=500)


def load_dataset(path: Path) -> tuple[list[Example], dict]:
    if path.stat().st_size > 10_000_000:
        raise ValueError("Dataset excede 10 MB")
    with path.open(encoding="utf-8-sig", newline="") as stream:
        if path.suffix.lower() == ".csv":
            raw = list(csv.DictReader(stream))
        elif path.suffix.lower() == ".json":
            raw = json.load(stream)
        else:
            raise ValueError("Solo se admite CSV o JSON")
    if not isinstance(raw, list) or not raw or len(raw) > 20000:
        raise ValueError("Se requiere una lista de 1 a 20000 registros")
    rows, seen, duplicates = [], {}, 0
    missing = Counter()
    for item in raw:
        if not isinstance(item, dict):
            raise ValueError("Registro inválido")
        cleaned = {k: (None if v == "" else v) for k, v in item.items()}
        row = Example.model_validate(cleaned)
        if any(has_obvious_identifier(value) for value in row.model_dump().values() if isinstance(value, str)):
            raise ValueError("Posible identificador personal; anonimice el registro antes de entrenar")
        missing.update(k for k, v in row.model_dump().items() if v is None)
        if len(normalize(row.text).split()) < 2:
            raise ValueError("Texto sin vocabulario suficiente")
        key = normalize(row.text)
        if key in seen:
            previous = seen[key]
            if previous.label != row.label or previous.family_id != row.family_id:
                raise ValueError("Duplicado con etiqueta o familia contradictoria")
            duplicates += 1
            continue
        seen[key] = row
        rows.append(row)
    if len({r.origin for r in rows}) != 1:
        raise ValueError("No mezclar datos sintéticos y autorizados")
    canonical = json.dumps([r.model_dump() for r in rows], sort_keys=True, ensure_ascii=False)
    return rows, {
        "rows": len(rows), "duplicates_removed": duplicates,
        "missing_values": dict(missing), "origin": rows[0].origin,
        "class_distribution": dict(Counter(r.label for r in rows)),
        "sha256": hashlib.sha256(canonical.encode()).hexdigest(),
        "sources": sorted({r.source for r in rows}),
    }


def split_dataset(rows: list[Example], seed: int):
    from sklearn.model_selection import train_test_split

    # Connected components unite teacher families and equivalent numeric variants.
    parent = list(range(len(rows)))

    def root(i):
        while parent[i] != i:
            parent[i] = parent[parent[i]]
            i = parent[i]
        return i

    keys = {}
    for i, row in enumerate(rows):
        for key in ("family:" + row.family_id, "text:" + equivalent_key(row.text)):
            if key in keys:
                parent[root(i)] = root(keys[key])
            keys[key] = i
    groups = {}
    for i, row in enumerate(rows):
        groups.setdefault(root(i), []).append(row)
    if any(len({r.label for r in group}) != 1 for group in groups.values()):
        raise ValueError("Una familia contiene etiquetas contradictorias")
    ids = sorted(groups)
    labels = [groups[i][0].label for i in ids]
    if set(labels) != {"BASIC", "INTERMEDIATE", "ADVANCED"} or min(Counter(labels).values()) < 5:
        raise ValueError("Se requieren al menos cinco familias independientes por clase")
    train, remaining = train_test_split(ids, test_size=0.4, stratify=labels, random_state=seed)
    validation, test = train_test_split(
        remaining, test_size=0.5, random_state=seed,
        stratify=[groups[i][0].label for i in remaining],
    )
    return tuple([r for i in part for r in groups[i]] for part in (train, validation, test))
