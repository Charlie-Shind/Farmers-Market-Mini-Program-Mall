# 官方客服 merchant 化方案

## 1. 目标

把“官方客服”从一个特殊聊天分支，收口成一个固定的 `merchant` 账号。

也就是说：

- 所有客服会话统一建模为 `merchant ↔ buyer`
- `OFFICIAL` 只作为场景标签，不再承担独立身份职责
- 平台客服、商家客服、未来 AI 客服，都可以复用同一套会话模型

## 2. 推荐模型

### 2.1 核心原则

> 官方客服 = 一个特殊的商户账号，而不是一种聊天类型。

平台在系统配置里维护一个固定的客服商户 ID，例如：

```text
platform_support_merchant_id = 10001
```

这个账号可以是：

- 平台自动创建的虚拟商户
- 后台手工指定的真实商户

### 2.2 路由规则

用户进入客服入口时，如果场景是 `OFFICIAL`，服务端直接把目标商户改写为平台客服商户：

```ts
if (sceneType === 'OFFICIAL') {
  merchantId = platform_support_merchant_id;
}
```

前端不应该决定“官方客服是谁”，只能传入口场景和展示信息。

对于 `OFFICIAL` 入口，`merchantId` 可以不传，由后端自动解析到平台客服商户。

## 3. 现有实现现状

当前后端已经接近这套模型，相关代码位于：

- [backend/src/modules/business/chat/chat.service.ts](/H:/Project/gowork/farm/backend/src/modules/business/chat/chat.service.ts)
- [backend/src/common/services/platform-data.service.ts](/H:/Project/gowork/farm/backend/src/common/services/platform-data.service.ts)
- [backend/src/modules/business/chat/chat.controller.ts](/H:/Project/gowork/farm/backend/src/modules/business/chat/chat.controller.ts)

现状特点：

- `openConversation()` 已支持 `sceneType = OFFICIAL`
- `getSupportTarget()` 已能返回“平台客服目标”
- `ChatConversation` / `ChatMessage` 已经是标准会话模型

这意味着后续更适合做的是“收口与统一”，而不是重写一套独立客服系统。

## 4. 数据模型

### 4.1 会话表

会话以 `chat_conversation` 为核心，主要字段包括：

- `conversation_key`
- `buyer_id`
- `merchant_id`
- `product_id`
- `order_no`
- `scene_type`
- `scene_label`
- `scene_source`
- `last_message_id`
- `last_message_at`

### 4.2 消息表

消息以 `chat_message` 为核心，主要字段包括：

- `conversation_id`
- `sender_id`
- `receiver_id`
- `sender_role`
- `content_type`
- `content`
- `attachments`
- `read_at`

相关定义在：

- [backend/prisma/schema.prisma](/H:/Project/gowork/farm/backend/prisma/schema.prisma)

## 5. 接口口径

### 5.1 用户端

用户仍然统一走：

- `POST /api/app/chats/open`
- `GET /api/app/chats`
- `GET /api/app/chats/:conversationId/messages`
- `POST /api/app/chats/:conversationId/messages`
- `POST /api/app/chats/:conversationId/read`

其中：

- `sceneType` 只用于表达入口来源
- `merchantId` 才是最终会话对象

### 5.2 商家端

商家端继续复用同一套接口：

- `GET /api/merchant/chats`
- `GET /api/merchant/chats/unread-count`
- `GET /api/merchant/chats/:conversationId/messages`
- `POST /api/merchant/chats/:conversationId/messages`
- `POST /api/merchant/chats/:conversationId/read`

商家侧不需要感知“官方客服”是不是特殊类型，只需要知道自己是否是平台客服商户即可。

### 5.3 管理员端

管理员侧是查询和运营视角：

- `GET /api/admin/chat/support-target`
- `GET /api/admin/chat/conversations`
- `GET /api/admin/chat/conversations/:conversationId`
- `GET /api/admin/chat/conversations/:conversationId/messages`

## 6. 推荐落地方式

### Step 1：系统配置

在系统设置中增加：

- `platform_support_merchant_id`

### Step 2：创建客服商户

创建一个平台客服商户，例如：

- 名称：平台客服
- 标识：`isPlatformSupport = true`

### Step 3：统一 open 逻辑

`openConversation()` 中，如果入口是 `OFFICIAL`，服务端强制使用平台客服商户 ID。

### Step 4：保留 sceneType，仅做展示

`sceneType` 保留用于：

- 列表标签
- 页面文案
- 管理后台筛选

不要再用它分裂成另一套客服系统。

## 7. 关键注意事项

### 7.1 不要信任前端 merchantId

官方客服入口必须由后端决定目标商户，避免前端伪造跳转到其他商家。

### 7.2 会话是否要按场景拆分

当前会话键更偏向：

- `buyerId + merchantId`

这意味着同一个买家和同一个客服商户之间，会复用同一条会话。

如果未来希望：

- 商品咨询独立
- 订单咨询独立
- 官方客服独立

那就需要把 `sceneType`、`productId` 或 `orderNo` 纳入会话键设计。

### 7.3 权限隔离

平台客服商户应与普通商家区分：

- 普通商家不应冒充平台客服
- 平台客服不应出现在普通商家运营列表中

## 8. 扩展方向

统一成 `merchant ↔ buyer` 之后，后续可以平滑扩展：

- 官方客服 merchant
- AI 客服 merchant
- 人工客服组 merchant

这会让客服系统从一开始就具备平台级扩展能力。
