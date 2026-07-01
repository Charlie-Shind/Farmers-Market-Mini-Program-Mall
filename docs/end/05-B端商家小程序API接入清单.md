# B端商家小程序 API 接入清单

目标：B 端页面保留现有 UI，只把所有核心经营页面接真实 `/merchant/*` API。核心链路禁止 safeGet/safePost 静默兜底。

## 1. 总服务文件

文件：

```text
wxapp/miniprogram/services/merchant.ts
```

### 必须保留真实 API 的函数

这些函数不允许 safeGet/safePost：

```ts
fetchMerchantProfile                 GET /merchant/profile
fetchMerchantDashboard               GET /merchant/dashboard
fetchMerchantWorkbench               GET /merchant/workbench
fetchMerchantProducts                GET /merchant/products
fetchMerchantProductDetail           GET /merchant/products/:productId
createMerchantProduct                POST /merchant/products
updateMerchantProduct                PUT /merchant/products/:productId
updateMerchantProductStatus          PATCH /merchant/products/:productId/status
updateMerchantSkuStock               PATCH /merchant/skus/:skuId/stock
fetchMerchantOrders                  GET /merchant/orders
fetchMerchantOrderDetail             GET /merchant/orders/:orderNo
acceptMerchantOrder                  POST /merchant/orders/:orderNo/accept
shipMerchantOrder                    POST /merchant/orders/:orderNo/ship
fetchMerchantRefunds                 GET /merchant/refunds
fetchMerchantRefundDetail            GET /merchant/refunds/:refundNo
processMerchantRefund                POST /merchant/refunds/:refundNo/process
fetchMerchantReviews                 GET /merchant/reviews
fetchReviewSummary                   GET /merchant/reviews/summary
replyMerchantReview                  POST /merchant/reviews/:reviewId/reply
fetchMerchantWallet                  GET /merchant/wallet
fetchMerchantFinanceRecords          GET /merchant/finance/records
fetchMerchantWithdraws               GET /merchant/withdraws
createMerchantWithdraw               POST /merchant/withdraws
fetchMerchantChats                   GET /merchant/chats
fetchMerchantChatMessages            GET /merchant/chats/:conversationId/messages
sendMerchantChatMessage              POST /merchant/chats/:conversationId/messages
fetchMerchantStatisticsOverview      GET /merchant/statistics/overview
fetchMerchantStatisticsTrend         GET /merchant/statistics/trend
```

### 允许暂时 safeGet 的非主闭环函数

```text
配送设置
通知中心
安全设置
资质管理
活动详情统计
活动草稿
商品草稿
物流公司列表
```

这些属于 P2，不影响主交易闭环。

## 2. 商家 dashboard

文件：

```text
pages/merchant/dashboard/dashboard.ts
```

接口：

```text
GET /merchant/dashboard
```

要求：

```text
1. 只展示当前商家的数据。
2. 入口跳订单、商品、活动、财务、消息。
3. 不要使用平台官方商家数据，除非当前登录账号就是平台官方商家。
```

## 3. 商家工作台

文件：

```text
pages/merchant/workbench/workbench.ts
```

接口：

```text
GET /merchant/workbench
```

当前已发现风险：若存在重复 `onShow`，后者会覆盖前者，导致 `loadTodos()` 不执行。保留：

```ts
onShow() {
  this.setData({ pageStyle: buildPageTopStyle(8) });
  this.loadTodos();
}
```

返回数据：

```ts
{
  shop,
  metrics: { payAmount, orderCount, visitorCount, conversionRate, refundCount },
  todos: { pendingAccept, pendingShip, pendingRefund, lowStock, draftProducts, draftActivities },
  trend,
}
```

## 4. 商品列表

文件：

```text
pages/merchant/products/products.ts
```

接口：

```text
GET /merchant/products
PATCH /merchant/products/:productId/status
```

字段要求：

```ts
{
  productId,
  skuId,
  title,
  subtitle,
  categoryName,
  status,
  auditStatus,
  price,
  stock,
  stockValue,
  coverUrl,
  updatedAt,
}
```

按钮：

```text
上架：PATCH status=ON_SHELF
下架：PATCH status=OFF_SHELF
编辑：跳 product-edit/publish 流程
```

## 5. 商品编辑/发布

文件：

```text
pages/merchant/product-edit/product-edit.ts
pages/merchant/products/edit/edit.ts
pages/merchant/publish/publish.ts
pages/merchant/publish-category/publish-category.ts
pages/merchant/publish-images/publish-images.ts
pages/merchant/publish-sku/publish-sku.ts
```

接口：

```text
POST /merchant/products
GET /merchant/products/:productId
PUT /merchant/products/:productId
POST /merchant/products/drafts
GET /merchant/products/drafts
GET /merchant/products/drafts/:draftRef
POST /merchant/products/drafts/:draftRef
POST /merchant/products/drafts/:draftRef/delete
```

必须写入/读取字段：

```text
title, subtitle, categoryId, coverUrl, detailDesc, originPlace,
serviceTags, traceCode/traceDesc/traceJson,
skus: skuName, skuCode, price, originalPrice, promotionPrice, promotionStartAt, promotionEndAt, stock, safetyStock, specJson
images, videos
```

不要求重做 UI，只补字段映射。

## 6. 库存管理

文件：

```text
pages/merchant/inventory/inventory.ts
```

接口：

```text
GET /merchant/products
GET /merchant/products/:productId/skus     // 如果后端未实现，P1补齐
PATCH /merchant/skus/:skuId/stock
```

要求：

```text
1. 库存调整必须传 skuId。
2. 页面上的库存不要只改本地数组，成功后刷新接口。
3. 低库存阈值以后端 safetyStock 为准。
```

## 7. 订单列表

文件：

```text
pages/merchant/orders/orders.ts
```

接口：

```text
GET /merchant/orders?page=1&pageSize=50&status=...
```

后端返回必须包含：

```ts
{
  orderNo,
  userName,
  userAvatar,
  userMobile,
  orderStatus,
  payStatus,
  deliveryStatus,
  refundStatus,
  status,
  totalAmount,
  payAmount,
  createdAt,
  itemPreview,
  items,
  canAccept,
  canShip,
}
```

列表按钮：

```text
canAccept=true：显示接单
canShip=true：显示发货
refundStatus=1/2：显示售后处理中
```

## 8. 订单详情

文件：

```text
pages/merchant/order-detail/order-detail.ts
```

接口：

```text
GET /merchant/orders/:orderNo
POST /merchant/orders/:orderNo/accept
```

地址字段兼容：

```ts
const addr = d.addressSnapshot || {};
const receiverName = addr.receiverName || addr.name || d.userName || '';
const receiverMobile = addr.receiverMobile || addr.mobile || d.userMobile || '';
const detailAddress = addr.detailAddress || addr.detail || '';
```

接单条件：

```text
orderStatus=1 && payStatus=1
```

## 9. 物流发货

文件：

```text
pages/merchant/logistics/logistics.ts
```

接口：

```text
GET /merchant/orders/:orderNo
POST /merchant/orders/:orderNo/ship
```

流程：

```text
必须先接单，再发货。
```

发货 Body：

```json
{
  "logisticsCompany": "顺丰速运",
  "trackingNo": "SF1234567890"
}
```

## 10. 售后列表

文件：

```text
pages/merchant/aftersale/aftersale.ts
```

接口：

```text
GET /merchant/refunds
```

字段：

```ts
{
  refundNo,
  orderNo,
  buyer,
  item,
  applyType,
  applyReason,
  applyImages,
  refundAmount,
  status,
  statusLabel,
  merchantRemark,
  createdAt,
  processedAt,
}
```

## 11. 售后详情/处理

文件：

```text
pages/merchant/refund/refund.ts
```

接口：

```text
GET /merchant/refunds/:refundNo
POST /merchant/refunds/:refundNo/process
```

处理 Body：

```ts
await processMerchantRefund(refundNo, {
  action: 'approve',
  remark: '商家同意退款',
});
```

拒绝 Body：

```ts
await processMerchantRefund(refundNo, {
  action: 'reject',
  remark: '商家拒绝退款',
});
```

## 12. 评价管理

文件：

```text
pages/merchant/review/review.ts
```

接口：

```text
GET /merchant/reviews/summary
GET /merchant/reviews
POST /merchant/reviews/:reviewId/reply
```

注意：

```text
replyMerchantReview(reviewId, content) 传 content，不是 replyContent。
```

字段映射：

```ts
allList: items.map((r) => ({
  id: String(r.id),
  buyer: r.buyer?.nickname || '',
  avatar: r.buyer?.avatarUrl || '',
  content: r.content || '',
  score: String(r.rating),
  goodsName: r.product?.title || '',
  goodsImg: r.product?.coverUrl || '',
  starText: `${r.rating}星`,
  tag: r.rating >= 4 ? 'good' : r.rating >= 3 ? 'normal' : 'bad',
  replyStatus: r.replyContent ? 'done' : 'todo',
  replyText: r.replyContent ? '已回复' : '待回复',
}))
```

## 13. 消息中心

文件：

```text
pages/merchant/messages/messages.ts
pages/merchant/chat-detail/chat-detail.ts
```

接口：

```text
GET /merchant/chats
GET /merchant/chats/unread-count
GET /merchant/chats/:conversationId/messages
POST /merchant/chats/:conversationId/messages
POST /merchant/chats/:conversationId/read
```

要求：

```text
1. 买家订单咨询显示 sceneType=ORDER。
2. 买家商品咨询显示 sceneType=PRODUCT。
3. 商家回复只回复自己的会话。
```

## 14. 财务管理

文件：

```text
pages/merchant/finance/finance.ts
```

接口：

```text
GET /merchant/wallet
GET /merchant/finance/records
```

`fetchMerchantFinanceRecords` 返回数组，不是分页对象：

```ts
return get<FinanceRecord[]>('/merchant/finance/records', query);
```

## 15. 提现申请

文件：

```text
pages/merchant/withdraw/withdraw.ts
```

接口：

```text
GET /merchant/wallet
GET /merchant/withdraws
POST /merchant/withdraws
```

提交参数建议：

```ts
{
  amount,
  accountType: 'WECHAT',
  accountName,
  accountNo: 'merchant_balance',
  remark: '商家提现申请'
}
```

## 16. 经营统计

文件：

```text
pages/merchant/statistics/statistics.ts
```

接口：

```text
GET /merchant/statistics/overview?range=7d
GET /merchant/statistics/trend?range=7d
```

核心指标：

```text
payAmount, orderCount, visitorCount, conversionRate, refundRate, topProducts, trend
```

如果没有真实访客埋点，visitorCount 固定 0。

## 17. B端可暂缓真实 API 的页面

```text
pages/merchant/delivery/delivery.ts
pages/merchant/notice/notice.ts
pages/merchant/notice-order/notice-order.ts
pages/merchant/notice-official/notice-official.ts
pages/merchant/profile-security/profile-security.ts
pages/merchant/profile-certify/profile-certify.ts
pages/merchant/marketing-detail/marketing-detail.ts
pages/merchant/marketing-statistics/marketing-statistics.ts
```

这些可以保留 safeGet/safePost，但文档/验收中要标注为 P2。

## 18. B端绝对不能做的事

```text
1. 不把 B端订单详情和 C端订单详情合并。
2. 不在 B端直接使用 /app/*。
3. 不让普通商家看到平台官方商家的订单。
4. 不让普通商家处理别的商家的退款。
5. 不依赖前端本地假订单完成演示。
```
