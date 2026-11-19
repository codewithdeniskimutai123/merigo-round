
FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# Install Python dependencies
COPY requirements.txt .

RUN pip install --upgrade pip \
    && pip install -r requirements.txt

# Copy the Django application
COPY . .

# Create a non-root user
RUN adduser --disabled-password --gecos "" appuser \
    && chown -R appuser:appuser /app

USER appuser

EXPOSE 8000

# Start Django using Gunicorn
CMD ["sh", "-c", "echo 'STEP 1: Starting database migrations...' && python manage.py migrate --noinput && echo 'STEP 2: Database migrations completed.' && echo 'STEP 3: Collecting static files...' && python manage.py collectstatic --noinput && echo 'STEP 4: Static files collected.' && echo 'STEP 5: Starting Gunicorn on port ${PORT:-8000}...' && exec gunicorn config.wsgi:application --bind 0.0.0.0:${PORT:-8000} --workers 2 --threads 4 --timeout 120"]
