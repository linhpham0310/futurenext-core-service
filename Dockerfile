# Dockerfile for NestJS Core Service

# ---- 1. Builder Stage ----
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

RUN npm run build

# ---- 2. Production Stage ----
FROM node:20-alpine AS production

WORKDIR /app

COPY package*.json ./

RUN npm ci --only=production && npm cache clean --force

COPY --from=builder /app/dist ./dist

ENV NODE_ENV production

EXPOSE ${PORT:-8080}

CMD ["node", "dist/main"]
