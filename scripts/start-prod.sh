#!/bin/sh
# ==========================================================
# TASK: S5-CM-04 - AUTOMATED MIGRATION SCRIPT
# ==========================================================

set -e  # Dừng script nếu có lỗi

echo "🚀 Đang kiểm tra và áp dụng database migrations..."

# 1. Chạy lệnh migrate deploy (Chỉ áp dụng các file .sql mới trong prisma/migrations)
# Lệnh này an toàn cho môi trường Production
npx prisma migrate deploy

# 2. Kiểm tra nếu migration thành công thì mới khởi chạy ứng dụng
if [ $? -eq 0 ]; then
  echo "✅ Migration hoàn tất thành công!"
  echo "🎬 Khởi động ứng dụng NestJS..."
  npm run start:prod
else
  echo "❌ Migration thất bại! Vui lòng kiểm tra log database."
  exit 1
fi
