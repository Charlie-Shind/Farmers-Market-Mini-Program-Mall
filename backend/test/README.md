# 冒烟测试

`quick-zone.smoke.ts` 是后端 4 个新接口 + 1 个订单字段 + 1 个定位接口的端到端冒烟测试。

## 前置

- 后端已启动并初始化 seed 数据（`withSeed()` 跑过一次）
- 数据库 / Redis / 对象存储可访问

## 运行

```bash
cd backend
npx ts-node test/quick-zone.smoke.ts
```

可选环境变量：

- `BACKEND_PORT`：后端端口，默认 `6002`

## 覆盖用例

| # | 用例 | 验证点 |
|---|---|---|
| 1 | `GET /app/quick/flash-sale/active` | 200 + windows/items 结构 |
| 2 | `GET /app/quick/gift-zone/items?pageSize=4` | 200 + 分页结构 |
| 3 | `GET /app/quick/origin-zone/items?pageSize=4` | 200 + 分页结构 |
| 4 | `POST /app/quick/group-buy/nearby` 无坐标 | 200 + groups=[] |
| 5 | `POST /app/quick/group-buy/nearby` 带坐标 | 200 + groups 数组 |
| 6 | `GET /app/location/reverse?lat=30.5&lng=114.3` | 200 + 含 name/source |
| 7 | `GET /app/location/reverse?lat=abc&lng=xyz` | 400 |
| 8 | `POST /app/orders` 响应 | 含 `cartCount` 字段 |

## 切换为正式 Jest 套件

如需接入 `@nestjs/testing` + Jest：

1. `npm i -D @nestjs/testing jest ts-jest @types/jest supertest @types/supertest`
2. `package.json` 加 `"test": "jest"` 和 `jest` 配置块
3. 把 `quick-zone.smoke.ts` 改写为 `*.spec.ts` 格式

冒烟版是无依赖的快速验证，正式套件可以分阶段补。
