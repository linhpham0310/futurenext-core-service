# TASK S5-CM-02: Dockerize NestJS Application
# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci
COPY . .
# Tạo Prisma Client (Task S1-CM-01 kế thừa)
RUN npx prisma generate
RUN npm run build

# Stage 2: Runner
FROM node:20-alpine

WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma
# TASK S5-CM-04: Copy thêm thư mục scripts để chạy migration
COPY --from=builder /app/scripts ./scripts

# Cấp quyền thực thi cho script
RUN chmod +x ./scripts/start-prod.sh

EXPOSE 8080

# TASK S5-CM-04: Thay đổi lệnh khởi chạy
ENTRYPOINT ["./scripts/start-prod.sh"]
