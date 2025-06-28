import asyncio
from engines.content_provider_files import FileProvider
from engines.content_provider_wiki import WikiProvider

def test_file_provider():
    provider = FileProvider(base_path="content")
    content = asyncio.run(provider.fetch_content("python"))
    assert "Python" in content


def test_wiki_provider(monkeypatch):
    class FakeResponse:
        def raise_for_status(self):
            pass
        def json(self):
            return {"extract": "Async summary"}

    class FakeClient:
        def __init__(self, *args, **kwargs):
            pass
        async def __aenter__(self):
            return self
        async def __aexit__(self, exc_type, exc, tb):
            pass
        async def get(self, url):
            return FakeResponse()

    monkeypatch.setattr("engines.content_provider_wiki.httpx.AsyncClient", FakeClient)
    provider = WikiProvider()
    content = asyncio.run(provider.fetch_content("python"))
    assert content == "Async summary"
