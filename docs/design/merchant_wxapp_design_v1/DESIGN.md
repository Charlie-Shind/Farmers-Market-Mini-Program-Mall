# 湾源农仓商家端 HTML 设计稿 V7

## 目标

V7 用于演示微信小程序商家端 B 端的完整功能流。输出仍然是纯 HTML，方便先看视觉和交互，再转 WXML/WXSS。

## 设计约束

1. 手机端优先，只按微信小程序商家端尺寸设计。
2. 不使用 emoji，所有图标使用统一 SVG symbol。
3. 不做 PC 控制台，不使用侧边栏。
4. 首页、活动页禁止轮播图、Banner、Hero 大宣传块。
5. 功能不随意删除，新增内容只作为演示数据和前端展示，不要求后端新增字段。
6. 页面尽量全宽，使用分隔线、紧凑行、全宽列表、底部操作条组织信息。

## V7 新增

- 补齐活动发布、活动编辑、活动选品、活动统计、草稿箱的演示数据。
- 补齐商品发布的多规格、规格组、SKU 组合、服务标签多选、图片管理、分类选择。
- 补齐聊天详情、物流发货、售后管理、退款详情、评价管理、通知、帮助中心、认证、安全、统计页。
- 增加彩色 SVG 插画和商品图，用于页面信息丰富，但不做无意义轮播或宣传 Banner。
- 增强原型交互：搜索、Tab/Chip 筛选、底部弹层、开关、步进器、活动类型选择、多选商品、Toast。

## 配色

- 主色：`#2F4F3A`，用于商家端核心操作、选中态、成功状态。
- 强主色：`#203628`，用于标题和重要数字。
- 辅助蓝：`#2F6F8F`，用于数据、通知、信息说明。
- 陶土橙：`#D76743`，用于活动、提醒、关键趋势点。
- 米白背景：`#FAF7F0`，用于轻分区、输入背景、图标底色。
- 分隔线：`#E8DFD2` / `#F0E7DB`，用于全宽列表分割。

## 页面结构

底部主流程：

- 首页 `dashboard.html`
- 聊天 `messages.html` / `chat-detail.html`
- 订单 `orders.html` / `order-detail.html` / `logistics.html` / `aftersale.html` / `refund.html` / `review.html`
- 库存 `products.html` / `publish.html` / `publish-category.html` / `publish-images.html` / `publish-sku.html` / `product-edit.html` / `product-drafts.html`
- 账号 `shop.html` / `profile-certify.html` / `profile-security.html` / `delivery.html` / `help.html`

营销活动：

- 活动列表 `marketing.html`
- 发布活动 `marketing-publish.html`
- 编辑活动 `marketing-edit.html`
- 活动选品 `marketing-products.html`
- 活动详情 `marketing-detail.html`
- 活动数据 `marketing-statistics.html`
- 活动草稿 `marketing-drafts.html`

## 转小程序规则

- `styles/tokens.css` 转为全局 WXSS 变量。
- `styles/components.css` 拆成公共组件 WXSS。
- HTML 中的 `section / article / div` 可直接映射为 `view`。
- `img` 转为 `image`。
- `button` 只保留样式和交互语义，真实逻辑接入原项目 service。
- `data-*` 原型交互只用于演示，转小程序时替换为页面 data + bindtap。


## V9 修正规则

- 规格库存必须支持演示级新增、删除、停用，不能只展示字段。
- 商品视频不能只用开关表达，必须有上传入口、已上传状态、重传、删除。
- 底部固定按钮、活动选品确认按钮、编辑活动详情按钮必须使用统一居中按钮样式。
- 从账号页进入财务页时，财务页顶部必须保留返回按钮。
- 配送页必须包含发货地址、运费模板、配送范围、冷链提示、快递偏好，所有行左中右对齐。
- 页面展示文字优先中文，不显示 price、stock、SECKILL、GROUP_BUY、CASHBACK 等字段名。
- 聊天页输入栏固定在底部，左侧工具、输入框、发送按钮三段对齐；联系按钮必须有可点击弹层或跳转。

## V10 最终活动配置规则

### 活动类型与配置映射

发布活动和编辑活动页面必须根据活动类型展示对应配置，不允许只切换类型但规则区仍然固定。

- 限时秒杀：秒杀价、活动库存、每人限购、库存预警、秒杀时段、扣减库存、售罄自动结束。
- 拼团活动：拼团价、成团人数、团有效期、每人限购、成团方式、开团时间、允许拼团分享。
- 满减优惠券：使用门槛、优惠金额、券库存、每人限领、领取时间、使用有效期、适用范围。
- 预售活动：预售价、定金、预售库存、限购、尾款开始、尾款结束、预计发货。

### 选择器组件规则

HTML 设计稿里使用 `picker-line` 作为统一选择器行：

- 时间字段使用 `datetime-local` 或 `date` 模拟小程序 picker。
- 下拉字段使用 `select` 模拟小程序 picker。
- 数值字段使用 `number-cell`，金额、件数、人数、小时、张数都要有单位。
- 转小程序时，`picker-line` 对应 `picker` 或 `picker-view`，`number-cell` 对应统一数字输入组件。

### 注释规则

设计稿允许在 HTML 内保留中文注释，说明该模块后续如何映射到微信小程序组件。注释不展示在页面中，不允许使用可见说明文案填充页面。
