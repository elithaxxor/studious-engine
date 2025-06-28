import httpx
from core.provider import BaseProvider

class WikiProvider(BaseProvider):
    async def fetch_content(self, topic: str) -> str:
        url = f"https://en.wikipedia.org/api/rest_v1/page/summary/{topic}"
        async with httpx.AsyncClient(timeout=5) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            data = resp.json()
            return data.get("extract", "")
