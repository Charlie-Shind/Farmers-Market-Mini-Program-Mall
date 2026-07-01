# C端小程序 API 接入清单

原则：不重做 UI，只把页面逻辑、字段映射、状态判断、跳转和错误提示接实。

## 1. 总服务文件

### `wxapp/miniprogram/config/env.config.ts`

必须改成实际后端地址：

```ts
export const API_BASE_URLS = {
  dev: 'http://你的局域网IP或cpolar:6002/api',
  test: 'https://test-api.example.com/api',
  prod: 'https://api.example.com/api',
};
```

不要直接改 `env.ts`，它只是读取 `env.config.ts`。

### `wxapp/miniprogram/services/app.ts`

必须确认这些函数存在并字段一致：

```ts
fetchBanners                  GET /app/home/banners
fetchQuickEntries             GET /app/home/quick-entries
fetchHotProducts              GET /app/home/hot-products
fetchCategories               GET /app/categories
fetchProducts                 GET /app/products
fetchProductDetail            GET /app/products/:productId
addCartItem                   POST /app/cart/items
fetchCart                     GET /app/cart
previewOrder                  POST /app/orders/preview
createOrder                   POST /app/orders
createWechatPayment           POST /app/payments/wechat
mockWechatCallback            POST /payments/wechat/callback
fetchOrders                   GET /app/orders
fetchOrderDetail              GET /app/orders/:orderNo
fetchOrderLogisticsDetail     GET /app/orders/:orderNo/logistics
confirmOrder                  POST /app/orders/:orderNo/confirm
createRefundApply             POST /app/refunds
submitOrderReview             POST /app/orders/:orderNo/reviews
```

`createOrder` 返回类型必须支持：

```ts
{
  orderNo: string;       // 支付用父订单号
  payAmount: string;
  childOrderNos?: string[];
  orderMode?: string;
}
```

`submitOrderReview` 必须传：

```ts
submitOrderReview(orderNo, {
  reviews: [
    { orderItemId, rating, content, images: [] }
  ]
})
```

## 2. 首页

文件：

```text
pages/index/index.ts
pages/index/index.wxml
```

应该接：

```text
GET /app/home/banners
GET /app/home/quick-entries
GET /app/home/hot-products
GET /app/messages/unread-count
```

要求：

```text
1. Banner 来自后台配置。
2. 快捷入口跳转秒杀、拼团、礼盒、产地直供。
3. 热销商品用后端商品。
4. UI 不改，只改空态和接口失败提示。
```

## 3. 商品浏览

文件：

```text
pages/category/category.ts
pages/category/detail/detail.ts
pages/product/list/list.ts
pages/product/detail/detail.ts
```

接口：

```text
GET /app/categories
GET /app/products
GET /app/products/:productId
GET /app/products/:productId/related
GET /app/traces/:traceCode
POST /app/products/:productId/favorite
DELETE /app/products/:productId/favorite
POST /app/chats/open
```

必须改：

```text
1. 商品卡片价格显示 displayPrice/minPrice。
2. 商品详情多 SKU 使用 skuId。
3. 溯源码入口使用 traceCode，不要写死假码。
4. 联系商家时传 merchantId/productId/sceneType=PRODUCT。
```

## 4. 购物车和结算

文件：

```text
pages/cart/cart.ts
pages/checkout/checkout.ts
```

接口：

```text
POST /app/cart/items
GET /app/cart
PATCH /app/cart/items/:cartId
DELETE /app/cart/items/:cartId
POST /app/orders/preview
POST /app/orders
POST /app/payments/wechat
POST /payments/wechat/callback
GET /app/payments/wechat/status/:orderNo
```

### 必须改的关键点：父/子订单号

下单后：

```ts
const orderResult = await createOrder(orderPayload);
const payOrderNo = orderResult.orderNo;
const detailOrderNo = orderResult.childOrderNos?.[0] || orderResult.orderNo;
```

支付用：

```ts
await createWechatPayment({ orderNo: payOrderNo });
await mockWechatCallback(payOrderNo, orderResult.payAmount);
await fetchWechatPaymentStatus(payOrderNo);
```

跳订单详情用：

```ts
wx.reLaunch({ url: `/pages/order/detail/detail?orderNo=${detailOrderNo}` });
```

### 秒杀模式

`checkout.ts` 必须支持：

```ts
type CheckoutMode = 'cart' | 'groupBuy' | 'flashSale';
```

秒杀 preview/create payload：

```ts
{
  orderMode: 'FLASH_SALE',
  flashSaleItemId,
  skuId,
  quantity,
  addressId,
  couponId,
  usePoints,
}
```

### 拼团模式

拼团 preview/create payload：

```ts
{
  orderMode: 'GROUP_BUY',
  groupBuyId,
  productId,
  skuId,
  quantity: 1,
  addressId,
  couponId,
  usePoints,
}
```

## 5. 订单列表和详情

文件：

```text
pages/order/list/list.ts
pages/order/detail/detail.ts
pages/order/detail/detail.wxml
```

接口：

```text
GET /app/orders
GET /app/orders/:orderNo
POST /app/orders/:orderNo/cancel
POST /app/orders/:orderNo/confirm
POST /app/refunds
POST /app/orders/:orderNo/reviews
```

按钮状态必须按状态机：

```text
待付款：payStatus=0
待接单：payStatus=1 && orderStatus=1 && deliveryStatus=0
待发货：payStatus=1 && orderStatus=2 && deliveryStatus=1
待收货：payStatus=1 && orderStatus=2 && deliveryStatus=2
待评价：orderStatus=3 && 无评价
售后中：refundStatus=1 或 2
退款成功：refundStatus=3
退款拒绝：refundStatus=4
```

`确认收货` 只能在：

```text
payStatus=1 && orderStatus=2 && deliveryStatus=2
```

`去评价` 只能在：

```text
orderStatus=3
```

## 6. 物流详情

文件：

```text
pages/order/logistics/detail/detail.ts
```

接口：

```text
GET /app/orders/:orderNo/logistics
```

要求：

```text
1. orderNo 必须是子订单号。
2. 显示 logisticsCompany/trackingNo/timeline。
3. 后端没有真实物流时可显示模拟轨迹，但必须来自接口返回。
```

## 7. 评价页

文件：

```text
pages/order/review/review.ts
pages/order/review/review.wxml
pages/order/review/review.json
```

接口：

```text
GET /app/orders/:orderNo
POST /app/orders/:orderNo/reviews
```

提交格式：

```ts
await submitOrderReview(orderNo, {
  reviews: items.map(item => ({
    orderItemId: item.orderItemId,
    rating: item.rating,
    content: item.content.trim(),
    images: item.images || [],
  }))
});
```

## 8. 售后申请

文件：

```text
pages/order/detail/detail.ts
```

接口：

```text
POST /app/refunds
```

提交格式：

```ts
await createRefundApply({
  orderNo,
  orderItemId,
  refundAmount,
  applyType: 1,
  applyReason,
  applyImages: [],
});
```

## 9. 聊天客服

文件：

```text
pages/chat/chat.ts
pages/profile/contact/contact.ts
pages/service/help/help.ts
pages/product/detail/detail.ts
pages/order/detail/detail.ts
```

接口：

```text
GET /app/chats/support-target
POST /app/chats/open
GET /app/chats/:conversationId/messages
POST /app/chats/:conversationId/messages
POST /app/chats/:conversationId/read
```

场景：

```text
平台客服：sceneType=OFFICIAL，merchantId=platformSupportMerchantId
商品咨询：sceneType=PRODUCT，merchantId=商品所属商家
订单咨询：sceneType=ORDER，merchantId=订单所属商家，orderNo=子订单号
```

## 10. 秒杀页

文件：

```text
pages/quick/flash-sale/index.ts
pages/quick/flash-sale/index.wxml
services/quick.ts
```

接口：

```text
GET /app/quick/flash-sale/windows
GET /app/quick/flash-sale/items
POST /app/quick/flash-sale/claim
```

按钮逻辑：

```text
不要 addToCart。
必须先 claim，再跳 checkout flashSale。
```

跳转：

```ts
wx.navigateTo({
  url: `/pages/checkout/checkout?mode=flashSale&flashSaleItemId=${claim.itemId}&skuId=${claim.skuId}&quantity=1`,
});
```

## 11. 拼团页

文件：

```text
pages/quick/group-buy/index.ts
pages/quick/group-buy-products/index.ts
```

接口：

```text
POST /app/quick/group-buy/nearby
GET /app/quick/group-buy/products
POST /app/quick/group-buy/join
```

流程：

```text
选拼团商品 → join → 拿 groupBuyId → 跳 checkout?mode=groupBuy
```

## 12. C端不能改的点

```text
1. 不重构页面布局。
2. 不改整体视觉风格。
3. 不删除已有入口。
4. 不把 C端订单详情和 B端订单详情合并。
5. 不把支付改成真微信支付，当前使用 mock callback。
```
