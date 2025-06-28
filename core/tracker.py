import os
import sqlite3
from typing import Dict

DB_URL = os.getenv("DATABASE_URL", "studious.db")
DB_PATH = DB_URL.split("///")[-1]
_conn = sqlite3.connect(DB_PATH, check_same_thread=False)
_cur = _conn.cursor()
_cur.execute(
    "CREATE TABLE IF NOT EXISTS quiz_attempts (id INTEGER PRIMARY KEY AUTOINCREMENT, user TEXT, topic TEXT, score INTEGER)"
)
_conn.commit()


def record_quiz_attempt(user_name: str, topic: str, score: int) -> None:
    """Record a user's quiz attempt."""
    _cur.execute(
        "INSERT INTO quiz_attempts (user, topic, score) VALUES (?, ?, ?)",
        (user_name, topic, score),
    )
    _conn.commit()


def get_user_stats(user_name: str) -> Dict[str, float]:
    """Return aggregate statistics for a user."""
    _cur.execute("SELECT score FROM quiz_attempts WHERE user = ?", (user_name,))
    rows = _cur.fetchall()
    if not rows:
        return {"attempts": 0, "average_score": 0}
    scores = [r[0] for r in rows]
    avg = sum(scores) / len(scores)
    return {"attempts": len(scores), "average_score": avg}
