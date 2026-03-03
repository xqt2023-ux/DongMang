# DongMang 服务端完整部署指南（Ubuntu 22.04）

> 目标：在一台 Linux 服务器上部署完整系统（Frontend + Backend + AI Service），并通过 Nginx 对外提供统一入口。

## 0. 一键脚本（推荐）

仓库已提供可直接使用的脚本与模板：

- 部署脚本：`scripts/deploy-ubuntu.sh`
- 备份脚本：`scripts/backup-dongmang.sh`
- systemd 模板：`scripts/systemd/*.service`
- Nginx 模板：`scripts/nginx/dongmang.http.conf`、`scripts/nginx/dongmang.https.conf`

首次部署建议：

```bash
cd /opt/dongmang
bash scripts/deploy-ubuntu.sh \
    REPO_URL=https://github.com/your-org/dongmang.git \
    DOMAIN=your-domain.com
```

备份建议（可加入 crontab）：

```bash
bash /opt/dongmang/scripts/backup-dongmang.sh
```

### 0.1 代码在本地时，如何放到远程服务器

你有两种方式：

1) **推荐：先推到 Git 仓库，再在服务器拉取**

```bash
# 本地
git remote add origin <你的仓库地址>
git push -u origin main

# 服务器
REPO_URL=<你的仓库地址> bash scripts/deploy-ubuntu.sh
```

2) **无 Git：直接上传代码目录到服务器**

Windows PowerShell 示例（本地执行）：

```powershell
scp -r D:\code\DongMang user@<服务器IP>:/opt/dongmang
```

服务器上执行：

```bash
cd /opt/dongmang
bash scripts/deploy-ubuntu.sh DOMAIN=<你的域名或服务器IP>
```

> 说明：`deploy-ubuntu.sh` 已支持“本地上传代码模式”，即不传 `REPO_URL` 也可部署。

## 1. 安装包清单（系统级）

```bash
sudo apt update
sudo apt install -y \
  git curl wget unzip \
  build-essential pkg-config \
  python3 python3-venv python3-pip \
  ffmpeg \
  sqlite3 libsqlite3-dev \
  nginx
```

### 为什么这些包必须装
- `ffmpeg`：AI 服务的视频拼接（`/ai/video/synthesize`）强依赖。
- `build-essential` + `libsqlite3-dev`：`backend` 的 `better-sqlite3` 需要本地编译。
- `python3-venv`：AI 服务建议使用独立虚拟环境。
- `nginx`：前端静态文件托管 + `/api`、`/ai` 反向代理。

## 2. 运行时版本要求

- Node.js >= 18（建议 Node.js 20 LTS）
- Python >= 3.10（建议 Python 3.11）

安装 Node.js 20（NodeSource）：

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v
npm -v
```

## 3. 拉取代码与目录约定

```bash
sudo mkdir -p /opt/dongmang
sudo chown -R $USER:$USER /opt/dongmang
cd /opt/dongmang
git clone <你的仓库地址> .
```

后续默认以 `/opt/dongmang` 为项目根目录。

## 4. 部署 AI Service（FastAPI）

```bash
cd /opt/dongmang/ai-service
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
cp .env.example .env
```

编辑 `.env`（至少配置这些）：

```dotenv
AI_PROVIDER=babelark
BABELARK_API_KEY=sk-xxxx
BABELARK_BASE_URL=https://api.babelark.com
BABELARK_TEXT_MODEL=gemini-3-flash-preview
BABELARK_IMAGE_MODEL=gemini-3-pro-image-preview
BABELARK_FALLBACK_TEXT_MODELS=gemini-2.5-flash,deepseek-v3.1
BABELARK_FALLBACK_IMAGE_MODELS=doubao-seedream-4-5,gemini-2.5-flash-image
BABELARK_VIDEO_MODEL=doubao-seedance-1-5-pro
BABELARK_VIDEO_MODEL_ALI=wan2.6-i2v
PORT=8000
```

本地验证：

```bash
source /opt/dongmang/ai-service/.venv/bin/activate
cd /opt/dongmang/ai-service
python -m app.main
# 健康检查
curl http://127.0.0.1:8000/ai/health
```

## 5. 部署 Backend（NestJS）

```bash
cd /opt/dongmang/backend
npm install
npm run build
```

生产启动端口（默认 4000，可改）：

```bash
PORT=4000 npm run start:prod
# 健康可用性（示例）
curl http://127.0.0.1:4000/api/projects
```

持久化说明：
- SQLite 数据库路径：`/opt/dongmang/backend/data/dongmang.sqlite`
- 请确保 `backend/data` 可写并纳入备份。

## 6. 部署 Frontend（Vite）

```bash
cd /opt/dongmang/frontend
npm install
npm run build
```

构建产物在：`/opt/dongmang/frontend/dist`

## 7. 使用 systemd 托管（推荐）

### 7.1 AI Service
创建 `/etc/systemd/system/dongmang-ai.service`：

```ini
[Unit]
Description=DongMang AI Service (FastAPI)
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/dongmang/ai-service
Environment="PATH=/opt/dongmang/ai-service/.venv/bin"
ExecStart=/opt/dongmang/ai-service/.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
```

### 7.2 Backend
创建 `/etc/systemd/system/dongmang-backend.service`：

```ini
[Unit]
Description=DongMang Backend (NestJS)
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/dongmang/backend
Environment="NODE_ENV=production"
Environment="PORT=4000"
ExecStart=/usr/bin/node /opt/dongmang/backend/dist/main.js
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
```

启用并启动：

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now dongmang-ai
sudo systemctl enable --now dongmang-backend
sudo systemctl status dongmang-ai --no-pager
sudo systemctl status dongmang-backend --no-pager
```

## 8. Nginx 统一入口配置

创建 `/etc/nginx/sites-available/dongmang.conf`：

```nginx
server {
    listen 80;
    server_name _;

    client_max_body_size 100m;

    root /opt/dongmang/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:4000/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /ai/ {
        proxy_pass http://127.0.0.1:8000/ai/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_connect_timeout 30s;
        proxy_send_timeout 600s;
        proxy_read_timeout 600s;
    }
}
```

启用站点：

```bash
sudo ln -sf /etc/nginx/sites-available/dongmang.conf /etc/nginx/sites-enabled/dongmang.conf
sudo nginx -t
sudo systemctl reload nginx
```

## 9. 首次联调检查

```bash
# 前端页面
curl -I http://127.0.0.1/

# Backend
curl http://127.0.0.1/api/docs

# AI 服务
curl http://127.0.0.1/ai/health
curl http://127.0.0.1/ai/video/health
```

## 10. 常见问题

1) `服务端未安装 ffmpeg`
- 处理：`sudo apt install -y ffmpeg`

2) `better-sqlite3` 安装失败
- 处理：确认安装 `build-essential` 与 `libsqlite3-dev`，并使用 Node.js 20 LTS。

3) 视频合成超时
- 已在前端请求与后端下载环节做过超时优化；生产上请确保 Nginx `proxy_read_timeout` 不小于 `600s`。

4) 端口不一致
- 当前代码默认后端端口 `4000`，AI 端口 `8000`；生产建议全部通过 Nginx 统一入口，不直接暴露内部端口。

## 11. 升级发布流程（建议）

```bash
cd /opt/dongmang
git pull

cd backend && npm install && npm run build
cd /opt/dongmang/frontend && npm install && npm run build
cd /opt/dongmang/ai-service && source .venv/bin/activate && pip install -r requirements.txt

sudo systemctl restart dongmang-backend
sudo systemctl restart dongmang-ai
sudo systemctl reload nginx
```

---

如果你希望，我可以下一步直接给你：
- 一份 `deploy.sh`（一键安装 + 构建 + 重启）
- 一份 `backup.sh`（自动备份 SQLite + AI 生成文件）
- HTTPS（Let’s Encrypt）配置版本的 Nginx 模板
