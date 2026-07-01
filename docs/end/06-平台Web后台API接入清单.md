# 平台 Web 后台 API 接入清单

平台端是 `admin/` Vue 项目，负责平台级管理。平台管理员不是普通商家，但平台官方商家是一条 Merchant 数据。

## 1. 构建问题

当前包里 `admin` 构建失败原因是 Rollup optional dependency 缺失：

```text
Cannot find module @rollup/rollup-linux-x64-gnu
```

解决：

```bash
cd admin
rm -rf node_modules package-lock.json
npm install
npm run build
```

如果不能删 lock：

```bash
npm i
npm run build
```

## 2. 路由和页面

核心页面：

```text
DashboardView.vue              平台控制台
ResourceListView.vue           用户/商户/商品/活动/订单/售后/物流等通用列表
BannersView.vue                 Banner管理
AnnouncementsView.vue           公告/系统消息
ChatView.vue                    平台客服会话
ExchangeCenterView.vue          积分兑换/兑换券
OrderDetailView.vue             平台订单详情
AnalyticsView.vue               数据看板
SettingsView.vue                系统设置/官方商家/客服绑定
AdminManagementView.vue         管理员/角色
```

API 文件：

```text
admin/src/api/admin.ts
```

## 3. 平台身份定稿

平台管理员登录：

```http
POST /admin/auth/login
```

平台官方商家配置：

```text
GET /admin/settings
POST /admin/settings
```

关键设置：

```text
platformOfficialMerchantName  官方店铺名称
platformSupportMerchantId     官方客服商家ID
customerServiceHotline        客服热线
auditMode                     审核模式
```

## 4. 用户管理

页面：

```text
ResourceListView.vue resourceKey=users
```

接口：

```text
GET /admin/users
GET /admin/users/:userId/summary
PUT /admin/users/:userId
PATCH /admin/users/:userId/status
DELETE /admin/users/:userId
POST /admin/points/adjust
```

要求：

```text
1. 用户黑名单/禁用通过 status 实现。
2. 用户消费统计使用 summary。
3. 积分调整写 PointLog。
```

## 5. 商户管理

页面：

```text
ResourceListView.vue resourceKey=merchants
```

接口：

```text
GET /admin/merchants
GET /admin/merchants/:merchantId
GET /admin/merchants/:merchantId/summary
PUT /admin/merchants/:merchantId
DELETE /admin/merchants/:merchantId
POST /admin/merchants/:merchantId/audit
```

审核通过必须做三件事：

```text
1. Merchant.status = 1
2. 给对应 User 添加 MERCHANT 角色
3. 初始化 MerchantWallet
```

## 6. 平台商品管理

页面：

```text
ResourceListView.vue resourceKey=products
```

接口：

```text
GET /admin/products
POST /admin/products
GET /admin/products/:productId
PUT /admin/products/:productId
DELETE /admin/products/:productId
POST /admin/products/:productId/audit
```

定稿：

```text
/admin/products 创建商品默认归属平台官方 Merchant。
普通商家商品由 /merchant/products 创建。
```

平台商品也在 C 端商品列表展示，只是 merchantName 是官方店铺。

## 7. 商品审核/强制下架

接口：

```text
POST /admin/products/:productId/audit
DELETE /admin/products/:productId
```

要求：

```text
1. 审核拒绝要给商家推送系统消息。
2. 强制下架不能影响历史订单。
3. 只改商品 status/auditStatus，不删除订单。
```

## 8. 活动和优惠券

页面：

```text
ResourceListView.vue resourceKey=activities
ResourceListView.vue resourceKey=coupons
ExchangeCenterView.vue
```

接口：

```text
GET /admin/activities
POST /admin/activities
GET /admin/coupons
POST /admin/coupons
GET /admin/coupons/:couponId
PUT /admin/coupons/:couponId
PATCH /admin/coupons/:couponId/status
POST /admin/coupons/:couponId/issue
DELETE /admin/coupons/:couponId
```

活动定稿：

```text
平台活动：Banner、公告、优惠券、秒杀窗口、平台官方商品活动。
商家活动：商家自建，归属当前商家。
```

## 9. Banner 管理

页面：

```text
BannersView.vue
```

接口：

```text
GET /admin/banners
POST /admin/banners
PUT /admin/banners/:bannerId
PATCH /admin/banners/:bannerId/status
PUT /admin/banners/reorder
DELETE /admin/banners/:bannerId
```

C端首页读取：

```text
GET /app/home/banners
```

## 10. 公告与消息

页面：

```text
AnnouncementsView.vue
```

接口：

```text
GET /admin/messages
POST /admin/messages/send
POST /admin/messages/broadcast
POST /admin/messages/:messageId/delete
```

C端读取：

```text
GET /app/messages
GET /app/messages/:receiptId
POST /app/messages/:receiptId/read
```

## 11. 平台订单与售后

页面：

```text
ResourceListView.vue resourceKey=orders
OrderDetailView.vue
ResourceListView.vue resourceKey=refunds
```

接口：

```text
GET /admin/orders
GET /admin/orders/:orderNo
GET /admin/refunds
POST /admin/refunds/:refundNo/arbitrate
```

仲裁定稿：

```text
普通商家先 process refund。
如果进入纠纷，平台 admin arbitrate。
```

## 12. 提现审核

页面：

```text
ResourceListView.vue resourceKey=withdraws
```

接口：

```text
GET /admin/withdraws
POST /admin/withdraws/:applyNo/audit
```

提现流：

```text
商家申请 → 平台审核 → 更新商家钱包 frozen/available/totalWithdrawn
```

## 13. 平台客服

页面：

```text
ChatView.vue
SettingsView.vue
```

接口：

```text
GET /admin/chat/support-target
GET /admin/chat/conversations
GET /admin/chat/conversations/:conversationId
GET /admin/chat/conversations/:conversationId/messages
POST /admin/chat/conversations/:conversationId/messages
```

定稿：

```text
平台后台只能直接回复官方客服会话。
普通商家会话可以查看，但不建议平台代替商家回复，除非设计为仲裁客服。
```

## 14. 数据看板

页面：

```text
DashboardView.vue
AnalyticsView.vue
```

接口：

```text
GET /admin/dashboard/overview
GET /admin/dashboard/sales
GET /admin/dashboard/hot-products
GET /admin/dashboard/origin-sales
```

没有访客埋点时：

```text
visitorCount 可为 0，不要造假。
```

## 15. 后台不能做的事

```text
1. 不用 ADMIN token 调 /merchant/* 做普通商家操作。
2. 不把平台官方商家等同于所有商家。
3. 不用前端本地 mock 数据伪造管理结果。
4. 不绕过商品/商户审核流程。
```
