import json
from pathlib import Path

from domain.categorizer import CategorizerConnection, CategorizerProvider
from infrastructure.categorizer.jev_client import (
    assignments_from_answers,
    choice_question,
    key_hint,
)
from infrastructure.categorizer.store import CategorizerStore


def test_key_hint_keeps_only_the_last_four_characters():
    assert key_hint("sk-or-v1-secret-abcd") == "••••abcd"
    assert key_hint("abcd") == "••••"


def test_choice_question_offers_the_analysis_categories():
    question = choice_question("tx-1")
    assert question["type"] == "choice"
    assert "groceries" in question["criteria"]
    assert "uncategorized" in question["criteria"]
    assert "tx-1" in question["instructions"]


def test_assignments_ignore_unknown_categories():
    assigned = assignments_from_answers(
        {
            "a": {"type": "choice", "choice": "groceries", "confidence": 0.8},
            "b": {"type": "choice", "choice": "not-a-category", "confidence": 0.9},
            "c": {"type": "noul", "noul": 0.2},
        },
        ["a", "b", "c"],
    )
    assert [(item.id, item.category, item.confidence) for item in assigned] == [
        ("a", "groceries", 0.8)
    ]


def test_store_roundtrip_does_not_keep_a_file_after_disconnect(tmp_path: Path):
    store = CategorizerStore()
    store.connect(tmp_path)
    store.save(
        CategorizerConnection(
            provider=CategorizerProvider.OPENROUTER,
            api_key="sk-or-v1-example",
        )
    )
    loaded = store.load()
    assert loaded is not None
    assert loaded.provider is CategorizerProvider.OPENROUTER
    assert loaded.api_key == "sk-or-v1-example"
    raw = json.loads((tmp_path / "categorizer.json").read_text())
    assert raw["apiKey"] == "sk-or-v1-example"
    store.clear()
    assert store.load() is None
