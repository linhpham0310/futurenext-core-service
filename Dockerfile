# Stage 1: Build
FROM node:20-slim AS builder

WORKDIR /app

# Cài OpenSSL cho Prisma
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build

# Stage 2: Runner
FROM node:20-slim

WORKDIR /app

# Cài OpenSSL cho Prisma runtime
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/scripts ./scripts

RUN chmod +x ./scripts/start-prod.sh

EXPOSE 8080

ENTRYPOINT ["./scripts/start-prod.sh"]
