# API 合同速查表

## 1. 认证

| 方法 | 路径 | 身份 | 用途 |
|---|---|---|---|
| GET | /health | public | 健康检查 |
| GET | /identity/auth/status | public | 认证状态 |
| GET | /identity/auth/anonymous | public | 游客会话 |
| POST | /identity/auth/wechat/sms-login | public | mock 手机登录 |
| GET | /identity/auth/me | USER/MERCHANT/ADMIN | 当前用户 |
| PATCH | /identity/auth/me | USER/MERCHANT | 更新个人资料 |
| POST | /admin/auth/login | public | 平台管理员登录 |

## 2. C端首页/商品

| 方法 | 路径 | 用途 |
|---|---|---|
| GET | /app/home/banners | 首页 Banner |
| GET | /app/home/quick-entries | 快捷入口 |
| GET | /app/home/hot-products | 热销商品 |
| GET | /app/home/merchant-entry-status | 商家入口状态 |
| GET | /app/categories | 分类 |
| GET | /app/products | 商品列表 |
| GET | /app/products/:productId | 商品详情 |
| GET | /app/products/:productId/related | 相关商品 |
| GET | /app/traces/:traceCode | 溯源详情 |
| GET | /app/favorites | 收藏列表 |
| POST | /app/products/:productId/favorite | 收藏 |
| DELETE | /app/products/:productId/favorite | 取消收藏 |

## 3. C端营销

| 方法 | 路径 | 用途 |
|---|---|---|
| GET | /app/coupons | 优惠券列表 |
| GET | /app/coupons/recommended | 推荐券 |
| GET | /app/coupons/available | 结算可用券 |
| GET | /app/user/coupons | 我的券 |
| POST | /app/coupons/:couponId/receive | 领券 |
| GET | /app/points/logs | 积分明细 |
| GET | /app/points/exchange-items | 积分兑换商品/券 |
| POST | /app/points/exchange | 积分兑换 |
| GET | /app/assets/summary | 用户资产汇总 |

## 4. C端购物车/订单/支付

| 方法 | 路径 | 用途 |
|---|---|---|
| GET | /app/cart | 购物车 |
| POST | /app/cart/items | 加购 |
| PATCH | /app/cart/items/:cartId | 改数量/勾选 |
| DELETE | /app/cart/items/:cartId | 删除 |
| POST | /app/orders/preview | 订单预览 |
| POST | /app/orders | 创建订单 |
| GET | /app/orders | 订单列表 |
| GET | /app/orders/:orderNo | 订单详情 |
| GET | /app/orders/:orderNo/logistics | 物流详情 |
| POST | /app/orders/:orderNo/cancel | 取消订单 |
| POST | /app/orders/:orderNo/confirm | 确认收货 |
| POST | /app/orders/:orderNo/reviews | 提交评价 |
| POST | /app/payments/wechat | 创建支付 |
| GET | /app/payments/wechat/status/:orderNo | 支付状态 |
| POST | /payments/wechat/callback | 模拟支付回调 |

## 5. C端地址/售后/消息/聊天

| 方法 | 路径 | 用途 |
|---|---|---|
| GET | /app/addresses | 地址列表 |
| POST | /app/addresses | 新增地址 |
| PATCH | /app/addresses/:addressId | 修改地址 |
| DELETE | /app/addresses/:addressId | 删除地址 |
| POST | /app/refunds | 发起售后 |
| GET | /app/messages | 消息列表 |
| GET | /app/messages/unread-count | 未读数 |
| GET | /app/messages/:receiptId | 消息详情 |
| POST | /app/messages/:receiptId/read | 标记已读 |
| POST | /app/messages/read-all | 全部已读 |
| POST | /app/chats/open | 打开会话 |
| GET | /app/chats | 会话列表 |
| GET | /app/chats/unread-count | 聊天未读 |
| GET | /app/chats/:conversationId/messages | 消息列表 |
| POST | /app/chats/:conversationId/messages | 发送消息 |
| POST | /app/chats/:conversationId/read | 已读 |
| GET | /app/chats/support-target | 平台客服目标 |

## 6. C端快捷活动

| 方法 | 路径 | 用途 |
|---|---|---|
| GET | /app/quick/flash-sale/active | 当前秒杀 |
| GET | /app/quick/flash-sale/windows | 秒杀场次 |
| GET | /app/quick/flash-sale/items | 秒杀商品 |
| POST | /app/quick/flash-sale/claim | 秒杀抢占 |
| POST | /app/quick/group-buy/nearby | 附近拼团 |
| GET | /app/quick/group-buy/products | 拼团商品 |
| POST | /app/quick/group-buy/join | 参团/发起拼团 |
| GET | /app/quick/gift-zone/items | 礼盒专区 |
| GET | /app/quick/origin-zone/items | 产地直供 |

## 7. B端商家

| 方法 | 路径 | 用途 |
|---|---|---|
| POST | /merchant/apply | 申请商家 |
| GET | /merchant/profile | 商家资料 |
| GET | /merchant/dashboard | 商家首页 |
| GET | /merchant/workbench | 工作台 |
| GET | /merchant/products | 商品列表 |
| POST | /merchant/products | 创建商品 |
| GET | /merchant/products/:productId | 商品详情 |
| PUT | /merchant/products/:productId | 更新商品 |
| PATCH | /merchant/products/:productId/status | 上下架 |
| PATCH | /merchant/skus/:skuId/stock | 改库存 |
| GET | /merchant/orders | 订单列表 |
| GET | /merchant/orders/:orderNo | 订单详情 |
| POST | /merchant/orders/:orderNo/accept | 接单 |
| POST | /merchant/orders/:orderNo/ship | 发货 |
| GET | /merchant/refunds | 售后列表 |
| GET | /merchant/refunds/:refundNo | 售后详情 |
| POST | /merchant/refunds/:refundNo/process | 处理售后 |
| GET | /merchant/reviews | 评价列表 |
| GET | /merchant/reviews/summary | 评价统计 |
| POST | /merchant/reviews/:reviewId/reply | 回复评价 |
| GET | /merchant/wallet | 钱包 |
| GET | /merchant/finance/records | 财务流水 |
| GET | /merchant/withdraws | 提现列表 |
| POST | /merchant/withdraws | 发起提现 |
| GET | /merchant/statistics/overview | 经营统计 |
| GET | /merchant/statistics/trend | 经营趋势 |

## 8. B端聊天

| 方法 | 路径 | 用途 |
|---|---|---|
| GET | /merchant/chats | 会话列表 |
| GET | /merchant/chats/unread-count | 未读数 |
| GET | /merchant/chats/:conversationId/messages | 消息列表 |
| POST | /merchant/chats/:conversationId/messages | 发送消息 |
| POST | /merchant/chats/:conversationId/read | 已读 |

## 9. 平台后台

| 方法 | 路径 | 用途 |
|---|---|---|
| GET | /admin/users | 用户列表 |
| GET | /admin/users/:userId/summary | 用户概览 |
| PUT | /admin/users/:userId | 编辑用户 |
| PATCH | /admin/users/:userId/status | 用户状态 |
| DELETE | /admin/users/:userId | 删除用户 |
| GET | /admin/merchants | 商户列表 |
| GET | /admin/merchants/:merchantId | 商户详情 |
| GET | /admin/merchants/:merchantId/summary | 商户概览 |
| POST | /admin/merchants/:merchantId/audit | 审核商户 |
| GET | /admin/products | 商品列表 |
| POST | /admin/products | 平台创建商品 |
| GET | /admin/products/:productId | 商品详情 |
| PUT | /admin/products/:productId | 更新商品 |
| POST | /admin/products/:productId/audit | 审核商品 |
| DELETE | /admin/products/:productId | 删除/下架商品 |
| GET | /admin/coupons | 优惠券列表 |
| POST | /admin/coupons | 创建优惠券 |
| PUT | /admin/coupons/:couponId | 更新优惠券 |
| PATCH | /admin/coupons/:couponId/status | 券状态 |
| POST | /admin/coupons/:couponId/issue | 发券 |
| GET | /admin/banners | Banner列表 |
| POST | /admin/banners | 创建Banner |
| PUT | /admin/banners/:bannerId | 更新Banner |
| PATCH | /admin/banners/:bannerId/status | Banner状态 |
| PUT | /admin/banners/reorder | Banner排序 |
| DELETE | /admin/banners/:bannerId | 删除Banner |
| GET | /admin/orders | 全平台订单 |
| GET | /admin/orders/:orderNo | 平台订单详情 |
| GET | /admin/refunds | 售后仲裁列表 |
| POST | /admin/refunds/:refundNo/arbitrate | 售后仲裁 |
| GET | /admin/withdraws | 提现审核列表 |
| POST | /admin/withdraws/:applyNo/audit | 提现审核 |
| GET | /admin/settings | 系统设置 |
| POST | /admin/settings | 保存设置 |
| GET | /admin/dashboard/overview | 概览 |
| GET | /admin/dashboard/sales | 销售趋势 |
| GET | /admin/dashboard/hot-products | 热销商品 |
| GET | /admin/dashboard/origin-sales | 产地销售 |
