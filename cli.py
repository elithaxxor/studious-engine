import typer
import asyncio
from engines.content_provider_wiki import WikiProvider
from engines.content_provider_files import FileProvider
from quiz_engine import generate_quiz

app = typer.Typer()
file_provider = FileProvider()
wiki_provider = WikiProvider()

@app.command()
def learn(topic: str):
    """Fetch content for a topic."""
    content = asyncio.run(_get_content(topic))
    typer.echo(content)

@app.command()
def quiz(topic: str):
    """Generate quiz for a topic."""
    summary = asyncio.run(_get_content(topic))
    q = asyncio.run(generate_quiz(summary))
    typer.echo(q)

async def _get_content(topic: str) -> str:
    try:
        return await file_provider.fetch_content(topic)
    except FileNotFoundError:
        return await wiki_provider.fetch_content(topic)

if __name__ == "__main__":
    app()
