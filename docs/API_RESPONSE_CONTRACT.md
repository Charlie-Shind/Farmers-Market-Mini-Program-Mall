# API 响应合同对照表

> 生成时间: 2026-06-20 | 后端 TypeScript build 通过

## 1. C端 — 订单详情

| 页面 | 调用接口 | 前端字段 | 后端字段 | 一致 |
|---|---|---|---|---|
| `order/detail/detail` | `GET /app/orders/:orderNo` | `orderNo`, `payStatus`, `deliveryStatus`, `refundStatus` | `orderNo`, `payStatus`, `deliveryStatus`, `refundStatus` | ✅ |
| | | `addressSnapshot.receiverName`, `receiverMobile`, `province`, `city`, `district`, `detailAddress` | 同字段 | ✅ |
| | | `items[].orderItemId`, `productId`, `skuId`, `productTitle`, `productImage`, `skuName`, `quantity`, `unitPrice`, `lineAmount` | 同字段 | ✅ |
| | | `logisticsCompany`, `trackingNo` | `logisticsCompany`, `trackingNo` | ✅ |
| | | `merchant.storeName`, `merchant.logo` | `merchant.storeName`, `merchant.logo` | ✅ |

## 2. C端 — 结算页

| 页面 | 调用接口 | 前端字段 | 后端字段 | 一致 |
|---|---|---|---|---|
| `checkout/checkout` | `POST /app/orders/preview` | `summary.productAmount`, `freightAmount`, `discountAmount`, `payAmount` | 同字段 | ✅ |
| | `POST /app/orders` | 返回 `orderNo`, `childOrderNos`, `payAmount` | `orderNo`, `status` (TODO: childOrderNos) | ⚠️ |
| 秒杀模式 | `claimFlashSale` → checkout | `flashSaleItemId`, `skuId`, `quantity`, `flashPrice` | 后端 `createOrder` flash 分支确认 | ✅ |
| 拼团模式 | `groupBuyId` → checkout | `groupBuyId`, `productId`, `skuId`, `quantity` | 后端 `createOrder` 拼团分支 | ✅ |

## 3. C端 — 物流页

| 页面 | 调用接口 | 前端字段 | 后端字段 | 一致 |
|---|---|---|---|---|
| `order/logistics/detail/detail` | `GET /app/orders/:orderNo/logistics` | `logisticsCompany`, `trackingNo` | scaffold 返回模拟 | ⚠️ |

## 4. C端 — 评价页

| 页面 | 调用接口 | 前端字段 | 后端字段 | 一致 |
|---|---|---|---|---|
| `order/review/review` | `POST /app/orders/:orderNo/reviews` | `reviews[].orderItemId`, `rating`, `content`, `images` | 同字段 | ✅ |

## 5. C端 — 售后页

| 页面 | 调用接口 | 前端字段 | 后端字段 | 一致 |
|---|---|---|---|---|
| `order/detail/detail` (refund) | `POST /app/refunds` | `orderNo`, `orderItemId`, `refundAmount`, `applyType`, `applyReason`, `applyImages` | 同字段 | ✅ |

## 6. B端 — 订单列表

| 页面 | 调用接口 | 前端字段 | 后端字段 | 一致 |
|---|---|---|---|---|
| `merchant/orders/orders` | `GET /merchant/orders` | `orderNo`, `userName`, `userAvatar`, `payStatus`, `deliveryStatus`, `totalAmount`, `payAmount`, `items[]` | 同字段 | ✅ |

## 7. B端 — 订单详情

| 页面 | 调用接口 | 前端字段 | 后端字段 | 一致 |
|---|---|---|---|---|
| `merchant/order-detail/order-detail` | `GET /merchant/orders/:orderNo` | `addressSnapshot.receiverName`, `receiverMobile`, `detailAddress` | 同字段 | ✅ |
| | | `items[].title`, `coverUrl`, `price`, `quantity` | 同字段 | ✅ |

## 8. B端 — 发货页

| 页面 | 调用接口 | 前端字段 | 后端字段 | 一致 |
|---|---|---|---|---|
| `merchant/logistics/logistics` | `POST /merchant/orders/:orderNo/ship` | `logisticsCompany`, `trackingNo` | 同字段 | ✅ |

## 9. B端 — 评价管理

| 页面 | 调用接口 | 前端字段 | 后端字段 | 一致 |
|---|---|---|---|---|
| `merchant/review/review` | `GET /merchant/reviews` | `id`, `orderNo`, `buyer.nickname`, `product.title`, `rating`, `content` | 同字段 | ✅ |
| | `POST /merchant/reviews/:id/reply` | `content` or `replyContent` | 后端兼容两字段 | ✅ |

## 10. B端 — 售后管理

| 页面 | 调用接口 | 前端字段 | 后端字段 | 一致 |
|---|---|---|---|---|
| `merchant/aftersale/aftersale` | `GET /merchant/refunds` | `refundNo`, `orderNo`, `buyer.nickname`, `item.title`, `refundAmount`, `status` | 同字段 | ✅ |
| `merchant/refund/refund` | `POST /merchant/refunds/:refundNo/process` | `action`, `remark` or `merchantRemark` | 后端兼容两字段 | ✅ |

## 11. B端 — 财务

| 页面 | 调用接口 | 前端字段 | 后端字段 | 一致 |
|---|---|---|---|---|
| `merchant/finance/finance` | `GET /merchant/wallet` | `availableAmount`, `frozenAmount`, `totalIncome`, `totalWithdrawn` | 同字段（toMoney 格式化） | ✅ |
| | `GET /merchant/finance/records` | 数组 `FinanceRecord[]` | `id`, `title`, `desc`, `amount`, `tone`, `type`, `createdAt` | ✅ |

## 12. 后台 — 商户管理

| 页面 | 调用接口 | 前端字段 | 后端字段 | 一致 |
|---|---|---|---|---|
| `ResourceListView` (merchants) | `GET /admin/merchants` | `id`, `storeName`, `contactName`, `contactMobile`, `status` | admin list 返回 | ✅ |
| | `POST /admin/merchants/:id/audit` | `status`, `remark` | 同字段 | ✅ |

## 13. 后台 — 商品管理

| 页面 | 调用接口 | 前端字段 | 后端字段 | 一致 |
|---|---|---|---|---|
| `ResourceListView` (products) | `GET /admin/products` | `productId`, `title`, `coverUrl`, `status`, `auditStatus` | admin list 返回 | ✅ |
| | `POST /admin/products/:id/takedown` | — | 无 body | ✅ |

## 14. 后台 — 售后管理

| 页面 | 调用接口 | 前端字段 | 后端字段 | 一致 |
|---|---|---|---|---|
| `ResourceListView` (refunds) | `GET /admin/refunds` | `refundNo`, `orderNo`, `userName`, `merchantName`, `amount`, `status` | admin list 返回 | ✅ |
| | `POST /admin/refunds/:refundNo/arbitrate` | `action`, `remark` | 同字段 | ✅ |

## 未实装 / 开发中

| 功能 | 状态 | 说明 |
|---|---|---|
| 真实微信支付 | 模拟 | `mockWechatCallback` 模拟支付回调 |
| 真实物流 API | 模拟 | `deliveryRecords` 手动填写 |
| 积分兑换商品 | 部分实装 | 前端页面存在，后端 exchange-items 部分 |
| 溯源码扫码 | 未实装 | QR 码生成接口存在，扫码页未完整 |
| 门店自提点 | 部分实装 | 数据模型预留，CRUD 未完成 |
| 团长分销 | 未实装 | LeaderBinding/LeaderCommission 模型存在 |
| 数据大屏 | 部分实装 | admin dashboard 接口存在 |
