# 12-基础设施-Docker编排

> 目标：用一份 `docker-compose.yml` 拉起本地开发依赖。

## 包含服务

- PostgreSQL
- Redis
- MinIO
- MinIO Console UI
- MinIO Client `mc`

## 启动方式

```bash
# 在仓库根目录运行：
docker compose -f base/docker-compose.yml --env-file .env.local up -d

# 或者进入 base 目录运行：
cd base
docker compose --env-file ../.env.local up -d
```

## 常用命令

```bash
# 以在 base 目录运行为例：
docker compose ps
docker compose logs -f postgres
docker compose logs -f redis
docker compose logs -f minio
```

## 一次性工具容器

```bash
# 以在 base 目录运行为例：
docker compose --profile tools run --rm minio-mc ls local
```

## 连接信息

- PostgreSQL: `localhost:6001`
- Redis: `localhost:6003`
- MinIO API: `http://localhost:6004`
- MinIO Console: `http://localhost:6005`
- MinIO UI: `http://localhost:6006`
