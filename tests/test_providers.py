import asyncio
from engines.content_provider_files import FileProvider

def test_file_provider():
    provider = FileProvider(base_path="content")
    content = asyncio.run(provider.fetch_content("python"))
    assert "Python" in content
