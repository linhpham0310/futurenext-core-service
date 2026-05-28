# Dockerfile for NestJS Core Service

# ---- 1. Builder Stage ----
FROM node:20-alpine AS builder

# Tăng timeout và retry
ENV NPM_CONFIG_FETCH_RETRIES=5
ENV NPM_CONFIG_FETCH_RETRY_MINTIMEOUT=20000
ENV NPM_CONFIG_FETCH_RETRY_MAXTIMEOUT=120000
ENV NPM_CONFIG_TIMEOUT=600000

WORKDIR /app

COPY package*.json ./

# Cache npm
RUN --mount=type=cache,target=/root/.npm \
    npm install --no-audit --no-fund

COPY . .

RUN npm run build

# ---- 2. Production Stage ----
FROM node:20-alpine AS production

ENV NODE_ENV production
ENV NPM_CONFIG_FETCH_RETRIES=5
ENV NPM_CONFIG_FETCH_RETRY_MINTIMEOUT=20000

WORKDIR /app

COPY package*.json ./

RUN --mount=type=cache,target=/root/.npm \
    npm install --only=production --no-audit --no-fund && \
    npm cache clean --force

COPY --from=builder /app/dist ./dist

EXPOSE ${PORT:-8080}

CMD ["node", "dist/main"]
