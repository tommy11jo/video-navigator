FROM python:3.11-slim

WORKDIR /project

COPY pyproject.toml poetry.lock* ./
COPY ./app ./app

RUN pip install poetry && \
    poetry config virtualenvs.create false && \
    poetry install --no-interaction --no-ansi

COPY .env.production .env.production



EXPOSE 8080

CMD ["poetry", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]
