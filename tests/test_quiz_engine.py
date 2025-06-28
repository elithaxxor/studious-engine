import asyncio
from quiz_engine import generate_quiz, clear_cache

def test_generate_quiz(monkeypatch):
    def fake_create(model, messages):
        class R:
            choices = [type("X", (), {"message": {"content": "Q1"}})]

        return R()
    monkeypatch.setattr("openai.ChatCompletion.create", fake_create)
    asyncio.run(clear_cache())
    res = asyncio.run(generate_quiz("Python is great."))
    assert "Q1" in res


def test_generate_quiz_cached(monkeypatch):
    calls = []

    def fake_create(model, messages):
        calls.append(1)
        class R:
            choices = [type("X", (), {"message": {"content": "Q2"}})]

        return R()

    monkeypatch.setattr("openai.ChatCompletion.create", fake_create)
    asyncio.run(clear_cache())
    first = asyncio.run(generate_quiz("Cache me"))
    second = asyncio.run(generate_quiz("Cache me"))
    assert first == "Q2"
    assert second == "Q2"
    assert len(calls) == 1
