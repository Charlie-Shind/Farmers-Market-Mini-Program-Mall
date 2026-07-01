# 05-实现-Prisma-ORM

> 第一版 Prisma 模型落地说明，和当前仓库里的 `schema.prisma` / `prisma.config.ts` 保持一致。

## 0. 当前落地状态

当前 Prisma 已经不是单纯的草案，而是进入了**可开发的第一阶段结构**。  
仓库里的 `backend/prisma/schema.prisma` 已经覆盖了核心交易链路和后台账号体系，`DATABASE_URL` 则由 `backend/prisma.config.ts` 读取 `.env.local` 提供。

当前已落地的模型包括：

```text
User
Role
UserRole
UserAddress
Merchant
MerchantQualification
MerchantWallet
WithdrawApply
Category
Product
ProductSku
ProductImage
ProductVideo
ProductTrace
CartItem
Order
OrderItem
PaymentRecord
DeliveryRecord
RefundApply
AdminUser
AdminRole
AdminUserRole
AdminOperationLog
```

当前还未落库、但文档里已经预留的扩展模型包括：

```text
coupon
user_coupon
activity
activity_product
points_log
community_leader
leader_user_relation
pickup_point
commission_rule
commission_record
leader_withdraw_apply
```

## 1. 第一版 ORM 表范围

第一阶段优先保证核心交易闭环和后台治理能力，所以基础版先落这些表：

```text
User                    用户
Role                    角色
UserRole                用户角色关联
UserAddress             用户收货地址
Merchant                商家
MerchantQualification   商家资质
MerchantWallet          商家钱包
WithdrawApply           商家提现申请
Category                商品分类
Product                 商品
ProductSku              商品 SKU
ProductImage            商品图片
ProductVideo            商品视频
ProductTrace            商品溯源
CartItem                购物车
Order                   订单主表
OrderItem               订单明细
PaymentRecord           支付记录
DeliveryRecord          发货记录
RefundApply             售后申请
AdminUser               后台账号
AdminRole               后台角色
AdminUserRole           后台账号角色关联
AdminOperationLog       后台操作日志
```

这样已经能支持：

```text
C端：
- 微信登录
- 地址管理
- 商品列表
- 商品详情
- 加入购物车
- 提交订单
- 微信支付
- 查看订单

B端：
- 商家入驻
- 上传资质
- 发布商品
- 管理库存
- 查看订单
- 发货

后台：
- 审核商家
- 审核商品
```

你的数据库设计本来也是按用户、商家、商品、订单、支付、售后、营销、分销分域建模，第一版可以先保留核心交易链路。

------

# 2. Prisma 基础配置

Prisma 7 的写法和旧版不一样。  
现在 `schema.prisma` 里只保留 `generator` 和 `datasource` 定义，数据库连接由 `backend/prisma.config.ts` 读取环境变量提供。

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
}
```

对应配置文件：

```ts
// backend/prisma.config.ts
import { config as loadDotenv } from 'dotenv';
import { defineConfig, env } from 'prisma/config';

loadDotenv({ path: '.env.local' });
loadDotenv();

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
});
```

这样做的好处是：

- `.env.local` 作为本地开发环境入口
- Prisma 和 NestJS 读同一份环境变量
- 后续切换开发 / 测试 / 生产环境更清晰

---

## 3. 基础枚举设计

这里我建议你**先用 Int 存状态**，不要一开始就用 Prisma enum。

原因：
你的数据库设计里也建议状态枚举统一定义在服务层，数据库只存数值。

比如后端 TypeScript 里这样写：

```ts
export enum UserStatus {
  NORMAL = 1,
  DISABLED = 2,
  CANCELLED = 3,
}

export enum MerchantStatus {
  PENDING_SUBMIT = 1,
  PENDING_AUDIT = 2,
  APPROVED = 3,
  REJECTED = 4,
  DISABLED = 5,
}

export enum ProductStatus {
  DRAFT = 1,
  PENDING_AUDIT = 2,
  ON_SALE = 3,
  OFF_SALE = 4,
  REJECTED = 5,
}

export enum OrderStatus {
  PENDING_PAYMENT = 1,
  PAID = 2,
  PENDING_ACCEPT = 3,
  PENDING_DELIVERY = 4,
  DELIVERED = 5,
  COMPLETED = 6,
  CANCELLED = 7,
  CLOSED = 8,
}

export enum PayStatus {
  PENDING = 1,
  PAYING = 2,
  SUCCESS = 3,
  FAILED = 4,
  REFUNDED = 5,
}
```

---

## 4. Prisma ORM 基础模型设计

下面这份就是当前仓库正在使用的第一版可开发 ORM。

```prisma
model User {
  id          BigInt    @id @default(autoincrement())
  openid      String    @unique @db.VarChar(128)
  unionid     String?   @db.VarChar(128)
  nickname    String?   @db.VarChar(64)
  avatarUrl   String?   @map("avatar_url") @db.VarChar(255)
  mobile      String?   @db.VarChar(20)
  gender      Int?      @db.SmallInt
  status      Int       @default(1) @db.SmallInt
  lastLoginAt DateTime?  @map("last_login_at") @db.Timestamp(6)

  createdAt   DateTime  @default(now()) @map("created_at") @db.Timestamp(6)
  updatedAt   DateTime  @updatedAt @map("updated_at") @db.Timestamp(6)
  deletedAt   DateTime? @map("deleted_at") @db.Timestamp(6)

  addresses   UserAddress[]
  roles       UserRole[]
  merchant    Merchant?
  cartItems    CartItem[]
  orders      Order[]
  refunds     RefundApply[]

  @@index([mobile])
  @@map("user")
}
```

说明：

- `openid` 用于微信小程序登录。
- 一个用户可以是普通用户，也可以申请成为商家。
- `deletedAt` 用于软删除。
- `status` 表示正常、禁用、注销。

你的用户表设计里本来就包含 `openid`、`unionid`、昵称、头像、手机号、状态、最近登录时间等字段。

------

## 用户地址表

```prisma
model UserAddress {
  id             BigInt   @id @default(autoincrement())
  userId         BigInt   @map("user_id")
  receiverName   String   @map("receiver_name") @db.VarChar(64)
  receiverMobile  String   @map("receiver_mobile") @db.VarChar(20)
  province       String   @db.VarChar(64)
  city           String   @db.VarChar(64)
  district       String   @db.VarChar(64)
  detailAddress  String   @map("detail_address") @db.VarChar(255)
  isDefault      Boolean  @default(false) @map("is_default")

  createdAt      DateTime @default(now()) @map("created_at") @db.Timestamp(6)
  updatedAt      DateTime @updatedAt @map("updated_at") @db.Timestamp(6)
  deletedAt      DateTime? @map("deleted_at") @db.Timestamp(6)

  user           User     @relation(fields: [userId], references: [id])

  @@index([userId])
  @@map("user_address")
}
```

用途：

```text
C端用户：
- 新增地址
- 修改地址
- 设置默认地址
- 下单选择地址
```

------

## 5. 商家 ORM 设计

### 商家表

```prisma
model Merchant {
  id             BigInt    @id @default(autoincrement())
  userId         BigInt    @unique @map("user_id")
  storeName      String    @map("store_name") @db.VarChar(128)
  storeLogo      String?   @map("store_logo") @db.VarChar(255)
  contactName    String    @map("contact_name") @db.VarChar(64)
  contactMobile  String    @map("contact_mobile") @db.VarChar(20)

  status         Int       @default(2) @db.SmallInt
  commissionRate Decimal?  @map("commission_rate") @db.Decimal(10, 4)
  settledAt      DateTime? @map("settled_at") @db.Timestamp(6)

  createdAt      DateTime  @default(now()) @map("created_at") @db.Timestamp(6)
  updatedAt      DateTime  @updatedAt @map("updated_at") @db.Timestamp(6)
  deletedAt      DateTime? @map("deleted_at") @db.Timestamp(6)

  user            User                 @relation(fields: [userId], references: [id])
  qualifications  MerchantQualification[]
  wallet          MerchantWallet?
  products        Product[]
  orders          Order[]
  deliveryRecords DeliveryRecord[]
  withdrawApplies WithdrawApply[]
  refunds         RefundApply[]

  @@map("merchant")
}
```

### 商家资质表

```prisma
model MerchantQualification {
  id                BigInt   @id @default(autoincrement())
  merchantId        BigInt   @map("merchant_id")
  qualificationType String   @map("qualification_type") @db.VarChar(64)
  fileName          String   @map("file_name") @db.VarChar(255)
  fileUrl           String   @map("file_url") @db.VarChar(255)
  status            Int      @default(2) @db.SmallInt
  auditRemark       String?  @map("audit_remark") @db.VarChar(255)

  createdAt         DateTime @default(now()) @map("created_at") @db.Timestamp(6)
  updatedAt         DateTime @updatedAt @map("updated_at") @db.Timestamp(6)

  merchant          Merchant @relation(fields: [merchantId], references: [id])

  @@index([merchantId])
  @@map("merchant_qualification")
}
```

用途：

```text
B端：
- 商家入驻
- 上传营业执照
- 上传产地资质

后台：
- 审核商家
- 审核资质
```

商家表和资质表字段与你的数据库设计基本一致。

------

## 6. 商品 ORM 设计

### 分类表

```prisma
model Category {
  id         BigInt    @id @default(autoincrement())
  parentId   BigInt?   @map("parent_id")
  name       String    @db.VarChar(64)
  iconUrl    String?   @map("icon_url") @db.VarChar(255)
  sortOrder  Int       @default(0) @map("sort_order")
  status     Int       @default(1) @db.SmallInt

  createdAt  DateTime  @default(now()) @map("created_at") @db.Timestamp(6)
  updatedAt  DateTime  @updatedAt @map("updated_at") @db.Timestamp(6)
  deletedAt  DateTime? @map("deleted_at") @db.Timestamp(6)

  parent     Category?  @relation("CategoryTree", fields: [parentId], references: [id])
  children   Category[] @relation("CategoryTree")
  products   Product[]

  @@index([parentId])
  @@map("category")
}
```

用途：

```text
C端：
- 时令果蔬
- 肉禽蛋奶
- 粮油干货
- 特产礼盒

后台：
- 新增分类
- 编辑分类
- 禁用分类
```

你的 PRD 里基础类目正好是这四个一级入口。

------

## 商品主表

```prisma
model Product {
  id           BigInt    @id @default(autoincrement())
  merchantId   BigInt    @map("merchant_id")
  categoryId   BigInt    @map("category_id")
  title        String    @db.VarChar(128)
  subtitle     String?   @db.VarChar(255)
  coverUrl     String?   @map("cover_url") @db.VarChar(255)
  detailDesc   String?   @map("detail_desc") @db.Text
  traceInfo    String?   @map("trace_info") @db.Text
  originPlace  String?   @map("origin_place") @db.VarChar(128)
  deliveryType Int?      @map("delivery_type") @db.SmallInt
  status       Int       @default(1) @db.SmallInt
  auditStatus  Int       @default(1) @map("audit_status") @db.SmallInt
  auditRemark  String?   @map("audit_remark") @db.VarChar(255)
  isPreSale    Boolean   @default(false) @map("is_pre_sale")
  isHot        Boolean   @default(false) @map("is_hot")

  createdAt    DateTime  @default(now()) @map("created_at") @db.Timestamp(6)
  updatedAt    DateTime  @updatedAt @map("updated_at") @db.Timestamp(6)
  deletedAt    DateTime? @map("deleted_at") @db.Timestamp(6)

  merchant     Merchant  @relation(fields: [merchantId], references: [id])
  category     Category  @relation(fields: [categoryId], references: [id])

  skus         ProductSku[]
  images       ProductImage[]
  videos       ProductVideo[]
  traces       ProductTrace[]
  cartItems    CartItem[]
  orderItems   OrderItem[]

  @@index([merchantId, status])
  @@index([categoryId, status])
  @@index([auditStatus])
  @@map("product")
}
```

基础版我先不单独设计 `product_video` 和 `product_trace`，因为最基础闭环先靠：

```text
coverUrl
detailDesc
traceInfo
```

就够了。

后面你要做田间视频、多个溯源节点，再拆：

```text
product_video
product_trace
```

------

## 商品 SKU 表

```prisma
model ProductSku {
  id            BigInt   @id @default(autoincrement())
  productId     BigInt   @map("product_id")
  skuName       String   @map("sku_name") @db.VarChar(128)
  skuCode       String   @unique @map("sku_code") @db.VarChar(64)

  specJson      Json?    @map("spec_json")
  price         Decimal  @db.Decimal(18, 2)
  originalPrice Decimal? @map("original_price") @db.Decimal(18, 2)

  stock         Int      @default(0)
  lockedStock   Int      @default(0) @map("locked_stock")
  weight        Decimal? @db.Decimal(10, 3)
  status        Int      @default(1) @db.SmallInt

  createdAt     DateTime @default(now()) @map("created_at") @db.Timestamp(6)
  updatedAt     DateTime @updatedAt @map("updated_at") @db.Timestamp(6)
  deletedAt     DateTime? @map("deleted_at") @db.Timestamp(6)

  product       Product  @relation(fields: [productId], references: [id])
  cartItems     CartItem[]
  orderItems    OrderItem[]

  @@index([productId])
  @@map("product_sku")
}
```

`specJson` 示例：

```json
{
  "重量": "5斤",
  "包装": "礼盒装"
}
```

SKU 表里建议有价格、原价、库存、锁定库存、规格 JSON，这个和你的数据库设计是一致的。

------

## 商品图片表

```prisma
model ProductImage {
  id         BigInt   @id @default(autoincrement())
  productId  BigInt   @map("product_id")
  imageUrl   String   @map("image_url") @db.VarChar(255)
  sortOrder  Int      @default(0) @map("sort_order")

  createdAt  DateTime @default(now()) @map("created_at") @db.Timestamp(6)

  product    Product  @relation(fields: [productId], references: [id])

  @@index([productId])
  @@map("product_image")
}
```

用途：

```text
商品详情轮播图
商品图文展示
```

------

## 7. 购物车 ORM 设计

```prisma
model CartItem {
  id         BigInt   @id @default(autoincrement())
  userId     BigInt   @map("user_id")
  merchantId BigInt   @map("merchant_id")
  productId  BigInt   @map("product_id")
  skuId      BigInt   @map("sku_id")
  quantity   Int      @default(1)
  checked    Boolean  @default(true)

  createdAt  DateTime @default(now()) @map("created_at") @db.Timestamp(6)
  updatedAt  DateTime @updatedAt @map("updated_at") @db.Timestamp(6)

  user       User       @relation(fields: [userId], references: [id])
  product    Product    @relation(fields: [productId], references: [id])
  sku        ProductSku @relation(fields: [skuId], references: [id])

  @@unique([userId, skuId])
  @@index([userId])
  @@index([merchantId])
  @@map("cart")
}
```

用途：

```text
- 加入购物车
- 修改数量
- 勾选商品
- 删除购物车商品
- 购物车结算
```

购物车表建议有 `user_id`、`merchant_id`、`product_id`、`sku_id`、数量、勾选状态，并对 `user_id + sku_id` 做唯一索引，这正好支持“同一用户同一 SKU 只保留一条购物车记录”。

------

## 8. 订单 ORM 设计

## 订单主表

```prisma
model Order {
  id              BigInt    @id @default(autoincrement())
  orderNo         String    @unique @map("order_no") @db.VarChar(64)

  userId          BigInt    @map("user_id")
  merchantId      BigInt    @map("merchant_id")

  addressSnapshot Json      @map("address_snapshot")

  goodsAmount     Decimal   @map("goods_amount") @db.Decimal(18, 2)
  freightAmount   Decimal   @default(0) @map("freight_amount") @db.Decimal(18, 2)
  discountAmount  Decimal   @default(0) @map("discount_amount") @db.Decimal(18, 2)
  payAmount       Decimal   @map("pay_amount") @db.Decimal(18, 2)

  orderStatus     Int       @default(1) @map("order_status") @db.SmallInt
  payStatus       Int       @default(1) @map("pay_status") @db.SmallInt
  deliveryStatus  Int       @default(1) @map("delivery_status") @db.SmallInt
  refundStatus    Int       @default(0) @map("refund_status") @db.SmallInt

  expireAt        DateTime? @map("expire_at") @db.Timestamp(6)
  paidAt          DateTime? @map("paid_at") @db.Timestamp(6)
  completedAt     DateTime? @map("completed_at") @db.Timestamp(6)
  cancelReason    String?   @map("cancel_reason") @db.VarChar(255)

  remark          String?   @db.VarChar(255)

  createdAt       DateTime  @default(now()) @map("created_at") @db.Timestamp(6)
  updatedAt       DateTime  @updatedAt @map("updated_at") @db.Timestamp(6)
  deletedAt       DateTime? @map("deleted_at") @db.Timestamp(6)

  user            User      @relation(fields: [userId], references: [id])
  merchant        Merchant  @relation(fields: [merchantId], references: [id])

  items           OrderItem[]
  payments        PaymentRecord[]
  deliveries      DeliveryRecord[]
  refunds         RefundApply[]

  @@index([userId, orderStatus])
  @@index([merchantId, orderStatus])
  @@index([createdAt])
  @@map("orders")
}
```

为什么表名用 `orders`？

因为 `order` 是 SQL 关键字，容易冲突。你的 ER 图和数据库文档里也提到了实际表名建议用 `orders`。

------

## 订单明细表

```prisma
model OrderItem {
  id            BigInt   @id @default(autoincrement())
  orderId       BigInt   @map("order_id")
  productId     BigInt   @map("product_id")
  skuId         BigInt   @map("sku_id")
  productTitle  String   @map("product_title") @db.VarChar(128)
  skuName       String   @map("sku_name") @db.VarChar(128)
  productImage  String?  @map("product_image") @db.VarChar(255)
  unitPrice     Decimal  @map("unit_price") @db.Decimal(18, 2)
  quantity      Int
  lineAmount    Decimal  @map("line_amount") @db.Decimal(18, 2)

  createdAt     DateTime @default(now()) @map("created_at") @db.Timestamp(6)

  order         Order      @relation(fields: [orderId], references: [id])
  product       Product    @relation(fields: [productId], references: [id])
  sku           ProductSku @relation(fields: [skuId], references: [id])
  refunds       RefundApply[]

  @@index([orderId])
  @@index([productId])
  @@map("order_item")
}
```

关键点：

```text
订单明细必须保存快照：
- productTitle
- skuName
- productImage
- unitPrice
```

否则商品改名、改价格后，历史订单会乱。你的数据库设计也明确建议订单、售后、支付保留快照，禁止依赖实时商品信息回填历史单据。

------

## 9. 支付 ORM 设计

```prisma
model PaymentRecord {
  id            BigInt    @id @default(autoincrement())
  payNo         String    @unique @map("pay_no") @db.VarChar(64)
  orderNo       String    @map("order_no") @db.VarChar(64)
  orderId       BigInt    @map("order_id")
  userId        BigInt    @map("user_id")
  payChannel    Int       @map("pay_channel") @db.SmallInt
  amount        Decimal   @db.Decimal(18, 2)
  thirdTradeNo  String?   @map("third_trade_no") @db.VarChar(128)
  payStatus     Int       @default(1) @map("pay_status") @db.SmallInt
  paidAt        DateTime? @map("paid_at") @db.Timestamp(6)
  callbackData  Json?     @map("callback_data")

  createdAt     DateTime  @default(now()) @map("created_at") @db.Timestamp(6)
  updatedAt     DateTime  @updatedAt @map("updated_at") @db.Timestamp(6)

  order         Order     @relation(fields: [orderId], references: [id])

  @@index([orderNo])
  @@index([userId])
  @@map("payment_record")
}
```

用途：

```text
- 创建微信支付单
- 保存支付单号
- 保存微信支付流水号
- 支付回调幂等处理
- 支付金额校验
```

你的支付流水表也设计了支付单号、订单号、用户 ID、支付渠道、金额、第三方流水号、支付状态、回调原始数据等字段。

------

## 10. 发货 ORM 设计

```prisma
model DeliveryRecord {
  id                BigInt    @id @default(autoincrement())
  orderId           BigInt    @map("order_id")
  merchantId        BigInt    @map("merchant_id")
  logisticsCompany  String?   @map("logistics_company") @db.VarChar(64)
  trackingNo        String?   @map("tracking_no") @db.VarChar(64)
  deliveryStatus    Int       @default(1) @map("delivery_status") @db.SmallInt
  shippedAt         DateTime? @map("shipped_at") @db.Timestamp(6)
  deliveredAt       DateTime? @map("delivered_at") @db.Timestamp(6)

  createdAt         DateTime  @default(now()) @map("created_at") @db.Timestamp(6)
  updatedAt         DateTime  @updatedAt @map("updated_at") @db.Timestamp(6)

  order             Order     @relation(fields: [orderId], references: [id])
  merchant          Merchant  @relation(fields: [merchantId], references: [id])

  @@index([orderId])
  @@index([merchantId])
  @@map("delivery_record")
}
```

用途：

```text
B端商家：
- 填写物流公司
- 填写快递单号
- 发货

C端用户：
- 查看物流信息
```

发货记录表本来就包含订单 ID、商家 ID、物流公司、运单号、发货状态、发货时间、签收时间等字段。

------

## 11. 当前 schema 的扩展说明

当前仓库实际已经加入了这些扩展模型：

```text
product_video
product_trace
merchant_wallet
withdraw_apply
refund_apply
admin_user
admin_role
admin_user_role
admin_operation_log
```

但以下扩展能力仍建议作为第二阶段或后续阶段继续补齐：

```text
coupon
user_coupon
activity
activity_product
points_log
community_leader
leader_user_relation
pickup_point
commission_rule
commission_record
leader_withdraw_apply
```

------

## 12. 第一版 API 和 ORM 对应关系
```
prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

------

# 3. 基础枚举设计

这里我建议你**先用 Int 存状态**，不要一开始就用 Prisma enum。

原因：
你的数据库设计里也建议状态枚举统一定义在服务层，数据库只存数值。

比如后端 TypeScript 里这样写：

```ts
export enum UserStatus {
  NORMAL = 1,
  DISABLED = 2,
  CANCELLED = 3,
}

export enum MerchantStatus {
  PENDING_SUBMIT = 1,
  PENDING_AUDIT = 2,
  APPROVED = 3,
  REJECTED = 4,
  DISABLED = 5,
}

export enum ProductStatus {
  DRAFT = 1,
  PENDING_AUDIT = 2,
  ON_SALE = 3,
  OFF_SALE = 4,
  REJECTED = 5,
}

export enum OrderStatus {
  PENDING_PAYMENT = 1,
  PAID = 2,
  PENDING_ACCEPT = 3,
  PENDING_DELIVERY = 4,
  DELIVERED = 5,
  COMPLETED = 6,
  CANCELLED = 7,
  CLOSED = 8,
}

export enum PayStatus {
  PENDING = 1,
  PAYING = 2,
  SUCCESS = 3,
  FAILED = 4,
  REFUNDED = 5,
}
```

------

# 4. Prisma ORM 基础模型设计

下面这份就是你的**第一版可开发 ORM**。

```prisma
model User {
  id           BigInt    @id @default(autoincrement())
  openid       String    @unique @db.VarChar(128)
  unionid      String?   @db.VarChar(128)
  nickname     String?   @db.VarChar(64)
  avatarUrl    String?   @map("avatar_url") @db.VarChar(255)
  mobile       String?   @db.VarChar(20)
  gender       Int?      @db.SmallInt
  status       Int       @default(1) @db.SmallInt
  lastLoginAt  DateTime? @map("last_login_at") @db.Timestamp(6)

  createdAt    DateTime  @default(now()) @map("created_at") @db.Timestamp(6)
  updatedAt    DateTime  @updatedAt @map("updated_at") @db.Timestamp(6)
  deletedAt    DateTime? @map("deleted_at") @db.Timestamp(6)

  addresses    UserAddress[]
  carts        CartItem[]
  orders       Order[]
  merchant     Merchant?

  @@index([mobile])
  @@map("user")
}
```

说明：

- `openid` 用于微信小程序登录。
- 一个用户可以是普通用户，也可以申请成为商家。
- `deletedAt` 用于软删除。
- `status` 表示正常、禁用、注销。

你的用户表设计里本来就包含 `openid`、`unionid`、昵称、头像、手机号、状态、最近登录时间等字段。

------

## 用户地址表

```prisma
model UserAddress {
  id             BigInt   @id @default(autoincrement())
  userId         BigInt   @map("user_id")
  receiverName   String   @map("receiver_name") @db.VarChar(64)
  receiverMobile String   @map("receiver_mobile") @db.VarChar(20)
  province       String   @db.VarChar(64)
  city           String   @db.VarChar(64)
  district       String   @db.VarChar(64)
  detailAddress  String   @map("detail_address") @db.VarChar(255)
  isDefault      Boolean  @default(false) @map("is_default")

  createdAt      DateTime @default(now()) @map("created_at") @db.Timestamp(6)
  updatedAt      DateTime @updatedAt @map("updated_at") @db.Timestamp(6)
  deletedAt      DateTime? @map("deleted_at") @db.Timestamp(6)

  user           User     @relation(fields: [userId], references: [id])

  @@index([userId])
  @@map("user_address")
}
```

用途：

```text
C端用户：
- 新增地址
- 修改地址
- 设置默认地址
- 下单选择地址
```

------

# 5. 商家 ORM 设计

## 商家表

```prisma
model Merchant {
  id             BigInt    @id @default(autoincrement())
  userId         BigInt    @unique @map("user_id")
  storeName      String    @map("store_name") @db.VarChar(128)
  storeLogo      String?   @map("store_logo") @db.VarChar(255)
  contactName    String    @map("contact_name") @db.VarChar(64)
  contactMobile  String    @map("contact_mobile") @db.VarChar(20)

  status         Int       @default(2) @db.SmallInt
  commissionRate Decimal?  @map("commission_rate") @db.Decimal(10, 4)
  settledAt      DateTime? @map("settled_at") @db.Timestamp(6)

  createdAt      DateTime  @default(now()) @map("created_at") @db.Timestamp(6)
  updatedAt      DateTime  @updatedAt @map("updated_at") @db.Timestamp(6)
  deletedAt      DateTime? @map("deleted_at") @db.Timestamp(6)

  user           User      @relation(fields: [userId], references: [id])
  qualifications MerchantQualification[]
  products       Product[]
  orders         Order[]
  deliveryRecords DeliveryRecord[]

  @@map("merchant")
}
```

## 商家资质表

```prisma
model MerchantQualification {
  id                BigInt   @id @default(autoincrement())
  merchantId        BigInt   @map("merchant_id")
  qualificationType String   @map("qualification_type") @db.VarChar(64)
  fileName          String   @map("file_name") @db.VarChar(255)
  fileUrl           String   @map("file_url") @db.VarChar(255)
  status            Int      @default(2) @db.SmallInt
  auditRemark       String?  @map("audit_remark") @db.VarChar(255)

  createdAt         DateTime @default(now()) @map("created_at") @db.Timestamp(6)
  updatedAt         DateTime @updatedAt @map("updated_at") @db.Timestamp(6)

  merchant          Merchant @relation(fields: [merchantId], references: [id])

  @@index([merchantId])
  @@map("merchant_qualification")
}
```

用途：

```text
B端：
- 商家入驻
- 上传营业执照
- 上传产地资质

后台：
- 审核商家
- 审核资质
```

商家表和资质表字段与你的数据库设计基本一致。

------

# 6. 商品 ORM 设计

## 分类表

```prisma
model Category {
  id          BigInt    @id @default(autoincrement())
  parentId    BigInt?   @map("parent_id")
  name        String    @db.VarChar(64)
  iconUrl     String?   @map("icon_url") @db.VarChar(255)
  sortOrder   Int       @default(0) @map("sort_order")
  status      Int       @default(1) @db.SmallInt

  createdAt   DateTime  @default(now()) @map("created_at") @db.Timestamp(6)
  updatedAt   DateTime  @updatedAt @map("updated_at") @db.Timestamp(6)
  deletedAt   DateTime? @map("deleted_at") @db.Timestamp(6)

  parent      Category?  @relation("CategoryTree", fields: [parentId], references: [id])
  children    Category[] @relation("CategoryTree")
  products    Product[]

  @@index([parentId])
  @@map("category")
}
```

用途：

```text
C端：
- 时令果蔬
- 肉禽蛋奶
- 粮油干货
- 特产礼盒

后台：
- 新增分类
- 编辑分类
- 禁用分类
```

你的 PRD 里基础类目正好是这四个一级入口。

------

## 商品主表

```prisma
model Product {
  id           BigInt    @id @default(autoincrement())
  merchantId   BigInt    @map("merchant_id")
  categoryId   BigInt    @map("category_id")

  title        String    @db.VarChar(128)
  subtitle     String?   @db.VarChar(255)
  coverUrl     String?   @map("cover_url") @db.VarChar(255)
  detailDesc   String?   @map("detail_desc") @db.Text
  traceInfo    String?   @map("trace_info") @db.Text
  originPlace  String?   @map("origin_place") @db.VarChar(128)

  deliveryType Int?      @map("delivery_type") @db.SmallInt
  status       Int       @default(1) @db.SmallInt
  auditStatus  Int       @default(1) @map("audit_status") @db.SmallInt
  auditRemark  String?   @map("audit_remark") @db.VarChar(255)

  isPreSale    Boolean   @default(false) @map("is_pre_sale")
  isHot        Boolean   @default(false) @map("is_hot")

  createdAt    DateTime  @default(now()) @map("created_at") @db.Timestamp(6)
  updatedAt    DateTime  @updatedAt @map("updated_at") @db.Timestamp(6)
  deletedAt    DateTime? @map("deleted_at") @db.Timestamp(6)

  merchant     Merchant  @relation(fields: [merchantId], references: [id])
  category     Category  @relation(fields: [categoryId], references: [id])

  skus         ProductSku[]
  images       ProductImage[]
  cartItems    CartItem[]
  orderItems   OrderItem[]

  @@index([merchantId, status])
  @@index([categoryId, status])
  @@index([auditStatus])
  @@map("product")
}
```

基础版我先不单独设计 `product_video` 和 `product_trace`，因为最基础闭环先靠：

```text
coverUrl
detailDesc
traceInfo
```

就够了。

后面你要做田间视频、多个溯源节点，再拆：

```text
product_video
product_trace
```

------

## 商品 SKU 表

```prisma
model ProductSku {
  id            BigInt   @id @default(autoincrement())
  productId     BigInt   @map("product_id")
  skuName       String   @map("sku_name") @db.VarChar(128)
  skuCode       String   @unique @map("sku_code") @db.VarChar(64)

  specJson      Json?    @map("spec_json")
  price         Decimal  @db.Decimal(18, 2)
  originalPrice Decimal? @map("original_price") @db.Decimal(18, 2)

  stock         Int      @default(0)
  lockedStock   Int      @default(0) @map("locked_stock")
  weight        Decimal? @db.Decimal(10, 3)
  status        Int      @default(1) @db.SmallInt

  createdAt     DateTime @default(now()) @map("created_at") @db.Timestamp(6)
  updatedAt     DateTime @updatedAt @map("updated_at") @db.Timestamp(6)
  deletedAt     DateTime? @map("deleted_at") @db.Timestamp(6)

  product       Product  @relation(fields: [productId], references: [id])
  cartItems     CartItem[]
  orderItems    OrderItem[]

  @@index([productId])
  @@map("product_sku")
}
```

`specJson` 示例：

```json
{
  "重量": "5斤",
  "包装": "礼盒装"
}
```

SKU 表里建议有价格、原价、库存、锁定库存、规格 JSON，这个和你的数据库设计是一致的。

------

## 商品图片表

```prisma
model ProductImage {
  id          BigInt   @id @default(autoincrement())
  productId   BigInt   @map("product_id")
  imageUrl    String   @map("image_url") @db.VarChar(255)
  sortOrder   Int      @default(0) @map("sort_order")

  createdAt   DateTime @default(now()) @map("created_at") @db.Timestamp(6)

  product     Product  @relation(fields: [productId], references: [id])

  @@index([productId])
  @@map("product_image")
}
```

用途：

```text
商品详情轮播图
商品图文展示
```

------

# 7. 购物车 ORM 设计

```prisma
model CartItem {
  id          BigInt   @id @default(autoincrement())
  userId      BigInt   @map("user_id")
  merchantId  BigInt   @map("merchant_id")
  productId   BigInt   @map("product_id")
  skuId       BigInt   @map("sku_id")

  quantity    Int      @default(1)
  checked     Boolean  @default(true)

  createdAt   DateTime @default(now()) @map("created_at") @db.Timestamp(6)
  updatedAt   DateTime @updatedAt @map("updated_at") @db.Timestamp(6)

  user        User       @relation(fields: [userId], references: [id])
  product     Product    @relation(fields: [productId], references: [id])
  sku         ProductSku @relation(fields: [skuId], references: [id])

  @@unique([userId, skuId])
  @@index([userId])
  @@index([merchantId])
  @@map("cart")
}
```

用途：

```text
- 加入购物车
- 修改数量
- 勾选商品
- 删除购物车商品
- 购物车结算
```

购物车表建议有 `user_id`、`merchant_id`、`product_id`、`sku_id`、数量、勾选状态，并对 `user_id + sku_id` 做唯一索引，这正好支持“同一用户同一 SKU 只保留一条购物车记录”。

------

# 8. 订单 ORM 设计

## 订单主表

```prisma
model Order {
  id              BigInt    @id @default(autoincrement())
  orderNo         String    @unique @map("order_no") @db.VarChar(64)

  userId          BigInt    @map("user_id")
  merchantId      BigInt    @map("merchant_id")

  addressSnapshot Json      @map("address_snapshot")

  goodsAmount     Decimal   @map("goods_amount") @db.Decimal(18, 2)
  freightAmount   Decimal   @default(0) @map("freight_amount") @db.Decimal(18, 2)
  discountAmount  Decimal   @default(0) @map("discount_amount") @db.Decimal(18, 2)
  payAmount       Decimal   @map("pay_amount") @db.Decimal(18, 2)

  orderStatus     Int       @default(1) @map("order_status") @db.SmallInt
  payStatus       Int       @default(1) @map("pay_status") @db.SmallInt
  deliveryStatus  Int       @default(1) @map("delivery_status") @db.SmallInt
  refundStatus    Int       @default(0) @map("refund_status") @db.SmallInt

  expireAt        DateTime? @map("expire_at") @db.Timestamp(6)
  paidAt          DateTime? @map("paid_at") @db.Timestamp(6)
  completedAt     DateTime? @map("completed_at") @db.Timestamp(6)
  cancelReason    String?   @map("cancel_reason") @db.VarChar(255)

  remark          String?   @db.VarChar(255)

  createdAt       DateTime  @default(now()) @map("created_at") @db.Timestamp(6)
  updatedAt       DateTime  @updatedAt @map("updated_at") @db.Timestamp(6)
  deletedAt       DateTime? @map("deleted_at") @db.Timestamp(6)

  user            User      @relation(fields: [userId], references: [id])
  merchant        Merchant  @relation(fields: [merchantId], references: [id])

  items           OrderItem[]
  payments        PaymentRecord[]
  deliveries      DeliveryRecord[]

  @@index([userId, orderStatus])
  @@index([merchantId, orderStatus])
  @@index([createdAt])
  @@map("orders")
}
```

为什么表名用 `orders`？

因为 `order` 是 SQL 关键字，容易冲突。你的 ER 图和数据库文档里也提到了实际表名建议用 `orders`。

------

## 订单明细表

```prisma
model OrderItem {
  id            BigInt   @id @default(autoincrement())
  orderId       BigInt   @map("order_id")
  productId     BigInt   @map("product_id")
  skuId         BigInt   @map("sku_id")

  productTitle  String   @map("product_title") @db.VarChar(128)
  skuName       String   @map("sku_name") @db.VarChar(128)
  productImage  String?  @map("product_image") @db.VarChar(255)

  unitPrice     Decimal  @map("unit_price") @db.Decimal(18, 2)
  quantity      Int
  lineAmount    Decimal  @map("line_amount") @db.Decimal(18, 2)

  createdAt     DateTime @default(now()) @map("created_at") @db.Timestamp(6)

  order         Order      @relation(fields: [orderId], references: [id])
  product       Product    @relation(fields: [productId], references: [id])
  sku           ProductSku @relation(fields: [skuId], references: [id])

  @@index([orderId])
  @@index([productId])
  @@map("order_item")
}
```

关键点：

```text
订单明细必须保存快照：
- productTitle
- skuName
- productImage
- unitPrice
```

否则商品改名、改价格后，历史订单会乱。你的数据库设计也明确建议订单、售后、支付保留快照，禁止依赖实时商品信息回填历史单据。

------

# 9. 支付 ORM 设计

```prisma
model PaymentRecord {
  id             BigInt    @id @default(autoincrement())
  payNo          String    @unique @map("pay_no") @db.VarChar(64)
  orderNo        String    @map("order_no") @db.VarChar(64)
  orderId        BigInt    @map("order_id")
  userId         BigInt    @map("user_id")

  payChannel     Int       @map("pay_channel") @db.SmallInt
  amount         Decimal   @db.Decimal(18, 2)

  thirdTradeNo   String?   @map("third_trade_no") @db.VarChar(128)
  payStatus      Int       @default(1) @map("pay_status") @db.SmallInt
  paidAt         DateTime? @map("paid_at") @db.Timestamp(6)

  callbackData   Json?     @map("callback_data")

  createdAt      DateTime  @default(now()) @map("created_at") @db.Timestamp(6)
  updatedAt      DateTime  @updatedAt @map("updated_at") @db.Timestamp(6)

  order          Order     @relation(fields: [orderId], references: [id])

  @@index([orderNo])
  @@index([userId])
  @@map("payment_record")
}
```

用途：

```text
- 创建微信支付单
- 保存支付单号
- 保存微信支付流水号
- 支付回调幂等处理
- 支付金额校验
```

你的支付流水表也设计了支付单号、订单号、用户 ID、支付渠道、金额、第三方流水号、支付状态、回调原始数据等字段。

------

# 10. 发货 ORM 设计

```prisma
model DeliveryRecord {
  id               BigInt    @id @default(autoincrement())
  orderId           BigInt    @map("order_id")
  merchantId        BigInt    @map("merchant_id")

  logisticsCompany  String?   @map("logistics_company") @db.VarChar(64)
  trackingNo        String?   @map("tracking_no") @db.VarChar(64)
  deliveryStatus    Int       @default(1) @map("delivery_status") @db.SmallInt

  shippedAt         DateTime? @map("shipped_at") @db.Timestamp(6)
  deliveredAt       DateTime? @map("delivered_at") @db.Timestamp(6)

  createdAt         DateTime  @default(now()) @map("created_at") @db.Timestamp(6)
  updatedAt         DateTime  @updatedAt @map("updated_at") @db.Timestamp(6)

  order             Order     @relation(fields: [orderId], references: [id])
  merchant          Merchant  @relation(fields: [merchantId], references: [id])

  @@index([orderId])
  @@index([merchantId])
  @@map("delivery_record")
}
```

用途：

```text
B端商家：
- 填写物流公司
- 填写快递单号
- 发货

C端用户：
- 查看物流信息
```

发货记录表本来就包含订单 ID、商家 ID、物流公司、运单号、发货状态、发货时间、签收时间等字段。

------

# 11. 最基础版完整 schema.prisma 汇总

你可以先把上面的模型放进一个 `schema.prisma` 里。第一版结构如下：

```text
prisma/
└── schema.prisma
```

第一版不建议一次性把所有表都加进去。你先把核心链路跑通：

```text
User
UserAddress
Merchant
MerchantQualification
Category
Product
ProductSku
ProductImage
CartItem
Order
OrderItem
PaymentRecord
DeliveryRecord
```

------

# 12. 第一版 API 和 ORM 对应关系

| 功能       | API                                       | 主要 ORM Model                                 |
| ---------- | ----------------------------------------- | ---------------------------------------------- |
| 微信登录   | `POST /api/auth/wechat-login`             | `User`                                         |
| 地址列表   | `GET /api/app/addresses`                  | `UserAddress`                                  |
| 新增地址   | `POST /api/app/addresses`                 | `UserAddress`                                  |
| 分类列表   | `GET /api/app/categories`                 | `Category`                                     |
| 商品列表   | `GET /api/app/products`                   | `Product`, `ProductSku`, `ProductImage`        |
| 商品详情   | `GET /api/app/products/:id`               | `Product`, `ProductSku`, `ProductImage`        |
| 加入购物车 | `POST /api/app/cart/items`                | `CartItem`, `ProductSku`                       |
| 购物车列表 | `GET /api/app/cart`                       | `CartItem`, `Product`, `ProductSku`            |
| 创建订单   | `POST /api/app/orders`                    | `Order`, `OrderItem`, `CartItem`, `ProductSku` |
| 支付下单   | `POST /api/app/payments/wechat`           | `Order`, `PaymentRecord`                       |
| 支付回调   | `POST /api/payments/wechat/callback`      | `PaymentRecord`, `Order`, `ProductSku`         |
| 商家入驻   | `POST /api/merchant/apply`                | `Merchant`, `MerchantQualification`            |
| 发布商品   | `POST /api/merchant/products`             | `Product`, `ProductSku`, `ProductImage`        |
| 商品审核   | `POST /api/admin/products/:id/audit`      | `Product`                                      |
| 商家发货   | `POST /api/merchant/orders/:orderNo/ship` | `Order`, `DeliveryRecord`                      |

------

# 13. 你现在应该先实现的顺序

按这个顺序做，最稳：

```text
第一步：User 登录
第二步：Category 分类
第三步：Merchant 商家入驻
第四步：Product 商品发布
第五步：ProductSku 库存和价格
第六步：CartItem 购物车
第七步：Order 创建订单
第八步：PaymentRecord 支付记录
第九步：DeliveryRecord 发货
```

先不要碰：

```text
优惠券
积分
拼团
秒杀
分销
团长
复杂售后
复杂财务
```

因为这些都会依赖订单闭环。订单闭环不稳，后面都容易乱。

------

# 14. 最重要的几个设计规则

## 规则 1：金额全部用 Decimal

```prisma
price Decimal @db.Decimal(18, 2)
```

不要用 Float。

你的数据库设计也建议金额统一使用 `numeric(18,2)`，避免浮点误差。

------

## 规则 2：图片和视频只存 URL

```prisma
coverUrl String?
imageUrl String
fileUrl  String
```

不要把图片二进制存数据库。数据库设计里也明确建议图片、视频、文件统一保存 URL。

------

## 规则 3：订单一定要存快照

订单明细不能只存 `productId`、`skuId`。

必须额外存：

```text
productTitle
skuName
productImage
unitPrice
```

否则商品后续改名、改图、改价，历史订单就不准确。

------

## 规则 4：库存要区分 stock 和 lockedStock

```prisma
stock       Int
lockedStock Int
```

创建订单未支付时：

```text
stock 不一定马上减少
lockedStock 增加
```

支付成功后：

```text
stock 减少
lockedStock 减少
```

订单取消或超时：

```text
lockedStock 减少
```

------

## 规则 5：状态字段先用 Int

例如：

```prisma
orderStatus Int @default(1)
payStatus   Int @default(1)
```

然后在 TS 里定义枚举。

这样数据库简单，后端业务也清晰。
