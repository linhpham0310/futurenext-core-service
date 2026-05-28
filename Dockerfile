# Dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

#  Đảm bảo PORT được expose
ENV PORT=8080
EXPOSE ${PORT}

#  Health check cho Cloud Run
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:${PORT}/health', (r) => {r.statusCode === 200 ? process.exit(0) : process.exit(1)})"

#  Chạy với node để có logs chi tiết
CMD ["node", "dist/main"]
