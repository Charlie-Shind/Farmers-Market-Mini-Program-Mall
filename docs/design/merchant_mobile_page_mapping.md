# 湾源农仓商家端：设计稿与小程序页面对照进度表

本文件用于记录 V10 设计稿 HTML 页面与小程序 WXML 页面的对照关系、当前的开发还原进度以及后续的任务规划。

---

## 1. 核心业务流程页面映射表

| 序号 | 设计稿 HTML 页面 (V10) | 小程序 WXML 页面 | 功能描述 | 样式还原进度 | 待办/优化任务 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | `dashboard.html` | `/pages/merchant/dashboard` | 商家端首页控制台 | **100% 已对齐** | 已移除轮播图，绑定动态 `pageStyle` |
| 2 | `messages.html` | `/pages/merchant/messages` | 消息通知列表 | **100% 已对齐** | 修复了姓名 `.row-main` 折行与顶部重叠 |
| 3 | `chat-detail.html` | `/pages/chat/chat` | 聊天详情页 | **80% 基本对齐** | 需检查底部输入框与工具栏的 V9 对齐规范 |
| 4 | `orders.html` | `/pages/merchant/orders` | 订单列表页 | **100% 已对齐** | 已替换 chip 按钮为 `view`，绑定了 `pageStyle` |
| 5 | `order-detail.html` | `/pages/merchant/orders/detail` | 订单详情页 | **100% 已对齐** | 补全了 `app-page` 顶间距与状态标签对齐 |
| 6 | `products.html` | `/pages/merchant/products` | 商品库存管理页 | **100% 已对齐** | 替换了排序按钮，补全了 `pageStyle` 绑定 |
| 7 | `product-edit.html` | `/pages/merchant/products/edit` | 商品编辑/发布页 | **95% 基本对齐** | 已补全 `app-page` 顶部间隙，待微调多规格 SKU 选择 |
| 8 | `shop.html` | `/pages/merchant/shop` | 账号设置中心 | **100% 已对齐** | 已加顶部占位状态栏与动态样式绑定 |
| 9 | `finance.html` | `/pages/merchant/finance` | 财务明细明细页 | **100% 已对齐** | 已加返回按钮、补全顶部留白 |
| 10 | `withdraw.html` | `/pages/merchant/withdraw` | 提现操作页 | **100% 已对齐** | 已绑定 `pageStyle` 动态算高 |
| 11 | `workbench.html` | `/pages/merchant/workbench` | 商家工作台 | **100% 已对齐** | 修复了 `<header>` 元素坍塌 |

---

## 2. 营销活动页面映射表

| 序号 | 设计稿 HTML 页面 (V10) | 小程序 WXML 页面 | 功能描述 | 样式还原进度 | 待办/优化任务 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 12 | `marketing.html` | `/pages/merchant/marketing` | 营销活动列表 | **100% 已对齐** | 已替换 segment 为 `view` 标签 |
| 13 | `marketing-edit.html` | `/pages/merchant/marketing/edit` | 编辑与发布活动 | **90% 基本对齐** | 需补全不同活动类型 (秒杀/拼团) 的 `wx:if` 动态规则配置 |

---

## 3. 辅助及设置子页面映射表

| 序号 | 设计稿 HTML 页面 (V10) | 小程序 WXML 页面 | 功能描述 | 样式还原进度 | 待办/优化任务 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 14 | `delivery.html` | 暂无对应页面 | 配送设置（地址、偏好） | *待开发* | 从账号页 `pages/merchant/shop` 配送项切入开发 |
| 15 | `profile-certify.html`| 暂无对应页面 | 商家主体资质认证 | *待开发* | 连结到 shop 页面的认证跳转 |
| 16 | `profile-security.html`| 暂无对应页面 | 商家账号安全设置 | *待开发* | 连结到 shop 页面的安全设置跳转 |
| 17 | `help.html` | `/pages/service/help` | 商家帮助中心 | **85% 基本对齐** | 检查全局隐藏滚动条机制 |
| 18 | `logistics.html` | 暂无对应页面 | 物流发货填写页 | *待开发* | 连结到订单列表待发货卡片的【发货】按钮交互 |

---

## 4. 后续任务看板 (Task Board)
- `[x]` 彻底解决公共 `.row-main` 及原生 `button` 造成的样式重叠问题
- `[x]` 补全所有核心页面的动态状态栏高度绑定 `style="{{pageStyle}}"` 
- `[ ]` 按照 V9 规范，完成 **物流发货页 (`logistics.html` -> `/pages/merchant/orders/ship`)** 的开发，并绑定订单列表中的“发货”按钮跳转
- `[ ]` 完成 **配送设置页 (`delivery.html` -> `/pages/merchant/shop/delivery`)**，还原左中右对齐的运费模板、冷链提示排版
