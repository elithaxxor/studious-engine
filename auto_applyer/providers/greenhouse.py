from __future__ import annotations

from typing import List

import requests
from bs4 import BeautifulSoup

from ..core.provider import BaseProvider, JobPosting


class GreenhouseProvider(BaseProvider):
    def __init__(self, base_url: str):
        self.base_url = base_url.rstrip('/')

    def search_jobs(self, query: str) -> List[JobPosting]:
        resp = requests.get(f"{self.base_url}/jobs", params={"term": query})
        soup = BeautifulSoup(resp.text, "html.parser")
        jobs = []
        for post in soup.select("div.opening"):  # Example selector
            link = post.find("a")
            if not link:
                continue
            url = self.base_url + link.get("href")
            title = link.get_text(strip=True)
            jobs.append(JobPosting(job_id=url, title=title, company="", url=url))
        return jobs

    def apply_to_job(self, job_id: str, resume: str, cover_letter: str) -> None:
        # Submit via HTTP requests if possible
        pass

    def supports_easy_apply(self) -> bool:
        return True
