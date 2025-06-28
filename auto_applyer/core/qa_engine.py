from __future__ import annotations

import yaml
from pathlib import Path

from .llm_utils import extract_keywords


class QAEngine:
    def __init__(self, qa_file: Path):
        self.qa_map = yaml.safe_load(qa_file.read_text()) if qa_file.exists() else {}

    def answer(self, question: str) -> tuple[str, float]:
        normalized = question.lower().strip()
        if normalized in self.qa_map:
            return self.qa_map[normalized], 1.0
        # Fallback to LLM
        answer = "".join(extract_keywords(question))  # using keyword extractor as placeholder
        return answer, 0.5
