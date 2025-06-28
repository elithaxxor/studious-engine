from __future__ import annotations

from typing import List

import requests
from bs4 import BeautifulSoup

from ..core.provider import BaseProvider, JobPosting


class IndeedProvider(BaseProvider):
    BASE_URL = "https://www.indeed.com/jobs"

    def search_jobs(self, query: str) -> List[JobPosting]:
        resp = requests.get(self.BASE_URL, params={"q": query})
        soup = BeautifulSoup(resp.text, "html.parser")
        jobs = []
        for card in soup.select("a.tapItem"):
            url = "https://www.indeed.com" + card.get("href")
            title = card.select_one("h2.jobTitle").get_text(strip=True)
            company_el = card.select_one("span.companyName")
            company = company_el.get_text(strip=True) if company_el else ""
            jobs.append(JobPosting(job_id=url, title=title, company=company, url=url))
        return jobs

    def apply_to_job(self, job_id: str, resume: str, cover_letter: str) -> None:
        # Indeed typically redirects to the employer site; stub
        pass

    def supports_easy_apply(self) -> bool:
        return False
