#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/dongmang}"
DOMAIN="${DOMAIN:-_}"
REPO_URL="${REPO_URL:-}"
APP_USER="${APP_USER:-www-data}"
BACKEND_PORT="${BACKEND_PORT:-4000}"
AI_PORT="${AI_PORT:-8000}"

echo "[1/10] 安装系统依赖..."
sudo apt update
sudo apt install -y \
  git curl wget unzip \
  build-essential pkg-config \
  python3 python3-venv python3-pip \
  ffmpeg sqlite3 libsqlite3-dev \
  nginx

echo "[2/10] 安装 Node.js 20..."
if ! command -v node >/dev/null 2>&1 || [[ "$(node -v | sed 's/v//' | cut -d. -f1)" -lt 18 ]]; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt install -y nodejs
fi

echo "[3/10] 准备目录..."
sudo mkdir -p "$APP_DIR"
sudo chown -R "$USER":"$USER" "$APP_DIR"

if [[ -d "$APP_DIR/.git" ]]; then
  echo "[4/10] 更新代码..."
  git -C "$APP_DIR" pull --ff-only
else
  if [[ -n "$REPO_URL" ]]; then
    echo "[4/10] 首次拉取代码..."
    git clone "$REPO_URL" "$APP_DIR"
  elif [[ -d "$APP_DIR/frontend" && -d "$APP_DIR/backend" && -d "$APP_DIR/ai-service" ]]; then
    echo "[4/10] 检测到本地上传代码，跳过 git clone/pull"
  else
    echo "[ERROR] 未检测到可用代码。请执行以下任一方案："
    echo "1) 传入 REPO_URL 后重试"
    echo "2) 先将本地工程上传到 $APP_DIR（需包含 frontend/backend/ai-service）"
    exit 1
  fi
fi

cd "$APP_DIR"

echo "[5/10] 配置 AI Service..."
cd "$APP_DIR/ai-service"
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
pip install -r requirements.txt
if [[ ! -f .env ]]; then
  cp .env.example .env
  echo "[WARN] 已创建 ai-service/.env，请手动填入 BABELARK_API_KEY 后再继续使用 AI 功能"
fi

echo "[6/10] 构建 Backend..."
cd "$APP_DIR/backend"
npm install
npm run build
mkdir -p data


echo "[7/10] 构建 Frontend..."
cd "$APP_DIR/frontend"
npm install
npm run build

echo "[8/10] 安装 systemd 服务..."
sudo cp "$APP_DIR/scripts/systemd/dongmang-ai.service" /etc/systemd/system/dongmang-ai.service
sudo cp "$APP_DIR/scripts/systemd/dongmang-backend.service" /etc/systemd/system/dongmang-backend.service
sudo sed -i "s#__APP_DIR__#$APP_DIR#g" /etc/systemd/system/dongmang-ai.service
sudo sed -i "s#__APP_DIR__#$APP_DIR#g" /etc/systemd/system/dongmang-backend.service
sudo sed -i "s#__APP_USER__#$APP_USER#g" /etc/systemd/system/dongmang-ai.service
sudo sed -i "s#__APP_USER__#$APP_USER#g" /etc/systemd/system/dongmang-backend.service
sudo sed -i "s#__AI_PORT__#$AI_PORT#g" /etc/systemd/system/dongmang-ai.service
sudo sed -i "s#__BACKEND_PORT__#$BACKEND_PORT#g" /etc/systemd/system/dongmang-backend.service

sudo systemctl daemon-reload
if ! sudo systemctl enable --now dongmang-ai; then
  echo "[ERROR] dongmang-ai 启动失败，请执行："
  echo "sudo journalctl -u dongmang-ai -n 100 --no-pager"
  exit 1
fi
if ! sudo systemctl enable --now dongmang-backend; then
  echo "[ERROR] dongmang-backend 启动失败，请执行："
  echo "sudo journalctl -u dongmang-backend -n 100 --no-pager"
  exit 1
fi

echo "[9/10] 配置 Nginx..."
sudo cp "$APP_DIR/scripts/nginx/dongmang.http.conf" /etc/nginx/sites-available/dongmang.conf
sudo sed -i "s#__APP_DIR__#$APP_DIR#g" /etc/nginx/sites-available/dongmang.conf
sudo sed -i "s#__DOMAIN__#$DOMAIN#g" /etc/nginx/sites-available/dongmang.conf
sudo sed -i "s#__AI_PORT__#$AI_PORT#g" /etc/nginx/sites-available/dongmang.conf
sudo sed -i "s#__BACKEND_PORT__#$BACKEND_PORT#g" /etc/nginx/sites-available/dongmang.conf
sudo ln -sf /etc/nginx/sites-available/dongmang.conf /etc/nginx/sites-enabled/dongmang.conf
sudo nginx -t
sudo systemctl reload nginx

echo "[10/10] 部署完成，健康检查："
echo "- Frontend: http://$(hostname -I | awk '{print $1}')/"
echo "- Backend Docs: http://$(hostname -I | awk '{print $1}')/api/docs"
echo "- AI Health: http://$(hostname -I | awk '{print $1}')/ai/health"

echo "\n[提示] 如需 HTTPS，请参考 scripts/nginx/dongmang.https.conf 并执行 certbot 配置证书。"
