"""Validate locally without uploading data: python -m ...validate_data dataset.csv"""
import argparse
import json
from pathlib import Path

from .dataset import load_dataset, split_dataset


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("dataset", type=Path)
    args = parser.parse_args()
    rows, report = load_dataset(args.dataset)
    split_dataset(rows, 42)
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
