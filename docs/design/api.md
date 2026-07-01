## 近期变更 (2026-06-19)

- **删除旧认证控制器** (`LegacyAuthController`, `/auth/*`)，统一为 `/identity/auth/*`
- **新增路由**: `/identity/auth/wechat/login`, `/identity/auth/wechat/phone-bind`
- **C端新增**: `POST /app/orders/:orderNo/reviews`, `POST /payments/wechat/callback`
- **B端新增**: `GET /merchant/refunds`, `GET /merchant/refunds/:refundNo`, `GET /merchant/reviews`, `GET /merchant/reviews/summary`, `POST /merchant/reviews/:reviewId/reply`, `GET /merchant/workbench`, `GET /merchant/statistics/overview`, `GET /merchant/statistics/trend`, 商品草稿全套
- **C端订单详情** 已补全 `addressSnapshot` / `goodsAmount` / `createdAt` / `remark` / `merchant` 等字段
- **B端订单详情** 已补全 `userAvatar` / `remark` / `cancelReason` / `paidAt` / `completedAt` / `addressSnapshot.detail`

---

我这次是**拿你新传的 `backend.zip` 重新对照**了：

* 后端真实 controller / service / Prisma schema
* 小程序前端 `services/app.ts`
* 小程序前端 `services/merchant.ts`
* B 端设计稿 V10
* C 端设计稿 v1

先给你结论：

> **后端现在能撑基础商城交易，但撑不住你现在 B 端 / C 端最终设计稿的完整演示功能。**
> **最严重缺口在 B 端：活动、SKU、草稿箱、商家售后、配送设置、统计。**
> **C 端缺口相对少：评价、售后列表详情、活动专题、拼团详情、订单筛选。**

另外我纠正一个前面说法：
**商品草稿箱后端实际没有实现。** 前端 `merchant.ts` 里虽然写了 `/merchant/products/drafts`，但代码注释也写了“后端未实现时 fallback 到本地”，而这次我确认 `backend.zip` 里确实没有 draft 相关 controller / schema。

---

# 一、当前后端真实已有能力

## 1. C 端已有接口

C 端现在这些接口已经有：

```text
首页：
GET /app/home/banners
GET /app/home/quick-entries
GET /app/home/hot-products
GET /app/home/merchant-entry-status

商品：
GET /app/categories
GET /app/categories/:categoryId/recommendations
GET /app/search/hot-keywords
GET /app/products
GET /app/products/:productId
GET /app/products/:productId/related
GET /app/traces/:traceCode

收藏：
GET /app/favorites
POST /app/products/:productId/favorite
DELETE /app/products/:productId/favorite

购物车：
GET /app/cart
POST /app/cart/items
PATCH /app/cart/items/:cartId
DELETE /app/cart/items/:cartId

地址：
GET /app/addresses
POST /app/addresses
PATCH /app/addresses/:addressId
DELETE /app/addresses/:addressId

订单：
POST /app/orders/preview
POST /app/orders
GET /app/orders
GET /app/orders/:orderNo
GET /app/orders/:orderNo/logistics
POST /app/orders/:orderNo/cancel
POST /app/orders/:orderNo/confirm
POST /app/orders/:orderNo/reviews

支付：
POST /app/payments/wechat
GET /app/payments/wechat/status/:orderNo
POST /payments/wechat/callback

退款/售后：
POST /app/refunds

消息：
GET /app/messages
GET /app/messages/unread-count
GET /app/messages/:receiptId
POST /app/messages/:receiptId/read
POST /app/messages/read-batch
POST /app/messages/read-all
POST /app/messages/:receiptId/delete

聊天：
POST /app/chats/open
GET /app/chats/support-target
GET /app/chats
GET /app/chats/unread-count
GET /app/chats/:conversationId/messages
POST /app/chats/:conversationId/messages
POST /app/chats/:conversationId/read

优惠券 / 积分：
GET /app/coupons
GET /app/coupons/recommended
GET /app/coupons/available
GET /app/user/coupons
POST /app/coupons/:couponId/receive
GET /app/points/logs
GET /app/points/exchange-items
POST /app/points/exchange
GET /app/assets/summary

店铺公开页：
GET /app/merchants
GET /app/merchants/:merchantId
GET /app/merchants/:merchantId/products
GET /app/merchants/:merchantId/coupons

快捷专区：
GET /app/quick/flash-sale/active
GET /app/quick/flash-sale/windows
GET /app/quick/flash-sale/items
POST /app/quick/flash-sale/claim
GET /app/quick/group-buy/products
POST /app/quick/group-buy/nearby
POST /app/quick/group-buy/join
GET /app/quick/gift-zone/items
GET /app/quick/origin-zone/items

二维码：
POST /app/qr-codes/wxacode
POST /app/qr-codes/share-card
POST /app/qr-codes/scan
GET /app/qr-codes/redirect
```

C 端基础电商流已经比较完整。

---

## 2. B 端已有接口

B 端现在已有：

```text
商家入驻：
POST /merchant/apply

商家首页 / 资料：
GET /merchant/dashboard
GET /merchant/profile

商品：
GET /merchant/products
POST /merchant/products
GET /merchant/products/:productId
PUT /merchant/products/:productId
PATCH /merchant/products/:productId/status
PATCH /merchant/skus/:skuId/stock

活动：
GET /merchant/activities
POST /merchant/activities
PATCH /merchant/activities/:activityId
DELETE /merchant/activities/:activityId

订单：
GET /merchant/orders
GET /merchant/orders/:orderNo
POST /merchant/orders/:orderNo/accept
POST /merchant/orders/:orderNo/ship

退款/售后：
GET /merchant/refunds
GET /merchant/refunds/:refundNo
POST /merchant/refunds/:refundNo/process

评价：
GET /merchant/reviews
GET /merchant/reviews/summary
POST /merchant/reviews/:reviewId/reply

聊天：
GET /merchant/chats
GET /merchant/chats/unread-count
GET /merchant/chats/:conversationId/messages
POST /merchant/chats/:conversationId/messages
POST /merchant/chats/:conversationId/read

工作台 / 统计：
GET /merchant/workbench
GET /merchant/statistics/overview
GET /merchant/statistics/trend

商品草稿：
GET /merchant/products/drafts
POST /merchant/products/drafts
GET /merchant/products/drafts/:draftRef
POST /merchant/products/drafts/:draftRef
POST /merchant/products/drafts/:draftRef/delete

钱包 / 财务：
GET /merchant/wallet
GET /merchant/finance/records
GET /merchant/withdraws
POST /merchant/withdraws

文件：
POST /files/upload
```

这些可以撑“商家端基础版”，但撑不住现在设计稿里的完整功能。

---

# 二、后端和前端已有代码的实际问题

## 1. 前端有商品草稿接口，后端没有

前端 `services/merchant.ts` 里有：

```text
POST /merchant/products/drafts
GET /merchant/products/drafts/:draftId
```

但是后端：

```text
没有 controller
没有 service
没有 prisma model
```

所以商品草稿箱现在只能本地假数据或本地缓存。
你的设计稿里有商品草稿箱，这是**必须补后端**的。

---

## 2. B 端活动接口太假

后端 `Activity` 表现在只有：

```text
activityName
activityType
status
startAt
endAt
productCount
```

没有：

```text
merchantId
活动商品
活动 SKU
活动规则 JSON
活动库存
活动价格
活动限购
活动数据
活动草稿
活动详情
```

更严重的是：
`/merchant/activities` 虽然放在 merchant controller 里，但底层 `Activity` 表没有 `merchantId`，也就是说现在活动更像“平台全局活动”，不是“某个商家的活动”。

这和你的 B 端设计稿不匹配。

---

## 3. B 端商品多规格创建有一点支持，但编辑会丢多规格

创建商品 `createMerchantProduct` 支持：

```text
body.skus[]
```

也就是创建时可以创建多个 SKU。

但是编辑商品 `updateMerchantProduct` 现在是：

```text
先 deleteMany productSku
再 create 一个默认 SKU
```

也就是说：
**你编辑商品时，多规格会被打回单规格。**

这个必须修。否则你设计稿里“编辑 SKU / 删除规格 / 多规格组合”没有后端支撑。

---

## 4. B 端订单列表数据不够

现在 `GET /merchant/orders` 返回：

```text
orderNo
userName
status
payStatus
deliveryStatus
totalAmount
payAmount
createdAt
```

缺少设计稿订单卡片需要的：

```text
买家头像
买家手机号
商品图片
商品标题
商品数量
订单项预览
退款状态
是否可接单
是否可发货
是否可联系买家
```

订单详情有 items，但列表没有。
所以 B 端订单列表想做成“头像 + 商品图 + 操作按钮”的结构，需要补返回字段。

---

## 5. B 端提现字段前后端有小错位

后端提现列表返回的是：

```text
withdrawNo
amount
fee
status
auditedAt
auditedBy
remark
createdAt
```

前端 `MerchantWithdrawRecord` 类型写的是：

```text
applyNo
amount
fee
status
remark
createdAt
```

也就是 `applyNo / withdrawNo` 不一致。
这会导致页面取字段时可能显示空。

建议统一成：

```text
withdrawNo
```

或者后端兼容返回：

```text
withdrawNo
applyNo
```

---

## 6. C 端订单详情缺地址快照

C 端 `GET /app/orders/:orderNo` 返回商品、金额、物流等，但没有返回：

```text
addressSnapshot
createdAt
remark
cancelReason
```

结算页有 addressSnapshot，B 端订单详情也有 addressSnapshot，但 C 端订单详情没有。
你的 C 端订单详情设计稿需要收货地址，所以这里要补。

---

# 三、B 端缺失接口详细方案

下面按模块说，哪些必须补，怎么补。

---

# B-1. 商家工作台 / 首页统计

## 当前情况

已有：

```text
GET /merchant/dashboard
```

但它返回的是：

```text
shop
heroStats
shortcuts
todos
orders
finance
```

问题：

* 没有趋势图数据
* 没有订单状态分布
* 没有访客 / 转化率
* 没有今日 / 7日 / 30日切换
* 待办里有描述性字段，但你现在设计稿不想靠描述性文案撑页面

## 建议补

```text
GET /merchant/workbench
GET /merchant/statistics/overview?range=today|7d|30d
GET /merchant/statistics/trend?range=7d|30d
GET /merchant/statistics/todos
```

## 返回建议

```ts
type MerchantWorkbench = {
  shop: {
    merchantId: number;
    storeName: string;
    storeLogo: string;
    status: '营业中' | '待审核' | '已驳回';
  };
  metrics: {
    payAmount: string;
    orderCount: number;
    visitorCount: number;
    conversionRate: string;
    refundCount: number;
  };
  todos: {
    pendingAccept: number;
    pendingShip: number;
    pendingRefund: number;
    lowStock: number;
    draftProducts: number;
    draftActivities: number;
  };
  trend: Array<{
    date: string;
    payAmount: string;
    orderCount: number;
    visitorCount: number;
  }>;
};
```

## 数据来源

不用先新增表也能做：

```text
订单表 orders
退款表 refund_apply
商品 SKU 表 product_sku
商品草稿表 product_draft，新增后可用
活动草稿表 activity_draft，新增后可用
```

访客数如果现在没有埋点，可以先返回 0 或 mock，但接口结构先定。

---

# B-2. 商品列表筛选

## 当前情况

已有：

```text
GET /merchant/products?page&pageSize
```

后端实际只按 merchantId 查，没有处理：

```text
keyword
status
auditStatus
stockStatus
categoryId
```

## 必须补参数

```text
GET /merchant/products
```

支持：

```ts
{
  page?: number;
  pageSize?: number;
  keyword?: string;
  status?: 'ON_SHELF' | 'OFF_SHELF' | 'DRAFT';
  auditStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
  stockStatus?: 'LOW' | 'OUT' | 'NORMAL';
  categoryId?: number;
  activityId?: number;
}
```

## 返回建议补充

现在返回字段太少，建议加：

```ts
{
  productId: number;
  title: string;
  subtitle: string;
  coverUrl: string;
  categoryName: string;

  status: string;
  auditStatus: string;
  auditRemark?: string;

  minPrice: string;
  maxPrice: string;
  totalStock: number;
  lockedStock: number;
  safetyStock: number;
  lowStock: boolean;

  skuCount: number;
  imageCount: number;
  videoCount: number;

  activityCount: number;
  updatedAt: string;
}
```

---

# B-3. 商品详情 / 多规格 SKU

## 当前情况

已有：

```text
GET /merchant/products/:productId
POST /merchant/products
PUT /merchant/products/:productId
PATCH /merchant/skus/:skuId/stock
```

问题：

1. 创建商品支持 `skus[]`
2. 编辑商品不支持 `skus[]`
3. 独立 SKU 删除、停用、批量改价、批量改库存都没有
4. 商品详情目前只返回第一条 sku 的 `skuName / specJson / price / stock`

## 必须改造 1：商品详情返回完整 SKU

```text
GET /merchant/products/:productId
```

增加：

```ts
skus: Array<{
  skuId: number;
  skuName: string;
  skuCode: string;
  imageUrl: string;
  specJson: Record<string, string>;
  price: string;
  originalPrice: string;
  offlinePrice?: string | null;
  stock: number;
  lockedStock: number;
  safetyStock: number;
  status: '启用' | '停用';
}>
```

## 必须改造 2：编辑商品支持多 SKU

```text
PUT /merchant/products/:productId
```

payload 支持：

```ts
{
  title: string;
  subtitle?: string;
  categoryId: number;
  coverUrl?: string;
  images: string[];
  videos: Array<{
    videoUrl: string;
    coverUrl?: string;
  }>;
  detailDesc?: string;
  originPlace?: string;
  serviceTags?: string[];

  skuMode: 'SINGLE' | 'MULTI';

  specGroups?: Array<{
    name: string;
    values: string[];
  }>;

  skus: Array<{
    skuId?: number;
    skuName: string;
    skuCode?: string;
    imageUrl?: string;
    specJson: Record<string, string>;
    price: string;
    originalPrice?: string;
    offlinePrice?: string;
    stock: number;
    safetyStock?: number;
    status?: number;
  }>;
}
```

## 必须改造 3：SKU 独立接口

建议补：

```text
GET    /merchant/products/:productId/skus
PUT    /merchant/products/:productId/skus
PATCH  /merchant/skus/:skuId
PATCH  /merchant/skus/:skuId/status
DELETE /merchant/skus/:skuId
POST   /merchant/products/:productId/skus/batch-update
```

## 批量编辑接口示例

```ts
POST /merchant/products/:productId/skus/batch-update

{
  skuIds: number[];
  price?: string;
  stock?: number;
  safetyStock?: number;
  status?: 1 | 0;
}
```

---

# B-4. 商品草稿箱

## 当前情况

前端有 fallback，后端没有。

## 新增 Prisma model

```prisma
model ProductDraft {
  id          BigInt   @id @default(autoincrement())
  merchantId  BigInt   @map("merchant_id")
  draftNo     String   @unique @map("draft_no") @db.VarChar(64)
  title       String?  @db.VarChar(128)
  coverUrl    String?  @map("cover_url") @db.VarChar(255)
  payloadJson Json     @map("payload_json")
  updatedAt   DateTime @updatedAt @map("updated_at") @db.Timestamp(6)
  createdAt   DateTime @default(now()) @map("created_at") @db.Timestamp(6)

  merchant    Merchant @relation(fields: [merchantId], references: [id])

  @@index([merchantId, updatedAt])
  @@map("product_draft")
}
```

## 新增接口

```text
GET    /merchant/products/drafts
POST   /merchant/products/drafts
GET    /merchant/products/drafts/:draftId
PUT    /merchant/products/drafts/:draftId
DELETE /merchant/products/drafts/:draftId
POST   /merchant/products/drafts/:draftId/publish
```

## 前端对应

你现在 `syncMerchantProductDraft()` 只能新增和读取。
需要补：

```ts
fetchMerchantProductDrafts()
updateMerchantProductDraft()
deleteMerchantProductDraft()
publishMerchantProductDraft()
```

---

# B-5. 商品视频上传

## 当前情况

已有：

```text
POST /files/upload
```

支持最大 50MB，理论上图片视频都可以上传。

## 问题

缺：

```text
文件删除
视频封面生成
文件类型限制
视频大小 / 时长校验
```

## 建议补

MVP 可以先只补删除：

```text
DELETE /files
```

payload：

```ts
{
  url: string;
}
```

更完整可以做：

```text
POST /files/upload
DELETE /files/:fileId
POST /files/video/cover
```

但是如果你现在只演示，不急着做封面生成。商品视频可以直接上传视频 + 手动上传封面。

---

# B-6. 活动模块，这是最大缺口

## 当前情况

已有：

```text
GET /merchant/activities
POST /merchant/activities
PATCH /merchant/activities/:activityId
DELETE /merchant/activities/:activityId
```

但是目前 Activity 表太简单：

```text
activityName
activityType
status
startAt
endAt
productCount
```

问题：

* 没有 merchantId
* 没有活动详情接口
* 没有活动商品关联
* 没有活动 SKU
* 没有秒杀价 / 拼团价 / 库存 / 限购
* 没有满减券规则统一结构
* 没有活动草稿
* 没有活动数据
* 没有发布 / 暂停 / 结束 / 复制状态操作
* 选品只是前端假多选

## 必须改表：Activity

建议改成：

```prisma
model Activity {
  id            BigInt    @id @default(autoincrement())
  merchantId    BigInt?   @map("merchant_id")
  activityName  String    @map("activity_name") @db.VarChar(128)
  activityType  String    @map("activity_type") @db.VarChar(32)
  status        String    @default("DRAFT") @db.VarChar(32)
  startAt       DateTime? @map("start_at") @db.Timestamp(6)
  endAt         DateTime? @map("end_at") @db.Timestamp(6)
  productCount  Int       @default(0) @map("product_count")
  ruleJson      Json?     @map("rule_json")
  remark        String?   @db.VarChar(255)

  createdAt     DateTime  @default(now()) @map("created_at") @db.Timestamp(6)
  updatedAt     DateTime  @updatedAt @map("updated_at") @db.Timestamp(6)
  deletedAt     DateTime? @map("deleted_at") @db.Timestamp(6)

  merchant      Merchant? @relation(fields: [merchantId], references: [id])
  products      ActivityProduct[]

  @@index([merchantId, status])
  @@index([activityType, status])
  @@map("activity")
}
```

## 新增活动商品表

```prisma
model ActivityProduct {
  id          BigInt   @id @default(autoincrement())
  activityId  BigInt   @map("activity_id")
  productId   BigInt   @map("product_id")
  skuId       BigInt?  @map("sku_id")

  activityPrice Decimal? @map("activity_price") @db.Decimal(18, 2)
  activityStock Int?     @map("activity_stock")
  limitPerUser  Int?     @map("limit_per_user")

  sortOrder   Int      @default(0) @map("sort_order")
  status      String   @default("ENABLED") @db.VarChar(32)

  createdAt   DateTime @default(now()) @map("created_at") @db.Timestamp(6)
  updatedAt   DateTime @updatedAt @map("updated_at") @db.Timestamp(6)

  activity    Activity @relation(fields: [activityId], references: [id])
  product     Product  @relation(fields: [productId], references: [id])
  sku         ProductSku? @relation(fields: [skuId], references: [id])

  @@index([activityId])
  @@index([productId])
  @@map("activity_product")
}
```

## 活动类型规则

设计稿 V10 里的活动类型可以这样落库：

### 限时秒杀

```ts
ruleJson: {
  type: 'SECKILL',
  startAt: string;
  endAt: string;
  limitPerUser: number;
  stockMode: 'ACTIVITY_STOCK' | 'SKU_STOCK';
  warningStock: number;
}
```

每个选中商品 / SKU 在 `ActivityProduct` 里存：

```ts
activityPrice
activityStock
limitPerUser
```

### 拼团

```ts
ruleJson: {
  type: 'GROUP_BUY',
  needed: number;
  expireHours: number;
  startAt: string;
  endAt: string;
  limitPerUser: number;
}
```

`ActivityProduct` 存：

```ts
activityPrice = 拼团价
activityStock = 活动库存
```

### 满减 / 优惠券

```ts
ruleJson: {
  type: 'CASHBACK',
  thresholdAmount: string;
  discountAmount: string;
  couponStock: number;
  perUserLimit: number;
  startAt: string;
  endAt: string;
}
```

可以继续同步到现有 `Coupon` 表。

### 预售

你设计稿里有预售演示，如果要真实做，需要：

```ts
ruleJson: {
  type: 'PRESALE',
  depositAmount: string;
  finalPaymentStartAt: string;
  finalPaymentEndAt: string;
  deliveryStartAt: string;
  limitPerUser: number;
}
```

---

## 活动接口完整方案

### 活动列表

```text
GET /merchant/activities
```

支持：

```ts
{
  page?: number;
  pageSize?: number;
  keyword?: string;
  activityType?: 'SECKILL' | 'GROUP_BUY' | 'CASHBACK' | 'PRESALE';
  status?: 'DRAFT' | 'PUBLISHED' | 'PAUSED' | 'ENDED';
}
```

返回：

```ts
{
  page: number;
  pageSize: number;
  total: number;
  items: Array<{
    activityId: number;
    title: string;
    activityType: string;
    activityTypeLabel: string;
    status: string;
    statusLabel: string;
    startAt: string;
    endAt: string;
    productCount: number;
    orderCount: number;
    payAmount: string;
  }>;
}
```

### 活动详情

```text
GET /merchant/activities/:activityId
```

返回：

```ts
{
  activityId: number;
  title: string;
  activityType: string;
  status: string;
  startAt: string;
  endAt: string;
  ruleJson: Record<string, any>;
  products: Array<{
    id: number;
    productId: number;
    skuId?: number;
    title: string;
    coverUrl: string;
    skuName?: string;
    originalPrice: string;
    activityPrice?: string;
    activityStock?: number;
    soldCount?: number;
    limitPerUser?: number;
  }>;
}
```

### 创建 / 编辑活动

```text
POST /merchant/activities
PATCH /merchant/activities/:activityId
```

payload：

```ts
{
  title: string;
  activityType: 'SECKILL' | 'GROUP_BUY' | 'CASHBACK' | 'PRESALE';
  status: 'DRAFT' | 'PUBLISHED';
  startAt: string;
  endAt: string;
  ruleJson: Record<string, any>;
  products: Array<{
    productId: number;
    skuId?: number;
    activityPrice?: string;
    activityStock?: number;
    limitPerUser?: number;
  }>;
}
```

### 活动状态操作

```text
POST /merchant/activities/:activityId/publish
POST /merchant/activities/:activityId/pause
POST /merchant/activities/:activityId/finish
POST /merchant/activities/:activityId/copy
```

### 活动选品

```text
GET /merchant/activities/product-candidates
```

支持：

```ts
{
  keyword?: string;
  categoryId?: number;
  stockStatus?: 'NORMAL' | 'LOW' | 'OUT';
  status?: 'ON_SHELF';
  page?: number;
  pageSize?: number;
}
```

返回商品 + SKU：

```ts
{
  productId: number;
  title: string;
  coverUrl: string;
  categoryName: string;
  totalStock: number;
  minPrice: string;
  maxPrice: string;
  skus: Array<{
    skuId: number;
    skuName: string;
    price: string;
    stock: number;
  }>;
}
```

### 活动数据

```text
GET /merchant/activities/:activityId/statistics
```

返回：

```ts
{
  activityId: number;
  viewCount: number;
  orderCount: number;
  buyerCount: number;
  payAmount: string;
  conversionRate: string;
  products: Array<{
    productId: number;
    title: string;
    coverUrl: string;
    viewCount: number;
    orderCount: number;
    payAmount: string;
  }>;
  trend: Array<{
    date: string;
    viewCount: number;
    orderCount: number;
    payAmount: string;
  }>;
}
```

---

# B-7. 活动草稿箱

## 新增表

```prisma
model ActivityDraft {
  id          BigInt   @id @default(autoincrement())
  merchantId  BigInt   @map("merchant_id")
  draftNo     String   @unique @map("draft_no") @db.VarChar(64)
  title       String?  @db.VarChar(128)
  activityType String? @map("activity_type") @db.VarChar(32)
  payloadJson Json     @map("payload_json")
  updatedAt   DateTime @updatedAt @map("updated_at") @db.Timestamp(6)
  createdAt   DateTime @default(now()) @map("created_at") @db.Timestamp(6)

  merchant    Merchant @relation(fields: [merchantId], references: [id])

  @@index([merchantId, updatedAt])
  @@map("activity_draft")
}
```

## 接口

```text
GET    /merchant/activities/drafts
POST   /merchant/activities/drafts
GET    /merchant/activities/drafts/:draftId
PUT    /merchant/activities/drafts/:draftId
DELETE /merchant/activities/drafts/:draftId
POST   /merchant/activities/drafts/:draftId/publish
```

---

# B-8. 商家售后 / 退款管理

## 当前情况

已有：

```text
POST /merchant/refunds/:refundNo/process
```

没有：

```text
售后列表
退款详情
筛选
退款协商记录
```

## 必须补

```text
GET /merchant/refunds
GET /merchant/refunds/:refundNo
POST /merchant/refunds/:refundNo/process
```

列表参数：

```ts
{
  page?: number;
  pageSize?: number;
  keyword?: string;
  status?: number;
  applyType?: number;
}
```

详情返回：

```ts
{
  refundNo: string;
  orderNo: string;
  buyer: {
    userId: number;
    nickname: string;
    avatarUrl: string;
    mobile: string;
  };
  item: {
    productId: number;
    skuId: number;
    title: string;
    skuName: string;
    coverUrl: string;
    quantity: number;
    price: string;
  };
  applyType: number;
  applyReason: string;
  applyImages: string[];
  refundAmount: string;
  status: number;
  merchantRemark?: string;
  adminRemark?: string;
  createdAt: string;
  processedAt?: string;
}
```

---

# B-9. 评价管理

## 当前情况

没有评价表，也没有评价接口。

## 新增表

```prisma
model ProductReview {
  id          BigInt   @id @default(autoincrement())
  orderNo     String   @map("order_no") @db.VarChar(64)
  orderItemId BigInt   @map("order_item_id")
  productId   BigInt   @map("product_id")
  skuId       BigInt   @map("sku_id")
  userId      BigInt   @map("user_id")
  merchantId  BigInt   @map("merchant_id")
  rating      Int      @default(5)
  content     String?  @db.Text
  images      Json?
  replyContent String? @map("reply_content") @db.Text
  repliedAt   DateTime? @map("replied_at") @db.Timestamp(6)
  status      String   @default("VISIBLE") @db.VarChar(32)

  createdAt   DateTime @default(now()) @map("created_at") @db.Timestamp(6)
  updatedAt   DateTime @updatedAt @map("updated_at") @db.Timestamp(6)

  @@index([productId])
  @@index([merchantId])
  @@index([userId])
  @@map("product_review")
}
```

## B 端接口

```text
GET  /merchant/reviews
POST /merchant/reviews/:reviewId/reply
PATCH /merchant/reviews/:reviewId/status
```

---

# B-10. 配送设置

## 当前情况

后端只有：

```text
POST /merchant/orders/:orderNo/ship
```

以及后台 admin 有：

```text
GET /admin/logistics
```

但 B 端配送设置页需要商家自己的配置。

## 新增表

```prisma
model MerchantDeliverySetting {
  id              BigInt   @id @default(autoincrement())
  merchantId      BigInt   @unique @map("merchant_id")
  senderName      String?  @map("sender_name") @db.VarChar(64)
  senderMobile    String?  @map("sender_mobile") @db.VarChar(20)
  senderAddress   String?  @map("sender_address") @db.VarChar(255)
  defaultCompany  String?  @map("default_company") @db.VarChar(64)
  coldChainEnabled Boolean @default(false) @map("cold_chain_enabled")
  restrictedRegions Json? @map("restricted_regions")
  updatedAt       DateTime @updatedAt @map("updated_at") @db.Timestamp(6)
  createdAt       DateTime @default(now()) @map("created_at") @db.Timestamp(6)

  merchant        Merchant @relation(fields: [merchantId], references: [id])

  @@map("merchant_delivery_setting")
}
```

如果要支持多个运费模板，再加：

```prisma
model MerchantFreightTemplate {
  id              BigInt   @id @default(autoincrement())
  merchantId      BigInt   @map("merchant_id")
  name            String   @db.VarChar(128)
  province        String?  @db.VarChar(64)
  thresholdAmount Decimal? @map("threshold_amount") @db.Decimal(18, 2)
  freightAmount   Decimal  @map("freight_amount") @db.Decimal(18, 2)
  active          Boolean  @default(true)

  createdAt       DateTime @default(now()) @map("created_at") @db.Timestamp(6)
  updatedAt       DateTime @updatedAt @map("updated_at") @db.Timestamp(6)

  @@index([merchantId, active])
  @@map("merchant_freight_template")
}
```

## 接口

```text
GET /merchant/delivery/settings
PUT /merchant/delivery/settings

GET /merchant/delivery/templates
POST /merchant/delivery/templates
PUT /merchant/delivery/templates/:templateId
DELETE /merchant/delivery/templates/:templateId

GET /merchant/logistics/companies
```

---

# B-11. 店铺资料 / 认证 / 安全

## 当前情况

已有：

```text
GET /merchant/profile
POST /merchant/apply
```

缺少：

```text
修改店铺资料
上传/修改资质
账号安全设置
```

## 建议补

```text
PUT   /merchant/profile
PATCH /merchant/profile/logo
GET   /merchant/qualifications
POST  /merchant/qualifications
DELETE /merchant/qualifications/:qualificationId

GET /merchant/security
PUT /merchant/security
```

其中安全设置可以先轻量：

```ts
{
  contactMobile: string;
  bindWechat: boolean;
  lastLoginAt: string;
}
```

---

# B-12. 商家通知

## 当前情况

B 端有聊天，但没有商家通知列表。
C 端有 `/app/messages`，但那是用户消息收件箱。

## 建议补

可以复用现有：

```text
system_message
user_message
```

因为商家本质也对应一个 userId。

新增接口：

```text
GET  /merchant/notices
GET  /merchant/notices/:noticeId
POST /merchant/notices/:noticeId/read
POST /merchant/notices/read-all
```

通知类型：

```text
订单通知
售后通知
活动通知
商品审核通知
系统通知
```

---

# 四、C 端缺失接口详细方案

你说底部 nav 页面和商品详情不能改，所以这里主要服务 C 端设计稿里的二级页。

---

# C-1. 订单状态筛选

## 当前情况

`GET /app/orders` 只支持：

```text
page
pageSize
keyword
```

没有状态筛选。

## 建议补

```text
GET /app/orders?status=&keyword=&page=&pageSize=
```

支持：

```ts
status:
  | 'ALL'
  | 'PENDING_PAY'
  | 'PENDING_ACCEPT'
  | 'PENDING_SHIP'
  | 'PENDING_RECEIVE'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'REFUNDING'
```

后端转换到：

```text
orderStatus
payStatus
deliveryStatus
refundStatus
```

## 同时补返回字段

现在 C 端订单列表缺 `createdAt`，建议补：

```ts
{
  orderNo: string;
  storeName: string;
  merchantId: number;
  status: string;
  orderStatus: string;
  createdAt: string;
  payAmount: string;
  items: [...]
}
```

---

# C-2. C 端订单详情补地址和售后状态

## 当前情况

`GET /app/orders/:orderNo` 没有返回 `addressSnapshot`。

## 建议补字段

```ts
{
  orderNo: string;
  storeName: string;
  merchantId: number;
  addressSnapshot: {
    name: string;
    mobile: string;
    province: string;
    city: string;
    district: string;
    detail: string;
  };
  remark: string;
  createdAt: string;
  paidAt: string | null;
  completedAt: string | null;
  cancelReason: string | null;
  refund?: {
    refundNo: string;
    status: number;
    statusLabel: string;
    refundAmount: string;
  } | null;
}
```

---

# C-3. C 端评价

## 当前情况

没有评价表，没有评价接口。

## 必须补

```text
POST /app/orders/:orderNo/reviews
GET  /app/orders/:orderNo/reviews
GET  /app/reviews/my
```

发布评价 payload：

```ts
{
  orderItemId: number;
  rating: number;
  content?: string;
  images?: string[];
}
```

这个和 B 端评价管理共用 `ProductReview` 表。

---

# C-4. C 端售后 / 退款列表详情

## 当前情况

只有：

```text
POST /app/refunds
```

也就是用户申请退款。

## 缺

```text
GET /app/refunds
GET /app/refunds/:refundNo
POST /app/refunds/:refundNo/cancel
POST /app/refunds/:refundNo/supplement
```

列表返回：

```ts
{
  refundNo: string;
  orderNo: string;
  status: number;
  statusLabel: string;
  refundAmount: string;
  item: {
    title: string;
    skuName: string;
    coverUrl: string;
  };
  createdAt: string;
}
```

详情返回和 B 端类似，只是不要返回商家内部字段。

---

# C-5. 活动专题页

## 当前情况

C 端有：

```text
秒杀专区
拼团专区
礼盒专区
产地直供
```

但是没有统一活动专题接口。

## 建议补

```text
GET /app/activities
GET /app/activities/:activityId
GET /app/activities/:activityId/products
```

返回要从 B 端新增的 `Activity + ActivityProduct` 读取。

活动列表：

```ts
{
  activityId: number;
  title: string;
  activityType: string;
  activityTypeLabel: string;
  startAt: string;
  endAt: string;
  status: string;
  productCount: number;
}
```

活动商品：

```ts
{
  productId: number;
  skuId?: number;
  title: string;
  coverUrl: string;
  price: string;
  activityPrice?: string;
  soldCount?: number;
  stockLeft?: number;
}
```

---

# C-6. 拼团详情 / 我的拼团

## 当前情况

已有：

```text
GET /app/quick/group-buy/products
POST /app/quick/group-buy/nearby
POST /app/quick/group-buy/join
```

缺：

```text
GET /app/group-buys/:groupId
GET /app/group-buys/my
POST /app/group-buys/:groupId/join
```

虽然现在 `/app/quick/group-buy/join` 可以拼团，但 C 端如果要展示详情页、成员头像、邀请码、剩余时间，就需要详情接口。

---

# C-7. 意见反馈

## 当前情况

没有正式反馈接口。
可以临时走聊天，但如果要做“意见反馈”页，需要：

```text
POST /app/feedback
GET /app/feedback/my
```

可以新增表：

```prisma
model Feedback {
  id        BigInt   @id @default(autoincrement())
  userId    BigInt   @map("user_id")
  type      String   @db.VarChar(32)
  content   String   @db.Text
  images    Json?
  status    String   @default("PENDING") @db.VarChar(32)
  reply     String?  @db.Text
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamp(6)
  updatedAt DateTime @updatedAt @map("updated_at") @db.Timestamp(6)

  @@index([userId, status])
  @@map("feedback")
}
```

---

# C-8. 公开个人主页

你 C 端设计稿有个人主页展示页。
如果只是自己看自己，用：

```text
GET /identity/auth/me
GET /app/assets/summary
```

够用。

如果要别人访问某个用户主页，需要补：

```text
GET /app/users/:userId/profile
```

MVP 可以不补，除非你真的要社交展示。

---

# 五、哪些不用补后端，只改前端即可

避免乱加后端，这些不用补：

## 1. 首页 / 工作台功能入口

入口只是跳转，不需要接口。
只有入口上的数字角标才需要 `/merchant/statistics/todos`。

## 2. SVG / 图片丰富页面

本地静态资源，不需要接口。
真实商品图、头像走已有字段。

## 3. 商品视频上传入口

已有 `/files/upload`，MVP 可以先用。
只有“删除服务器文件、自动生成封面”才需要新接口。

## 4. 筛选弹层 UI

弹层本身不用接口。
只有筛选条件要后端分页生效时才需要给列表接口加 query 参数。

## 5. 活动类型选择器

选择器本身不用接口。
真正需要补的是活动规则保存和活动商品关联。

---

# 六、推荐开发优先级

## 第一阶段：先把已有设计稿能真实跑起来

这一阶段最重要，建议先做：

```text
1. B端商品多规格编辑修复
2. B端商品草稿箱
3. B端活动详情
4. B端活动规则 ruleJson
5. B端活动商品关联 ActivityProduct
6. B端活动草稿箱
7. B端订单列表补商品图/买家头像
8. C端订单状态筛选
9. C端订单详情补地址快照
```

这阶段做完，你的 B/C 设计稿主体就能接真实后端。

---

## 第二阶段：补运营能力

```text
1. B端活动数据统计
2. B端商家工作台趋势图
3. B端售后列表和退款详情
4. B端配送设置
5. B端通知
6. C端活动专题
7. C端售后列表/详情
```

这阶段做完，演示就比较完整。

---

## 第三阶段：完善体验型功能

```text
1. C端评价
2. B端评价回复
3. C端拼团详情 / 我的拼团
4. 文件删除 / 视频封面
5. 意见反馈
6. 公开个人主页
```

这阶段是上线质感，不是第一优先级。

---

# 七、最关键的数据库改造清单

必须新增：

```text
ProductDraft
ActivityProduct
ActivityDraft
ProductReview
MerchantDeliverySetting
MerchantFreightTemplate
```

建议给 Activity 增加：

```text
merchantId
ruleJson
remark
```

可选新增：

```text
Feedback
```

---

# 八、最关键的接口清单

## B 端必须补

```text
GET    /merchant/workbench
GET    /merchant/statistics/overview
GET    /merchant/statistics/trend
GET    /merchant/statistics/todos

GET    /merchant/products?keyword&status&auditStatus&stockStatus&categoryId
GET    /merchant/products/:productId/skus
PUT    /merchant/products/:productId/skus
PATCH  /merchant/skus/:skuId
PATCH  /merchant/skus/:skuId/status
DELETE /merchant/skus/:skuId
POST   /merchant/products/:productId/skus/batch-update

GET    /merchant/products/drafts
POST   /merchant/products/drafts
GET    /merchant/products/drafts/:draftId
PUT    /merchant/products/drafts/:draftId
DELETE /merchant/products/drafts/:draftId
POST   /merchant/products/drafts/:draftId/publish

GET    /merchant/activities/:activityId
GET    /merchant/activities/product-candidates
POST   /merchant/activities/:activityId/publish
POST   /merchant/activities/:activityId/pause
POST   /merchant/activities/:activityId/finish
POST   /merchant/activities/:activityId/copy
GET    /merchant/activities/:activityId/statistics

GET    /merchant/activities/drafts
POST   /merchant/activities/drafts
GET    /merchant/activities/drafts/:draftId
PUT    /merchant/activities/drafts/:draftId
DELETE /merchant/activities/drafts/:draftId
POST   /merchant/activities/drafts/:draftId/publish

GET    /merchant/refunds
GET    /merchant/refunds/:refundNo

GET    /merchant/reviews
POST   /merchant/reviews/:reviewId/reply

GET    /merchant/delivery/settings
PUT    /merchant/delivery/settings
GET    /merchant/delivery/templates
POST   /merchant/delivery/templates
PUT    /merchant/delivery/templates/:templateId
DELETE /merchant/delivery/templates/:templateId

PUT    /merchant/profile
GET    /merchant/notices
GET    /merchant/notices/:noticeId
POST   /merchant/notices/:noticeId/read
POST   /merchant/notices/read-all
```

## C 端必须补

```text
GET  /app/orders?status=&keyword=&page=&pageSize=
GET  /app/orders/:orderNo        增加 addressSnapshot / createdAt / remark / refund

POST /app/orders/:orderNo/reviews
GET  /app/orders/:orderNo/reviews
GET  /app/reviews/my

GET  /app/refunds
GET  /app/refunds/:refundNo
POST /app/refunds/:refundNo/cancel
POST /app/refunds/:refundNo/supplement

GET  /app/activities
GET  /app/activities/:activityId
GET  /app/activities/:activityId/products

GET  /app/group-buys/:groupId
GET  /app/group-buys/my
```

---

# 九、最终判断

现在后端状态可以这样理解：

```text
C端：基础商城 75% 已有，交易后链路缺 25%
B端：基础商家管理 45% 已有，运营管理缺 55%
```

最先别碰太散的功能，先把这 4 个核心补上：

```text
1. 商品多规格编辑
2. 商品草稿箱
3. 活动规则 + 活动商品
4. 商家订单/售后列表数据补全
```

这 4 个补完，你现在 B 端设计稿基本就能从“纯演示 HTML”变成“能接真实数据的小程序页面”。
