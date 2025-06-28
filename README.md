# Studious Engine

An AI-powered learning platform backend providing interactive content and quizzes.

## Setup

```bash
poetry install
cp .env.example .env
```

## Running

```bash
poetry run uvicorn api.server:app --reload
```

## CLI

```bash
poetry run studious-cli learn --topic python
```
