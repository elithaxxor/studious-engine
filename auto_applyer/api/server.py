from __future__ import annotations

from fastapi import FastAPI

from ..core.tracker import Tracker
from ..main import providers

app = FastAPI()
tracker = Tracker("sqlite:///applications.sqlite3")


@app.get("/apply")
def apply(provider: str, job_id: str):
    prov = providers[provider]
    prov.apply_to_job(job_id, resume="", cover_letter="")
    tracker.log_application(job_id, title="", company="", provider=provider)
    return {"status": "applied"}


@app.get("/status")
def status(job_id: str):
    return {"job_id": job_id}


@app.get("/history")
def history():
    return []
