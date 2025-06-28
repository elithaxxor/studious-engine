FROM python:3.10-slim
WORKDIR /app
COPY auto_applyer/pyproject.toml ./
RUN pip install poetry && poetry config virtualenvs.create false && poetry install --no-interaction --no-root
COPY auto_applyer ./auto_applyer
CMD ["python", "-m", "auto_applyer.main"]
