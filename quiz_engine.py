import os
import asyncio
from typing import Dict, Tuple
import openai


CACHE_SIZE = int(os.getenv("CACHE_SIZE", 128))
RATE_LIMIT = int(os.getenv("RATE_LIMIT", 5))
_semaphore = asyncio.Semaphore(RATE_LIMIT)

# Simple async-aware in-memory cache
_cache: Dict[Tuple[str, int], str] = {}
_cache_lock = asyncio.Lock()

async def clear_cache() -> None:
    """Clear the quiz cache."""
    async with _cache_lock:
        _cache.clear()

async def generate_quiz(summary: str, n_questions: int = 3):
    key = (summary, n_questions)
    async with _cache_lock:
        if key in _cache:
            return _cache[key]

    prompt = (
        f"Generate {n_questions} multiple choice questions with answers based on the following text:\n{summary}"
    )
    async with _semaphore:
        resp = openai.ChatCompletion.create(model="gpt-3.5-turbo", messages=[{"role":"user","content":prompt}])
    content = resp.choices[0].message['content']

    async with _cache_lock:
        if len(_cache) >= CACHE_SIZE:
            # drop the first inserted item (FIFO) when cache is full
            _cache.pop(next(iter(_cache)))
        _cache[key] = content

    return content
