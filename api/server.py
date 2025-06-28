from fastapi import FastAPI
from engines.content_provider_wiki import WikiProvider
from engines.content_provider_files import FileProvider
from quiz_engine import generate_quiz
from core.tracker import record_quiz_attempt, get_user_stats

app = FastAPI()
wiki_provider = WikiProvider()
file_provider = FileProvider()

@app.get("/learn")
async def learn(topic: str):
    try:
        content = await file_provider.fetch_content(topic)
    except FileNotFoundError:
        content = await wiki_provider.fetch_content(topic)
    return {"content": content}

@app.get("/quiz")
async def quiz(topic: str):
    try:
        summary = await file_provider.fetch_content(topic)
    except FileNotFoundError:
        summary = await wiki_provider.fetch_content(topic)
    quiz = await generate_quiz(summary)
    return {"quiz": quiz}


@app.get("/submit_answer")
async def submit_answer(user: str, topic: str, score: int):
    """Record a quiz attempt for a user."""
    record_quiz_attempt(user, topic, score)
    return {"status": "recorded"}


@app.get("/progress")
async def progress(user: str):
    """Return progress statistics for a user."""
    return get_user_stats(user)
