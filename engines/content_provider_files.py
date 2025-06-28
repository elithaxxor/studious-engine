import os
from core.provider import BaseProvider

class FileProvider(BaseProvider):
    def __init__(self, base_path: str = "content"):
        self.base_path = base_path

    async def fetch_content(self, topic: str) -> str:
        for ext in (".md", ".html", ".txt"):
            path = os.path.join(self.base_path, topic + ext)
            if os.path.exists(path):
                with open(path, "r", encoding="utf-8") as f:
                    return f.read()
        raise FileNotFoundError(f"No content for {topic}")
