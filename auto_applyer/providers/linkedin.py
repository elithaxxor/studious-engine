from __future__ import annotations

from typing import List

from playwright.sync_api import sync_playwright

from ..core.provider import BaseProvider, JobPosting


class LinkedInProvider(BaseProvider):
    def search_jobs(self, query: str) -> List[JobPosting]:
        # Placeholder: this would search LinkedIn using Playwright
        with sync_playwright() as p:
            browser = p.firefox.launch(headless=True)
            page = browser.new_page()
            page.goto(f"https://www.linkedin.com/jobs/search/?keywords={query}")
            jobs = []
            for elem in page.query_selector_all('a.result-card__full-card-link'):
                url = elem.get_attribute('href')
                title = elem.inner_text()
                jobs.append(JobPosting(job_id=url, title=title, company='', url=url))
            browser.close()
            return jobs

    def apply_to_job(self, job_id: str, resume: str, cover_letter: str) -> None:
        # Stub implementation
        pass

    def supports_easy_apply(self) -> bool:
        return True
