import os

DB_PATH = "test_api.db"
if os.path.exists(DB_PATH):
    os.remove(DB_PATH)
os.environ["DATABASE_URL"] = f"sqlite:///{DB_PATH}"
from fastapi.testclient import TestClient
from api.server import app

client = TestClient(app)

def test_learn_endpoint():
    resp = client.get("/learn", params={"topic": "python"})
    assert resp.status_code == 200
    assert "Python" in resp.json()["content"]


def test_submit_answer_and_progress():
    resp = client.get("/submit_answer", params={"user": "alice", "topic": "py", "score": 90})
    assert resp.status_code == 200
    assert resp.json()["status"] == "recorded"
    resp = client.get("/progress", params={"user": "alice"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["attempts"] == 1
    assert data["average_score"] == 90
