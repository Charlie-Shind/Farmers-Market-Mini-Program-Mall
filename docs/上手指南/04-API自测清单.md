# 04-API自测清单

> 目标：用最短路径确认后端 API 是否启动正常、公开读接口可用、登录态读接口可用。  
> 这份文档只保留当前仓库里能直接执行的验证方法。

## 当前验证范围

- C 端公开读接口
- 登录态读接口
- 商家端关键写接口的人工补测
- 平台后台关键写接口的人工补测
- 场景数据注入脚本

---

## 1. 启动后端

```powershell
docker compose -f base/docker-compose.yml --env-file .env.local up -d
cd backend
npm install
npm run prisma:generate
npx prisma db push
npm run start:dev
```

默认后端地址：

- `http://localhost:6002/api`

---

## 2. 先跑自动烟测

这是最推荐的第一步，因为不需要手工拼很多请求。

### 公开只读接口

```powershell
cd backend
npm run smoke:api
```

默认会检查：

- `GET /api/identity/auth/status`
- `GET /api/identity/auth/anonymous`
- `GET /api/app/categories`
- `GET /api/app/products?pageSize=3`
- `GET /api/app/quick/flash-sale/active`
- `GET /api/app/quick/group-buy/products?pageSize=3`

### 带 token 的只读接口

```powershell
cd backend
npm run smoke:api -- --mode=auth
```

会额外检查：

- `GET /api/identity/auth/me`
- `GET /api/app/favorites`
- `GET /api/app/cart`
- `GET /api/app/orders`
- `POST /api/app/quick/group-buy/nearby`

### 单条请求看返回数据

如果你只想验证一个接口的返回值，优先用单条请求脚本，它会把原始响应完整打印出来。

```powershell
cd backend
npm run api:request -- --method=GET --path=/app/products?pageSize=3
```

带 token 的例子：

```powershell
cd backend
npm run api:request -- --method=POST --path=/app/orders/preview --token=YOUR_TOKEN --body="{\"cartIds\":[1],\"addressId\":1,\"deliveryType\":1}"
```

你重点看这些返回项：

- `status`
- `ok`
- `durationMs`
- `response`

### 返回值怎么验

如果要把“接口返回数据对不对”也算进测试，建议按下面顺序看：

1. HTTP 状态码是否正确
2. `response` 里是否有你要的字段
3. 字段类型是否符合预期
4. 业务状态是否真的变化，比如 `orderNo`、`refundNo`、`auditStatus`

### 按流程跑 API 回归

如果你在改订单、支付、退款、商家或后台链路，建议直接跑分段流程测试。

```powershell
cd backend
npm run test:api:flow -- --section=public
npm run test:api:flow -- --section=auth
npm run test:api:flow -- --section=product
npm run test:api:flow -- --section=draft
npm run test:api:flow -- --section=activity
npm run test:api:flow -- --section=order
npm run test:api:flow -- --section=merchant
npm run test:api:flow -- --section=admin
```

或者直接跑完整链路：

```powershell
cd backend
npm run test:api:flow -- --section=full
```

这份流程测试会按顺序覆盖：

- 公开读接口
- 登录和商家入驻
- 商品创建与审核
- 商品草稿创建、更新、发布
- 商家活动与后台活动
- 地址、购物车、下单、支付、发货、确认收货、评价
- 退款申请、商家处理、后台仲裁
- 商家资料、通知、钱包、工作台
- 后台商品和退款管理

如果你想把每个步骤的返回值也看出来，可以加 `--dump`：

```powershell
cd backend
npm run test:api:flow -- --section=order --dump
```

### 一条跑通主流程

如果你想直接验证“登录 -> 创建商家 -> 创建商品 -> 下单 -> 支付 -> 发货 -> 退款”这整条主流程，优先跑这个脚本：

```powershell
cd backend
npm run test:api:happy
```

如果你要看每一步响应：

```powershell
cd backend
npm run test:api:happy -- --dump
```

---

## 3. 手工补测最关键接口

如果自动烟测通过，再按下面顺序补几个关键请求。

### 3.1 健康状态

```powershell
Invoke-WebRequest -UseBasicParsing http://localhost:6002/api/identity/auth/status
```

### 3.2 匿名 token

```powershell
Invoke-WebRequest -UseBasicParsing http://localhost:6002/api/identity/auth/anonymous
```

### 3.3 商品列表

```powershell
Invoke-WebRequest -UseBasicParsing http://localhost:6002/api/app/products?pageSize=3
```

### 3.4 秒杀活动

```powershell
Invoke-WebRequest -UseBasicParsing http://localhost:6002/api/app/quick/flash-sale/active
```

---

## 4. 商家端补测

建议先登录商家账号，再验证这几类接口：

### 4.1 商品

- `GET /api/merchant/products`
- `POST /api/merchant/products`
- `GET /api/merchant/products/{productId}`
- `PUT /api/merchant/products/{productId}`
- `PATCH /api/merchant/products/{productId}/status`
- `GET /api/merchant/products/{productId}/skus`

### 4.2 订单

- `GET /api/merchant/orders`
- `GET /api/merchant/orders/{orderNo}`
- `POST /api/merchant/orders/{orderNo}/accept`
- `POST /api/merchant/orders/{orderNo}/ship`

### 4.3 活动

- `GET /api/merchant/activities`
- `POST /api/merchant/activities`
- `GET /api/merchant/activities/{activityId}/detail`
- `POST /api/merchant/activities/{activityId}/publish`
- `GET /api/merchant/activities/drafts`

### 4.4 退款与评价

- `GET /api/merchant/refunds`
- `POST /api/merchant/refunds/{refundNo}/process`
- `GET /api/merchant/reviews`
- `GET /api/merchant/reviews/summary`
- `POST /api/merchant/reviews/{reviewId}/reply`

---

## 5. 平台后台补测

建议用管理员账号验证：

- `POST /api/admin/auth/login`
- `GET /api/admin/users`
- `GET /api/admin/merchants`
- `GET /api/admin/products`
- `POST /api/admin/products/{productId}/audit`
- `GET /api/admin/activities`
- `POST /api/admin/activities`
- `POST /api/admin/refunds/{refundNo}/arbitrate`
- `GET /api/admin/dashboard/overview`

---

## 6. 需要测试数据时怎么做

如果你要验证订单、支付、消息或营销场景，不建议手工造库数据，优先跑现成脚本：

```powershell
cd backend
npm run scenario:test:all
npm run scenario:payment:pending
npm run scenario:flash:inject -- --reset
npm run scenario:flash:verify
```

详细用法看：

- [`docs/24-测试数据注入与校验脚本指南.md`](../24-%E6%B5%8B%E8%AF%95%E6%95%B0%E6%8D%AE%E6%B3%A8%E5%85%A5%E4%B8%8E%E6%A0%A1%E9%AA%8C%E8%84%9A%E6%9C%AC%E6%8C%87%E5%8D%97.md)

---

## 7. 推荐回归顺序

1. `npm run smoke:api`
2. `npm run smoke:api -- --mode=auth`
3. `npm run scenario:test:all`
4. `npm run scenario:flash:inject -- --reset`
5. `npm run scenario:flash:verify`

---

## 8. 出问题先看什么

- 后端控制台是否有异常堆栈
- `.env.local` 里的数据库和 Redis 地址是否可连
- 是否已执行 `prisma generate` 和 `db push`
- 是否缺少 seed 或场景注入数据
- 当前请求是否需要 token
