import os
from functools import lru_cache
import asyncio
import openai

CACHE_SIZE = int(os.getenv("CACHE_SIZE", 128))
RATE_LIMIT = int(os.getenv("RATE_LIMIT", 5))
_semaphore = asyncio.Semaphore(RATE_LIMIT)

@lru_cache(maxsize=CACHE_SIZE)
async def generate_quiz(summary: str, n_questions: int = 3):
    prompt = (
        f"Generate {n_questions} multiple choice questions with answers based on the following text:\n{summary}"
    )
    async with _semaphore:
        resp = openai.ChatCompletion.create(model="gpt-3.5-turbo", messages=[{"role":"user","content":prompt}])
    content = resp.choices[0].message['content']
    return content
