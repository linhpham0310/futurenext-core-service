# Dockerfile for NestJS Core Service

# ---- 1. Builder Stage ----
FROM node:20-alpine AS builder

# Tăng timeout cho npm
ENV NPM_CONFIG_FETCH_RETRIES=5
ENV NPM_CONFIG_FETCH_RETRY_MINTIMEOUT=20000
ENV NPM_CONFIG_FETCH_RETRY_MAXTIMEOUT=120000

WORKDIR /app

COPY package*.json ./

RUN npm ci --no-audit --no-fund --verbose || \
    npm ci --no-audit --no-fund --verbose || \
    npm install --no-audit --no-fund

COPY . .

RUN npm run build

# ---- 2. Production Stage ----
FROM node:20-alpine AS production

WORKDIR /app

COPY package*.json ./

RUN npm ci --omit=dev --no-audit --no-fund --verbose && \
    npm cache clean --force

COPY --from=builder /app/dist ./dist

ENV NODE_ENV production
ENV PORT=8080

EXPOSE ${PORT}

CMD ["node", "dist/main"]
