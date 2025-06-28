from fastapi import FastAPI
from engines.content_provider_wiki import WikiProvider
from engines.content_provider_files import FileProvider
from quiz_engine import generate_quiz

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
