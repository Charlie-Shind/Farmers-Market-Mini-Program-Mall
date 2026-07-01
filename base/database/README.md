# 数据库备份与恢复

## 备份文件

| 文件 | 说明 |
|------|------|
| `farm-20260630-163047.sql` | PostgreSQL 全库导出（结构 + 数据） |

导出参数：`pg_dump --no-owner --no-acl --clean --if-exists`，便于在其他机器上直接恢复。

默认连接信息与项目 `.env.local` / `backend/.env` 一致：

- 主机：`localhost:6001`
- 数据库：`farm`
- 用户：`farm`
- 密码：`farm123456`

## 对方如何导入

### 1. 启动 PostgreSQL

在项目根目录：

```bash
cd base
docker compose up -d postgres
```

等待容器 `farm-postgres` 健康后再导入。

### 2. 导入 SQL（Windows PowerShell）

```powershell
Get-Content .\database\farm-20260630-163047.sql -Raw -Encoding UTF8 | docker exec -i farm-postgres psql -U farm -d farm
```

### 3. 导入 SQL（Linux / macOS）

```bash
docker exec -i farm-postgres psql -U farm -d farm < database/farm-20260630-163047.sql
```

### 4. 启动后端验证

```bash
cd backend
npm run start:dev
```

浏览器打开管理后台 `http://localhost:6007/admin/`，默认账号：`admin` / `admin123456`。

## 注意事项

1. 导入会 **清空并覆盖** 目标库中现有 `public` schema 对象（备份含 `DROP ... IF EXISTS`）。
2. 备份含开发环境业务数据，请勿上传到公开仓库；通过微信/网盘私发即可。
3. 图片等静态资源在 MinIO / `backend/uploads`，若需要完整演示效果，需另行同步对象存储或上传目录。
4. 若对方数据库账号密码不同，只需改 `docker compose` 环境变量，导入命令中的 `-U farm -d farm` 与之一致即可。

## 重新导出（本机）

```powershell
cd base
$out = "database/farm-$(Get-Date -Format 'yyyyMMdd-HHmmss').sql"
docker exec farm-postgres pg_dump -U farm -d farm --no-owner --no-acl --clean --if-exists > $out
```
