from abc import ABC, abstractmethod

class BaseProvider(ABC):
    @abstractmethod
    async def fetch_content(self, topic: str) -> str:
        """Fetch raw content for a given topic."""

    async def augment_content(self, content: str) -> str:
        """Optionally enrich the content."""
        return content
