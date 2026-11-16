FROM python:3.12-slim

WORKDIR /app

# Install dependencies first so Docker can reuse this step when only code changes.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY src ./src

# Shell form so ${PORT} (set by Railway) is filled in; 8000 when running locally.
CMD uvicorn src.main:app --host 0.0.0.0 --port ${PORT:-8000}
