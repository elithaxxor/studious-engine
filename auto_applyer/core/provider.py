from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import List


@dataclass
class JobPosting:
    job_id: str
    title: str
    company: str
    url: str


class BaseProvider(ABC):
    """Abstract base provider."""

    @abstractmethod
    def search_jobs(self, query: str) -> List[JobPosting]:
        """Return a list of job postings for the query."""

    @abstractmethod
    def apply_to_job(self, job_id: str, resume: str, cover_letter: str) -> None:
        """Submit an application to the given job."""

    @abstractmethod
    def supports_easy_apply(self) -> bool:
        """Return True if provider supports easy apply."""
