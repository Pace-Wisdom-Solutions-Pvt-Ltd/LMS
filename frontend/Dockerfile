# SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
# SPDX-License-Identifier: Apache-2.0

# ── Frontend: Vite + React dev server ─────────────────────────────────────────
# Vite 7 requires Node 20.19+ or 22.12+.
FROM node:22-alpine

WORKDIR /app

# Install dependencies first so this layer is cached until the manifests change.
# package-lock.json is committed, so `npm ci` gives a reproducible install.
COPY package.json package-lock.json ./
RUN npm ci

# Source is bind-mounted over this in docker-compose for hot reload; the COPY
# keeps the image runnable on its own (e.g. `docker run`) without a mount.
COPY . .

EXPOSE 5173

# --host binds to 0.0.0.0 so the port is reachable from outside the container.
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
