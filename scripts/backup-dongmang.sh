#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/dongmang}"
BACKUP_DIR="${BACKUP_DIR:-/opt/dongmang-backups}"
KEEP_DAYS="${KEEP_DAYS:-14}"
NOW="$(date +%Y%m%d-%H%M%S)"
TARGET="$BACKUP_DIR/dongmang-$NOW"

mkdir -p "$TARGET"

echo "[1/4] 备份 SQLite 数据库..."
if [[ -f "$APP_DIR/backend/data/dongmang.sqlite" ]]; then
  cp "$APP_DIR/backend/data/dongmang.sqlite" "$TARGET/dongmang.sqlite"
else
  echo "[WARN] 未找到数据库文件: $APP_DIR/backend/data/dongmang.sqlite"
fi

echo "[2/4] 备份 AI 生成文件..."
if [[ -d "$APP_DIR/ai-service/generated" ]]; then
  tar -czf "$TARGET/ai-generated.tar.gz" -C "$APP_DIR/ai-service" generated
else
  echo "[WARN] 未找到目录: $APP_DIR/ai-service/generated"
fi

echo "[3/4] 备份关键配置..."
if [[ -f "$APP_DIR/ai-service/.env" ]]; then
  cp "$APP_DIR/ai-service/.env" "$TARGET/ai-service.env"
fi
if [[ -f "/etc/nginx/sites-available/dongmang.conf" ]]; then
  sudo cp "/etc/nginx/sites-available/dongmang.conf" "$TARGET/nginx-dongmang.conf"
  sudo chown "$USER":"$USER" "$TARGET/nginx-dongmang.conf"
fi

echo "[4/4] 打包与清理..."
mkdir -p "$BACKUP_DIR/archive"
tar -czf "$BACKUP_DIR/archive/dongmang-$NOW.tar.gz" -C "$BACKUP_DIR" "dongmang-$NOW"
rm -rf "$TARGET"

find "$BACKUP_DIR/archive" -type f -name 'dongmang-*.tar.gz' -mtime +"$KEEP_DAYS" -delete

echo "备份完成: $BACKUP_DIR/archive/dongmang-$NOW.tar.gz"
