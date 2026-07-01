# 21-外部依赖 Mock 与 wxapp 对接

> 目标：给开发 / 联调 / 自动化测试提供一套可切换的 mock API，用来替代微信登录、购物车、地址、订单、支付、秒杀、拼团和顺丰物流等外部依赖。

---

## 1. 使用方式

开发环境可以把 `wxapp` 的 `API_BASE` 切到：

```text
http://localhost:6002/api/mock
```

这样小程序里原本请求的：

- `/identity/auth/*`
- `/auth/*`
- `/app/home/*`
- `/app/products/*`
- `/app/quick/*`
- `/app/cart/*`
- `/app/addresses/*`
- `/app/orders/*`
- `/app/payments/*`

会自动变成：

- `/api/mock/identity/auth/*`
- `/api/mock/auth/*`
- `/api/mock/app/home/*`
- `/api/mock/app/products/*`
- `/api/mock/app/quick/*`
- `/api/mock/app/cart/*`
- `/api/mock/app/addresses/*`
- `/api/mock/app/orders/*`
- `/api/mock/app/payments/*`

---

## 2. mock 覆盖范围

> 说明：这套 mock 重点覆盖微信登录、首页/商品基础浏览、活动专区、交易链路和顺丰物流。  
> 目前 `wxapp` 常用的购物车、地址、订单、支付接口也已经补齐，可以直接联调。

### 2.1 微信登录

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/mock/identity/auth/status` | Mock 身份模块状态 |
| GET | `/api/mock/identity/auth/anonymous` | 匿名会话 |
| GET | `/api/mock/identity/auth/me` | 当前 mock 用户 |
| PATCH | `/api/mock/identity/auth/me` | 更新 mock 资料 |
| POST | `/api/mock/identity/auth/refresh` | 刷新 mock token |
| POST | `/api/mock/identity/auth/wechat/phone-login` | 微信手机号登录 |
| POST | `/api/mock/identity/auth/wechat/sms-login` | 微信短信登录 |
| POST | `/api/mock/auth/wechat/login` | 兼容旧路由的微信登录 |
| POST | `/api/mock/auth/wechat/phone-bind` | 兼容旧路由的手机号绑定 |
| POST | `/api/mock/auth/wechat/phone-login` | 兼容旧路由的手机号登录 |
| POST | `/api/mock/auth/wechat/sms-login` | 兼容旧路由的短信登录 |
| POST | `/api/mock/auth/guest` | 兼容旧路由的游客会话 |
| POST | `/api/mock/auth/refresh` | 兼容旧路由的刷新 |
| GET | `/api/mock/auth/me` | 兼容旧路由的资料查询 |
| PATCH | `/api/mock/auth/me` | 兼容旧路由的资料更新 |

### 2.2 首页与商品

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/mock/app/home/banners` | 首页 Banner |
| GET | `/api/mock/app/home/quick-entries` | 首页快捷入口 |
| GET | `/api/mock/app/home/hot-products` | 首页热销商品 |
| GET | `/api/mock/app/categories` | 分类列表 |
| GET | `/api/mock/app/products` | 商品列表 |
| GET | `/api/mock/app/products/:productId` | 商品详情 |
| GET | `/api/mock/app/products/:productId/related` | 相关商品 |

### 2.3 交易链路

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/mock/app/addresses` | 收货地址列表 |
| POST | `/api/mock/app/addresses` | 新增收货地址 |
| PATCH | `/api/mock/app/addresses/:addressId` | 修改收货地址 |
| DELETE | `/api/mock/app/addresses/:addressId` | 删除收货地址 |
| GET | `/api/mock/app/cart` | 购物车列表 |
| POST | `/api/mock/app/cart/items` | 加入购物车 |
| PATCH | `/api/mock/app/cart/items/:cartId` | 修改购物车商品 |
| DELETE | `/api/mock/app/cart/items/:cartId` | 删除购物车商品 |
| POST | `/api/mock/app/orders/preview` | 下单预览 |
| POST | `/api/mock/app/orders` | 创建订单 |
| GET | `/api/mock/app/orders` | 订单列表 |
| GET | `/api/mock/app/orders/:orderNo` | 订单详情 |
| POST | `/api/mock/app/orders/:orderNo/cancel` | 取消订单 |
| POST | `/api/mock/app/orders/:orderNo/confirm` | 确认收货 |
| POST | `/api/mock/app/payments/wechat` | 创建微信支付参数 |
| POST | `/api/mock/payments/wechat/callback` | 模拟支付回调 |

### 2.4 活动专区

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/mock/app/quick/flash-sale/active` | 秒杀活动列表 |
| POST | `/api/mock/app/quick/flash-sale/claim` | 秒杀领取 |
| POST | `/api/mock/app/quick/group-buy/nearby` | 附近拼团 |
| POST | `/api/mock/app/quick/group-buy/join` | 开团 / 参团 |
| GET | `/api/mock/app/quick/gift-zone/items` | 礼盒专区 |
| GET | `/api/mock/app/quick/origin-zone/items` | 产地直供 |

### 2.4 顺丰物流

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| POST | `/api/mock/logistics/sf/orders` | 创建 mock 运单 |
| GET | `/api/mock/logistics/sf/orders/:orderId` | 运单状态 |
| GET | `/api/mock/logistics/sf/track/:waybillNo` | 运单轨迹 |
| GET | `/api/mock/logistics/sf/companies` | 物流公司列表 |

---

## 3. 返回规则

mock 接口仍然遵守后端统一响应信封：

```json
{
  "success": true,
  "statusCode": 200,
  "path": "/api/mock/...",
  "timestamp": "...",
  "data": {}
}
```

错误时直接返回 HTTP 错误码，不再嵌套假成功对象。

---

## 4. 状态机

### 4.1 秒杀

```text
ACTIVE -> CLAIMED -> SOLD_OUT
```

### 4.2 拼团

```text
OPEN -> COMPLETED
OPEN -> EXPIRED
```

### 4.3 顺丰物流

```text
CREATED -> PICKED -> IN_TRANSIT -> DELIVERING -> SIGNED
```

### 4.4 订单

```text
PENDING_PAY -> PENDING_SHIP -> PENDING_RECEIVE -> COMPLETED
PENDING_PAY -> CANCELLED
```

---

## 5. wxapp 接入建议

1. 开发环境把 `wxapp/miniprogram/config/env.config.ts` 里的 `dev` 地址指到 `http://localhost:6002/api/mock`。
2. 正式环境继续使用真实后端 `http://localhost:6002/api` 或线上域名。
3. `wxapp` 的 auth / quick / home / product 请求无需重写业务逻辑，只要改 base path。
4. 如果只想 mock 微信登录和物流，也可以只在联调脚本里调用 mock 接口，不必全站切换。

---

## 6. 结论

这套 mock 的定位不是“假系统”，而是为了把外部依赖替换成可控、可重复、可测试的流程。
