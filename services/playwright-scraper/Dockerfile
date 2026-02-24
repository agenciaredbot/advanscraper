FROM mcr.microsoft.com/playwright:v1.50.0-noble

WORKDIR /app

# Copy package files first for layer caching
COPY package.json package-lock.json* ./

# Skip browser download — base image already has Chromium
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

# Install ALL deps (including typescript for build), then compile, then prune
RUN npm ci
COPY tsconfig.json ./
COPY src/ ./src/
RUN npx tsc
RUN npm prune --omit=dev

# Runtime config
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

# Memory optimization for 1GB Railway container
ENV NODE_OPTIONS="--max-old-space-size=512"

CMD ["node", "dist/server.js"]
