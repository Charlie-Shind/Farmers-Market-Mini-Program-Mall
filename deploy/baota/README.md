# 宝塔部署指南（农谷仓 Farm）

本文档说明如何将 **后端（NestJS）** 和 **管理后台（Vue）** 部署到宝塔面板。

## 一、服务器准备

### 1. 宝塔软件安装

在宝塔「软件商店」安装：

| 软件 | 版本建议 | 用途 |
|------|----------|------|
| Nginx | 最新稳定版 | 反向代理 + 静态站点 |
| Node.js 版本管理器 | - | 运行后端（建议 Node 20+） |
| PostgreSQL | 16 | 主数据库 |
| Redis | 7 | 缓存 |
| PM2 管理器 | - | 守护后端进程（可选，也可用宝塔 Node 项目） |

### 2. 创建数据库

1. 宝塔 → **数据库** → **添加数据库**
2. 数据库名：`farm`
3. 用户名：`farm`
4. 记下密码，后面写入 `DATABASE_URL`

### 3. 目录规划（推荐）

```
/www/wwwroot/farm/
├── backend/          # 后端（NestJS）
├── admin/            # 管理后台静态文件
└── uploads/          # 上传文件（可选，与 backend/.env 中 UPLOAD_DIR 一致）
```

---

## 二、本地打包

在项目根目录执行：

```powershell
powershell -ExecutionPolicy Bypass -File deploy/scripts/build-release.ps1
```

完成后会生成：

- `release/backend/` — 后端部署包
- `release/admin/` — 管理后台静态文件
- `release-backend-时间戳.zip`
- `release-admin-时间戳.zip`

---

## 三、上传文件

### 方式 A：宝塔文件管理器

1. 将 `release-backend-xxx.zip` 上传到 `/www/wwwroot/farm/`，解压为 `backend/`
2. 将 `release-admin-xxx.zip` 上传到 `/www/wwwroot/farm/`，解压为 `admin/`

### 方式 B：SFTP

用 FileZilla / WinSCP 上传 `release/backend` 和 `release/admin` 两个文件夹。

---

## 四、部署后端

### 1. SSH 进入服务器

```bash
cd /www/wwwroot/farm/backend
```

### 2. 安装生产依赖

```bash
npm ci --omit=dev
```

> 若 `npm ci` 失败，可改用 `npm install --omit=dev`

### 3. 配置环境变量

```bash
cp .env.example .env
nano .env   # 或用宝塔文件编辑器
```

**必须修改的项：**

- `DATABASE_URL` — PostgreSQL 连接串
- `REDIS_URL` — Redis 连接串
- `JWT_SECRET` — 随机长字符串
- `CORS_ALLOWED_ORIGINS` — 管理后台访问域名，如 `https://admin.example.com`
- `WECHAT_MINI_PROGRAM_SECRET` — 微信小程序密钥

### 4. 数据库迁移

```bash
npx prisma migrate deploy
```

可选：初始化种子数据（仅首次测试环境）

```bash
npx prisma db seed
```

### 5. 创建上传目录

```bash
mkdir -p /www/wwwroot/farm/backend/uploads
chmod 755 /www/wwwroot/farm/backend/uploads
```

### 6. 启动后端

**方式 A：PM2（推荐）**

```bash
# 修改 ecosystem.config.cjs 中的 cwd 路径后
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

**方式 B：宝塔 Node 项目**

1. 宝塔 → **网站** → **Node 项目** → **添加项目**
2. 项目路径：`/www/wwwroot/farm/backend`
3. 启动文件：`dist/main.js`
4. 端口：`6002`
5. 运行环境：生产

### 7. 验证后端

```bash
curl http://127.0.0.1:6002/api/identity/auth/status
```

应返回 JSON，`success: true`。

---

## 五、部署管理后台

管理后台是 **纯静态文件**，构建产物已在 `release/admin/`。

### 1. 确认文件结构

```
/www/wwwroot/farm/admin/
├── index.html
└── assets/
```

### 2. 创建网站

1. 宝塔 → **网站** → **添加站点**
2. 域名：`admin.你的域名.com`
3. 根目录：`/www/wwwroot/farm/admin`
4. PHP 选「纯静态」

### 3. 配置 Nginx

在站点配置中参考 `nginx.example.conf`，核心是：

- `/admin/` → 前端静态文件 + `try_files` 回退到 `index.html`
- `/api/` → 反向代理到 `http://127.0.0.1:6002`

保存后重载 Nginx。

### 4. 访问测试

浏览器打开：

```
https://admin.你的域名.com/admin/
```

---

## 六、小程序 API 配置

小程序 `wxapp/miniprogram/config/env.config.js` 中，将 `prod` 地址改为你的 API 域名：

```js
exports.API_BASE_URLS = {
  dev: 'http://124.223.108.180:6002/api',
  test: 'https://api.你的域名.com/api',
  prod: 'https://api.你的域名.com/api',
};
```

若 API 与后台同域，可复用管理后台域名的 `/api` 代理；若独立域名，按 `nginx.example.conf` 底部注释新增 `api.你的域名.com` 站点。

---

## 七、HTTPS（推荐）

1. 宝塔 → 网站 → **SSL** → **Let's Encrypt** 申请免费证书
2. 开启「强制 HTTPS」
3. 更新 `CORS_ALLOWED_ORIGINS` 为 `https://` 地址

---

## 八、常见问题

### 1. 管理后台打开空白 / 404

- 确认访问地址带 `/admin/` 后缀
- 确认 Nginx `try_files` 配置正确
- 确认 `admin/index.html` 存在

### 2. 登录报跨域错误

- 检查 `backend/.env` 中 `CORS_ALLOWED_ORIGINS` 是否包含管理后台域名
- 域名需带协议，如 `https://admin.example.com`

### 3. 后端启动失败：数据库连接错误

- 检查 PostgreSQL 是否运行
- 检查 `DATABASE_URL` 用户名、密码、端口
- 宝塔 PostgreSQL 默认端口是 `5432`（不是本地开发的 6001）

### 4. Prisma migrate 失败

- 确认已执行 `npm ci --omit=dev`（需要 `@prisma/client`）
- 确认 `prisma/migrations` 目录已上传
- 确认数据库用户有建表权限

### 5. 文件上传失败

- 检查 `uploads/` 目录权限
- 若使用 MinIO，检查 `MINIO_*` 配置

---

## 九、更新部署

后续更新时，在本地重新执行打包脚本，然后：

1. **后端**：上传新的 `dist/` 和 `prisma/`（如有迁移），执行 `npx prisma migrate deploy`，`pm2 restart farm-backend`
2. **管理后台**：上传新的 `admin/` 静态文件覆盖即可

---

## 十、端口与防火墙

| 服务 | 端口 | 说明 |
|------|------|------|
| 后端 API | 6002 | 仅内网访问，通过 Nginx 代理 |
| PostgreSQL | 5432 | 仅本机，勿对外开放 |
| Redis | 6379 | 仅本机，勿对外开放 |
| Nginx | 80/443 | 对外开放 |

在宝塔「安全」中放行 80、443，**不要**对公网开放 6002、5432、6379。
