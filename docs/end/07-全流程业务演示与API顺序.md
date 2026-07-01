# 全流程业务演示与 API 顺序

目标：让测试人员按顺序打通“平台准备 → C端下单 → B端履约 → C端收货评价 → B端售后财务 → 平台复盘”。

默认：

```text
BASE_URL=http://127.0.0.1:6002/api
BUYER_TOKEN=普通用户token
MERCHANT_TOKEN=普通商家token
ADMIN_TOKEN=平台管理员token
```

请求头：

```http
Authorization: Bearer <TOKEN>
Content-Type: application/json
```

## 0. 启动与健康检查

```http
GET /health
GET /identity/auth/status
```

## 1. 三身份登录

### 1.1 C端买家登录

```http
POST /identity/auth/wechat/sms-login
```

```json
{
  "code": "mock_13800000001",
  "nickname": "测试买家"
}
```

保存：

```text
BUYER_TOKEN
buyerUserId
```

### 1.2 商家用户登录/申请

```http
POST /identity/auth/wechat/sms-login
```

```json
{
  "code": "mock_13800000002",
  "nickname": "测试商家"
}
```

如果还不是商家，先申请：

```http
POST /merchant/apply
```

Token 用普通 USER token。

```json
{
  "storeName": "湾源农仓测试商家",
  "contactName": "测试商家",
  "contactMobile": "13800000002",
  "storeLogo": "",
  "qualifications": [
    {
      "qualificationType": "BUSINESS_LICENSE",
      "fileName": "营业执照",
      "fileUrl": "https://example.com/license.png"
    }
  ]
}
```

保存：

```text
merchantId
```

### 1.3 平台管理员登录

```http
POST /admin/auth/login
```

```json
{
  "username": "admin",
  "password": "admin123456"
}
```

保存：

```text
ADMIN_TOKEN
```

### 1.4 平台审核商家

```http
POST /admin/merchants/{merchantId}/audit
```

```json
{
  "auditStatus": 3,
  "remark": "审核通过"
}
```

商家重新登录，保存新 `MERCHANT_TOKEN`。

## 2. 平台准备数据

### 2.1 配置平台官方商家

```http
GET /admin/settings
POST /admin/settings
```

Body：

```json
[
  { "key": "platformOfficialMerchantName", "value": "湾源农仓官方店" },
  { "key": "customerServiceHotline", "value": "400-800-2026" }
]
```

### 2.2 创建 Banner

```http
POST /admin/banners
```

```json
{
  "title": "湾源助农专场",
  "imageUrl": "https://example.com/banner.png",
  "linkType": "ACTIVITY",
  "linkId": 1,
  "sortOrder": 1,
  "status": "ENABLED"
}
```

### 2.3 创建公告

```http
POST /admin/messages/broadcast
```

```json
{
  "type": "NOTICE",
  "title": "明日助农专场开启",
  "summary": "拼团、秒杀、优惠券活动同步上线",
  "contentType": "TEXT",
  "contentJson": {
    "text": "欢迎进入湾源农仓，今日有拼团、限时秒杀、满减优惠券活动。"
  },
  "bizType": "ACTIVITY",
  "bizId": "demo-activity",
  "broadcast": true
}
```

### 2.4 创建优惠券

```http
POST /admin/coupons
```

```json
{
  "name": "满50减10测试券",
  "type": "CASHBACK",
  "thresholdAmount": "50",
  "discountAmount": "10",
  "stock": 100,
  "scope": "ALL",
  "perUserLimit": 1,
  "status": "ENABLED",
  "validStartAt": "2026-06-19T00:00:00.000Z",
  "validEndAt": "2026-12-31T23:59:59.000Z"
}
```

保存：

```text
couponId
```

### 2.5 创建/审核商品

平台商品：

```http
POST /admin/products
POST /admin/products/{productId}/audit
```

商家商品：

```http
POST /merchant/products
```

平台审核：

```http
POST /admin/products/{productId}/audit
```

```json
{
  "auditStatus": 3,
  "remark": "商品审核通过"
}
```

保存：

```text
productId
skuId
merchantId
```

## 3. C端首页/消息/浏览

```http
GET /app/home/banners
GET /app/home/quick-entries
GET /app/home/hot-products
GET /app/messages?page=1&pageSize=20
GET /app/categories
GET /app/products?page=1&pageSize=10
GET /app/products/{productId}
```

## 4. C端领券

```http
GET /app/coupons/recommended
POST /app/coupons/{couponId}/receive
GET /app/user/coupons
```

## 5. 普通购物车下单

### 5.1 创建地址

```http
POST /app/addresses
```

```json
{
  "receiverName": "测试买家",
  "receiverMobile": "13800000001",
  "province": "广东省",
  "city": "河源市",
  "district": "源城区",
  "detailAddress": "测试地址 1 号",
  "isDefault": true
}
```

保存：

```text
addressId
```

### 5.2 加购物车

```http
POST /app/cart/items
```

```json
{
  "skuId": 1,
  "quantity": 1,
  "checked": true
}
```

保存：

```text
cartId
```

### 5.3 订单预览

```http
POST /app/orders/preview
```

```json
{
  "cartIds": [1],
  "addressId": 1,
  "couponId": 1,
  "usePoints": 0,
  "deliveryType": 1,
  "remark": "测试订单"
}
```

### 5.4 创建订单

```http
POST /app/orders
```

```json
{
  "cartIds": [1],
  "addressId": 1,
  "couponId": 1,
  "usePoints": 0,
  "deliveryType": 1,
  "remark": "测试订单"
}
```

保存：

```text
parentOrderNo = response.orderNo
childOrderNo = response.childOrderNos[0]
payAmount = response.payAmount
```

## 6. 支付

```http
POST /app/payments/wechat
```

```json
{
  "orderNo": "parentOrderNo"
}
```

模拟回调：

```http
POST /payments/wechat/callback
```

```json
{
  "orderNo": "parentOrderNo",
  "amount": "payAmount"
}
```

查支付状态：

```http
GET /app/payments/wechat/status/{parentOrderNo}
```

## 7. C端订单查看

```http
GET /app/orders?page=1&pageSize=20
GET /app/orders/{childOrderNo}
```

## 8. B端接单发货

```http
GET /merchant/dashboard
GET /merchant/workbench
GET /merchant/orders?page=1&pageSize=20
GET /merchant/orders/{childOrderNo}
POST /merchant/orders/{childOrderNo}/accept
POST /merchant/orders/{childOrderNo}/ship
```

发货 Body：

```json
{
  "logisticsCompany": "顺丰速运",
  "trackingNo": "SF1234567890"
}
```

## 9. C端物流/聊天/确认收货

```http
GET /app/orders/{childOrderNo}/logistics
POST /app/chats/open
POST /app/chats/{conversationId}/messages
GET /app/chats/{conversationId}/messages
POST /app/orders/{childOrderNo}/confirm
```

打开订单会话 Body：

```json
{
  "merchantId": 1,
  "productId": 1,
  "orderNo": "childOrderNo",
  "sceneType": "ORDER",
  "sceneLabel": "订单咨询",
  "sceneSource": "order_detail"
}
```

## 10. B端消息回复

```http
GET /merchant/chats
GET /merchant/chats/{conversationId}/messages?page=1&pageSize=20
POST /merchant/chats/{conversationId}/messages
```

```json
{
  "content": "您好，订单已经发货，预计 1-2 天送达。",
  "contentType": "TEXT"
}
```

## 11. C端评价/B端回复评价

C端提交：

```http
POST /app/orders/{childOrderNo}/reviews
```

```json
{
  "reviews": [
    {
      "orderItemId": 1,
      "rating": 5,
      "content": "商品新鲜，发货很快，包装也不错。",
      "images": []
    }
  ]
}
```

B端查看：

```http
GET /merchant/reviews/summary
GET /merchant/reviews?page=1&pageSize=20
```

B端回复：

```http
POST /merchant/reviews/{reviewId}/reply
```

```json
{
  "content": "感谢您的支持，我们会继续保证品质。"
}
```

## 12. 售后流程

C端发起：

```http
POST /app/refunds
```

```json
{
  "orderNo": "childOrderNo",
  "orderItemId": 1,
  "applyType": 1,
  "applyReason": "测试退款申请",
  "applyImages": [],
  "refundAmount": "10.00"
}
```

B端处理：

```http
GET /merchant/refunds?page=1&pageSize=20
GET /merchant/refunds/{refundNo}
POST /merchant/refunds/{refundNo}/process
```

```json
{
  "action": "approve",
  "remark": "同意退款"
}
```

平台仲裁：

```http
POST /admin/refunds/{refundNo}/arbitrate
```

```json
{
  "action": "approve",
  "remark": "平台判定同意退款"
}
```

## 13. 秒杀流程

```http
GET /app/quick/flash-sale/windows
GET /app/quick/flash-sale/items?page=1&pageSize=10
POST /app/quick/flash-sale/claim
POST /app/orders/preview
POST /app/orders
POST /app/payments/wechat
POST /payments/wechat/callback
```

claim Body：

```json
{
  "itemId": 1,
  "quantity": 1
}
```

秒杀订单 Body：

```json
{
  "orderMode": "FLASH_SALE",
  "flashSaleItemId": 1,
  "skuId": 1,
  "quantity": 1,
  "addressId": 1,
  "couponId": null,
  "usePoints": 0,
  "remark": "秒杀订单"
}
```

## 14. 拼团流程

```http
GET /app/quick/group-buy/products?page=1&pageSize=10
POST /app/quick/group-buy/join
POST /app/orders/preview
POST /app/orders
```

join Body：

```json
{
  "productId": 1,
  "skuId": 1,
  "lat": 23.743,
  "lng": 114.700
}
```

拼团订单 Body：

```json
{
  "orderMode": "GROUP_BUY",
  "groupBuyId": 1,
  "productId": 1,
  "skuId": 1,
  "quantity": 1,
  "addressId": 1,
  "couponId": null,
  "usePoints": 0,
  "remark": "拼团订单"
}
```

## 15. 财务与经营复盘

B端：

```http
GET /merchant/wallet
GET /merchant/finance/records
GET /merchant/withdraws?page=1&pageSize=20
POST /merchant/withdraws
GET /merchant/statistics/overview?range=7d
GET /merchant/statistics/trend?range=7d
```

提现 Body：

```json
{
  "amount": "10.00",
  "accountType": "WECHAT",
  "accountName": "测试商家",
  "accountNo": "merchant_balance",
  "remark": "测试提现"
}
```

平台审核提现：

```http
GET /admin/withdraws
POST /admin/withdraws/{applyNo}/audit
```

```json
{
  "auditStatus": 3,
  "remark": "提现审核通过"
}
```

## 16. 最终验收顺序

```text
1. 平台登录
2. 平台配置官方商家/客服/Banner/优惠券/公告
3. 用户登录
4. 商家申请
5. 平台审核商家
6. 商家重新登录
7. 商家创建商品
8. 平台审核商品
9. C端首页浏览
10. C端领券
11. C端下普通订单
12. 支付成功
13. B端接单
14. B端发货
15. C端看物流
16. C端联系客服
17. B端回复
18. C端确认收货
19. C端评价
20. B端回复评价
21. C端申请售后
22. B端处理售后
23. 平台查看订单/售后/财务/数据
24. 秒杀下单流程
25. 拼团下单流程
```
