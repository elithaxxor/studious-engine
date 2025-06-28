from fastapi.testclient import TestClient
from api.server import app

client = TestClient(app)

def test_learn_endpoint():
    resp = client.get("/learn", params={"topic": "python"})
    assert resp.status_code == 200
    assert "Python" in resp.json()["content"]
