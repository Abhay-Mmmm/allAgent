FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system build dependencies (needed for asyncpg C extension)
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
    gcc \
    python3-dev \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies first (layer cache optimisation)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source
COPY . .

# Expose FastAPI port
EXPOSE 8000

# Railway sets PORT env var — use it if present, default to 8000
ENV PORT=8000

# Start: run migrations then launch uvicorn with multiple workers
# --workers 1 is fine for Railway's single-instance plan;
# increase to 2-4 if you upgrade to a multi-core plan.
CMD alembic upgrade head && \
    uvicorn app.main:app \
    --host 0.0.0.0 \
    --port ${PORT} \
    --workers 1 \
    --log-level info
