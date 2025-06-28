import asyncio
from quiz_engine import generate_quiz

def test_generate_quiz(monkeypatch):
    def fake_create(model, messages):
        class R:
            choices = [type("X", (), {"message": {"content": "Q1"}})]

        return R()
    monkeypatch.setattr("openai.ChatCompletion.create", fake_create)
    res = asyncio.run(generate_quiz("Python is great."))
    assert "Q1" in res
