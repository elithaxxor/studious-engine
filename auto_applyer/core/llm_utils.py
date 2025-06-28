from __future__ import annotations

import os
from typing import List

import openai
from jinja2 import Template

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
openai.api_key = OPENAI_API_KEY


def extract_keywords(job_description: str) -> List[str]:
    prompt = (
        "Extract the top 5 keywords or skills from the following job description as a comma separated list:\n" + job_description
    )
    response = openai.ChatCompletion.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": prompt}],
    )
    text = response.choices[0].message["content"]
    return [k.strip() for k in text.split(",") if k.strip()]


def tailor_resume(resume: str, keywords: List[str]) -> str:
    kw_str = ", ".join(keywords)
    prompt = f"Tailor the following resume to emphasize these keywords: {kw_str}\nResume:\n{resume}"
    response = openai.ChatCompletion.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": prompt}],
    )
    return response.choices[0].message["content"]


def generate_cover_letter(job_description: str, resume: str, template_str: str) -> str:
    template = Template(template_str)
    keywords = ", ".join(extract_keywords(job_description))
    prompt = template.render(job_description=job_description, resume=resume, keywords=keywords)
    response = openai.ChatCompletion.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": prompt}],
    )
    return response.choices[0].message["content"]
