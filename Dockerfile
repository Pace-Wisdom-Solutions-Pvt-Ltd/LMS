# SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
# SPDX-License-Identifier: Apache-2.0

# Backend API image only. The frontend (frontend/) is a separate Vite SPA
# deployed independently — see frontend/README.md.
FROM python:3.14-slim

LABEL org.opencontainers.image.licenses="Apache-2.0"

# System dependencies: PostgreSQL client libraries and build tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --system app \
    && useradd --system --create-home --gid app app

WORKDIR /app

# Copy and install Python dependencies first (layer caching)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy only the project files needed at runtime.
COPY LICENSE NOTICE ./
COPY manage.py ./
COPY lms_core ./lms_core
COPY accounts ./accounts
COPY analytics ./analytics
COPY curriculum ./curriculum
COPY gamification ./gamification
COPY organizations ./organizations
COPY rbac ./rbac
COPY settings ./settings

# Collect static files directory, plus the uploads directory. Creating media/
# here (owned by app) makes a fresh media_data volume inherit that ownership,
# otherwise Docker creates it root-owned and every upload fails.
RUN mkdir -p /app/staticfiles /app/media && chown -R app:app /app/staticfiles /app/media

USER app

EXPOSE 8000

CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
