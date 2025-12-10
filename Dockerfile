# ======================
# 1) Build stage
# ======================
FROM node:20-bookworm-slim AS builder

WORKDIR /app

# System deps for node-canvas / node-gyp
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
  && rm -rf /var/lib/apt/lists/*

# Copy package files and install deps
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# ======================
# 2) Production stage
# ======================
FROM node:20-bookworm-slim

WORKDIR /app

# Runtime libs + Chromium for Puppeteer
RUN apt-get update && apt-get install -y --no-install-recommends \
    libcairo2 \
    libpango-1.0-0 \
    libjpeg62-turbo \
    libgif7 \
    librsvg2-2 \
    chromium \
    fonts-noto-color-emoji \
  && rm -rf /var/lib/apt/lists/*

# 👉 Скажем Puppeteer, где лежит браузер
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV PUPPETEER_SKIP_DOWNLOAD=true

# Copy app + node_modules from builder
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

# Create non-root user
RUN groupadd -g 1001 nodejs && \
    useradd -m -u 1001 -g nodejs nodejs

RUN chown -R nodejs:nodejs /app
USER nodejs

# EXPOSE 3000

CMD ["node", "dist/index.js"]
