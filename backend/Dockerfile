# Slim single-stage image; runs Uvicorn as a non-root user.
FROM python:3.12-slim AS base

# Keep Python lean and predictable inside containers.
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# System deps: libpq for psycopg2, curl for the container healthcheck.
RUN apt-get update \
    && apt-get install -y --no-install-recommends libpq5 curl \
    && rm -rf /var/lib/apt/lists/*

# Install deps first so this layer caches when only app code changes.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code.
COPY app ./app

# Run as an unprivileged user.
RUN adduser --disabled-password --gecos "" appuser \
    && chown -R appuser:appuser /app
USER appuser

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=5 \
    CMD curl -fsS http://127.0.0.1:8000/health || exit 1

# `sh -c` so the platform-provided $PORT (Render/Railway/Fly) is honoured,
# falling back to 8000 for local/Docker Compose use.
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
