# 湾源农仓商家端小程序原生重构版

本包根据 `merchant_mobile_design_v10` HTML 设计稿重构为微信小程序原生页面，重点处理了图片、图标和微信 view/image 布局问题。

## 已生成页面

共 37 个页面，路径统一为 `pages/merchant/<page>/<page>`。

- dashboard: 商家首页
- workbench: 商家工作台
- orders: 订单列表
- order-detail: 订单详情
- products: 库存商品
- product-edit: 商品编辑
- product-drafts: 商品草稿箱
- publish: 发布商品
- publish-category: 选择分类
- publish-images: 商品图片
- publish-sku: 规格库存
- inventory: 库存调整
- marketing: 营销活动
- marketing-publish: 发布活动
- marketing-edit: 编辑活动
- marketing-detail: 活动详情
- marketing-products: 活动选品
- marketing-statistics: 活动数据
- marketing-drafts: 活动草稿箱
- finance: 财务管理
- withdraw: 提现申请
- delivery: 配送设置
- logistics: 物流发货
- aftersale: 售后管理
- refund: 退款详情
- review: 评价管理
- messages: 消息中心
- chat-detail: 买家会话
- notice: 消息通知
- notice-order: 订单通知
- notice-official: 官方通知
- shop: 账号
- merchant-public: 店铺主页预览
- profile-certify: 资质认证
- profile-security: 账号安全
- help: 帮助中心
- statistics: 经营统计

## 图片 / 图标处理规范

所有图片和图标都不直接裸放：

- 图标：`.icon-box` / `.nav-icon` / `.quick-icon` 固定宽高，内部 `image.fit-icon` 使用 `width:100%; height:100%`。
- 商品图：`.thumb-box` 固定 `156rpx × 156rpx`，小图 `.thumb-box.sm` 固定 `112rpx × 112rpx`。
- 插画：`.illust-box` 固定 `128rpx × 128rpx`。
- 头像：`.avatar-box` 固定 `72rpx × 72rpx`。
- 上传图：`.upload-box` 使用固定网格比例，内部 `image.fit-img` 填满容器。

这样做是为了避免微信小程序里 image 原始尺寸、SVG viewport、异步加载导致 view 被撑开。

## 使用方式

1. 用微信开发者工具打开本目录。
2. 入口页：`pages/merchant/dashboard/dashboard`。
3. 现在是静态数据 + 页面交互骨架，后续接接口只需要替换各页面 TS 里的 `data`。

## 注意

这是“原生重构版”，不是 HTML 机械转换版。HTML 里的 `a href`、`select`、`datetime-local`、`data-toast`、`svg use` 已经改成小程序可维护结构。
