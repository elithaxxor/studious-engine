import os

DB_PATH = "test_cli.db"
if os.path.exists(DB_PATH):
    os.remove(DB_PATH)
os.environ["DATABASE_URL"] = f"sqlite:///{DB_PATH}"
from typer.testing import CliRunner
from cli import app

runner = CliRunner()


def test_submit_answer_and_progress_command():
    result = runner.invoke(app, ["submit-answer", "--user", "bob", "--topic", "py", "--score", "80"])
    assert "recorded" in result.output
    result = runner.invoke(app, ["progress", "--user", "bob"])
    assert "'attempts': 1" in result.output
    assert "'average_score': 80" in result.output
