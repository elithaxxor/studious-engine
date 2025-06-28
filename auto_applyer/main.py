from __future__ import annotations

import typer
from .core.tracker import Tracker
from .providers.linkedin import LinkedInProvider
from .providers.indeed import IndeedProvider
from .providers.greenhouse import GreenhouseProvider

app = typer.Typer()

DB_URL = "sqlite:///applications.sqlite3"
tracker = Tracker(DB_URL)

providers = {
    "linkedin": LinkedInProvider(),
    "indeed": IndeedProvider(),
    "greenhouse": GreenhouseProvider("https://boards.greenhouse.io"),
}


@app.command()
def search(provider: str, query: str):
    prov = providers[provider]
    jobs = prov.search_jobs(query)
    for job in jobs:
        typer.echo(f"{job.title} at {job.company} - {job.url}")


@app.command()
def apply(provider: str, job_id: str):
    prov = providers[provider]
    prov.apply_to_job(job_id, resume="", cover_letter="")
    typer.echo("Applied")


if __name__ == "__main__":
    app()
