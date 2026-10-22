"""Shared, versioned text transformation used by training and offline inference."""
import re
import unicodedata

PREPROCESSING_VERSION = "text-v1"
LABELS = ["BASIC", "INTERMEDIATE", "ADVANCED"]


def normalize(text: str) -> str:
    text = unicodedata.normalize("NFKD", text.casefold())
    text = "".join(c for c in text if not unicodedata.combining(c))
    return " ".join(re.findall(r"\b\w\w+\b", text))


def tokens(text: str) -> list[str]:
    return normalize(text).split()


def features(record) -> str:
    # Grade and subject are deliberately excluded initially: synthetic labels must
    # not become a proxy for grade. Optional context is retained in the dataset.
    return normalize(record.text)


def equivalent_key(text: str) -> str:
    """Group numeric/punctuation variants; teacher family_id handles paraphrases."""
    return re.sub(r"\d+", "NUM", normalize(text))


def has_obvious_identifier(text: str) -> bool:
    return bool(re.search(r"[\w.+-]+@[\w.-]+\.\w+|\b\d{8,}\b", text))
