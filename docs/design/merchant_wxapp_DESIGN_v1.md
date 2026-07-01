# 湾源农仓商家端小程序设计规范

> 版本：Design Spec v1.0  
> 范围：微信小程序商家端 B 端页面  
> 用途：作为 HTML 设计稿转 WXML / WXSS，以及后续真实业务页面重构的统一设计依据。  
> 核心原则：保留功能、统一视觉、移动端优先、禁止 PC 后台化。

---

## 1. 项目定位

湾源农仓商家端不是 PC 后台，也不是网页控制台，而是运行在微信小程序里的移动端商家操作系统。

它服务的是商家在手机上快速完成这些动作：

- 看今日经营状态
- 处理订单
- 回复买家
- 管理商品与库存
- 发布商品
- 配置活动
- 查看资金
- 处理售后
- 设置配送与店铺资料

所以它的设计逻辑不是“表格后台”，而是“移动端经营工作台”。

---

## 2. 设计目标

### 2.1 第一目标：快速操作

商家进入页面后，应能立刻知道：

- 有什么要处理
- 哪个订单要发货
- 哪个商品库存不足
- 哪个活动正在进行
- 哪笔资金可以提现

页面不应靠长说明文字解释功能，而是通过数据、状态、图标、商品图、头像和操作按钮表达。

### 2.2 第二目标：保持微信小程序移动端质感

页面必须适合 375px 左右的手机宽度。

禁止套用 PC 管理后台的结构：

- 不使用侧边栏
- 不使用大表格
- 不使用复杂控制台布局
- 不使用大面积 Banner / Hero / 轮播宣传块

### 2.3 第三目标：基于现有功能重构，不删功能

设计重构不允许因为视觉改版而删除原本已有功能。

商品编辑、订单详情、聊天、发货、退款处理、规格 SKU、活动配置等真实逻辑必须保留。

允许做的事情：

- 调整布局
- 调整层级
- 调整组件样式
- 补齐缺失页面
- 给设计稿补演示数据
- 加 SVG 图标、商品图、头像增强识别

不允许做的事情：

- 删除原有业务按钮
- 删除原有字段
- 删除原有页面入口
- 把真实业务页改成只有静态展示
- 因为设计好看而改变业务流程

---

## 3. 设计基准

当前商家端新风格以 `dashboard` 的方向为基准：

- 暖米色页面背景
- 深松绿主色
- 商品图 / 买家头像作为信息锚点
- 全宽列表与分隔线
- 紧凑数据块
- 底部固定商家导航
- 入口卡片不写解释性废话
- 重要操作按钮清晰但不压迫

设计稿 HTML V10 作为视觉参考，但迁移 to 真实小程序时必须结合现有页面逻辑，不允许直接覆盖真实业务 TS。

---

## 4. 视觉语言

### 4.1 关键词

- 农仓
- 可信
- 温和
- 高效
- 操作明确
- 移动端经营工具

### 4.2 视觉风格

整体应该像“手机里的商家助手”，而不是“网页后台缩小版”。

页面视觉应具备：

- 背景轻暖
- 内容块清晰
- 商品图真实
- 状态标签克制
- 操作按钮靠近业务场景
- 少解释，多结果
- 少装饰，多可点区域

---

## 5. 色彩系统

> 所有颜色必须进入变量，不允许页面里大量硬编码颜色。

### 5.1 主色

| 变量 | 色值 | 用途 |
|---|---:|---|
| `--merchant-primary` | `#2F4F3A` | 主按钮、选中态、核心状态 |
| `--merchant-primary-strong` | `#203628` | 标题、重要数字 |
| `--merchant-primary-soft` | `#EEF5EF` | 主色浅背景、选中卡片 |
| `--merchant-primary-line` | `#C9D8CC` | 主色浅描边 |

### 5.2 背景与容器

| 变量 | 色值 | 用途 |
|---|---:|---|
| `--merchant-bg` | `#F6F2EA` | 页面背景 |
| `--merchant-bg-soft` | `#FAF7F0` | 轻分区背景 |
| `--merchant-surface` | `#FFFFFF` | 主要内容面 |
| `--merchant-surface-warm` | `#FFFDF8` | 商品、资金、订单等温和容器 |
| `--merchant-line` | `#E8DFD2` | 主要分隔线 |
| `--merchant-line-soft` | `#F1E8DC` | 轻分隔线 |

### 5.3 强调色

| 变量 | 色值 | 用途 |
|---|---:|---|
| `--merchant-accent` | `#D76743` | 活动、促销、关键提醒 |
| `--merchant-accent-soft` | `#FFF0EA` | 活动浅背景 |
| `--merchant-info` | `#2F6F8F` | 数据、通知、信息点 |
| `--merchant-info-soft` | `#EAF4F7` | 信息浅背景 |
| `--merchant-warning` | `#B7791F` | 待处理、库存预警 |
| `--merchant-warning-soft` | `#FFF7E6` | 预警浅背景 |
| `--merchant-danger` | `#A6453A` | 删除、退款拒绝、异常 |
| `--merchant-danger-soft` | `#FFF0EE` | 异常浅背景 |

### 5.4 文本色

| 变量 | 色值 | 用途 |
|---|---:|---|
| `--merchant-text` | `#1F2A24` | 主标题、正文 |
| `--merchant-text-sub` | `#5F685F` | 次要正文 |
| `--merchant-text-muted` | `#8A9289` | 辅助信息 |
| `--merchant-text-placeholder` | `#B7B0A6` | 占位文字 |

### 5.5 状态色规则

状态色必须低饱和，不允许页面大量红色警告。

| 状态 | 颜色规则 |
|---|---|
| 进行中 / 已完成 / 正常 | 深松绿 |
| 待处理 / 待发货 / 库存不足 | 金棕色 |
| 活动 / 促销 / 秒杀 | 陶土橙 |
| 通知 / 数据 / 系统信息 | 蓝绿色 |
| 退款 / 删除 / 驳回 | 红棕色，但只用于小面积标签或按钮 |

---

## 6. 字体与字号

微信小程序不使用外部字体，默认使用系统字体。

### 6.1 字号层级

| 层级 | rpx | 用途 |
|---|---:|---|
| 页面大标题 | `40rpx` | 首页、详情主标题 |
| 分区标题 | `32rpx` | 区块标题 |
| 重要数字 | `38rpx` - `44rpx` | 数据卡主数值 |
| 正文 | `28rpx` | 商品名、订单信息 |
| 次正文 | `26rpx` | 辅助信息 |
| 标签 / 注释 | `22rpx` - `24rpx` | 状态、时间、角标 |

### 6.2 字重

| 用途 | 字重 |
|---|---|
| 页面标题 | `700` |
| 区块标题 | `600` |
| 商品名 / 订单号 | `600` |
| 正文 | `400` |
| 次要信息 | `400` |

### 6.3 文本规则

不允许在可见页面出现：

- `status`
- `price`
- `stock`
- `SECKILL`
- `GROUP_BUY`
- `CASHBACK`
- `demo`
- `prototype`
- `点击进入编辑`
- `按设计稿逐步补齐`

页面展示文字必须中文化。

---

## 7. 间距系统

基础单位：`8rpx`

| 变量 | 数值 | 用途 |
|---|---:|---|
| `--space-1` | `8rpx` | 小间距 |
| `--space-2` | `16rpx` | 组件内部间距 |
| `--space-3` | `24rpx` | 页面左右边距、列表间距 |
| `--space-4` | `32rpx` | 分区间距 |
| `--space-5` | `40rpx` | 大分区间距 |

### 7.1 页面边距

- 主页面左右边距：`24rpx`
- 全宽列表可以贴近屏幕，但内容内边距必须保持 `24rpx`
- 底部导航页面需要预留底部空间：`calc(120rpx + env(safe-area-inset-bottom))`
- 固定底部操作条页面需要预留底部空间：`calc(148rpx + env(safe-area-inset-bottom))`

### 7.2 全宽列表规则

订单、商品、消息、活动、资金流水等列表不需要每一项都套大卡片。

推荐结构：

```text
页面背景
  白色全宽列表区
    行 1
    分隔线
    行 2
    分隔线
    行 3
```

只有在信息复杂、需要聚合多个字段时，才使用卡片。

---

## 8. 圆角与阴影

### 8.1 圆角

| 变量 | 数值 | 用途 |
|---|---:|---|
| `--radius-sm` | `12rpx` | 标签、图标底 |
| `--radius-md` | `20rpx` | 按钮、输入框、小卡片 |
| `--radius-lg` | `28rpx` | 大卡片、弹层 |
| `--radius-full` | `999rpx` | 胶囊按钮、头像 |

### 8.2 阴影

阴影必须轻，不允许做强烈悬浮。

| 变量 | 用途 |
|---|---|
| `--shadow-soft` | 普通浮层、轻卡片 |
| `--shadow-panel` | 底部弹层、固定操作条 |

建议：

```css
--shadow-soft: 0 8rpx 24rpx rgba(47, 79, 58, 0.08);
--shadow-panel: 0 -8rpx 28rpx rgba(31, 42, 36, 0.08);
```

---

## 9. 图标与图片规则

### 9.1 图标

- 不允许使用 emoji。
- 所有图标使用统一 SVG。
- 图标尺寸统一：`32rpx` / `40rpx` / `48rpx`。
- 底部导航图标统一 `44rpx`。
- 图标颜色跟随状态：普通灰绿，选中深松绿，活动陶土橙。

### 9.2 商品图

商品图是移动电商页面的核心信息，不允许缺失。

商品图尺寸建议：

| 场景 | 尺寸 |
|---|---:|
| 订单商品图 | `128rpx × 128rpx` |
| 商品列表图 | `144rpx × 144rpx` |
| 活动选品图 | `116rpx × 116rpx` |
| 草稿箱商品图 | `120rpx × 120rpx` |
| 商品编辑图片格 | `156rpx × 156rpx` |

图片必须设置固定宽高：

```css
.goods-image {
  width: 128rpx;
  height: 128rpx;
  border-radius: 16rpx;
  object-fit: cover;
  flex-shrink: 0;
}
```

小程序里使用：

```xml
<image class="goods-image" src="{{item.coverUrl}}" mode="aspectFill" />
```

### 9.3 头像

订单、聊天、售后页优先展示买家头像。

头像尺寸建议：

| 场景 | 尺寸 |
|---|---:|
| 列表头像 | `72rpx × 72rpx` |
| 订单买家头像 | `64rpx × 64rpx` |
| 聊天头像 | `72rpx × 72rpx` |
| 店铺头像 | `96rpx × 96rpx` |

---

## 10. 页面类型

商家端页面分为五类，不同类型有不同结构。

### 10.1 Tab 主页面

包括：

- 首页
- 聊天
- 订单
- 库存
- 账号

规则：

- 保留底部商家导航
- 顶部不做复杂返回栏
- 主要内容必须避免被底部导航遮挡
- 页面内容以经营动作和列表为主

### 10.2 二级列表页

包括：

- 活动列表
- 草稿箱
- 售后列表
- 评价列表
- 通知列表
- 资金流水
- 配送模板

规则：

- 顶部使用统一标题栏
- 可以有搜索栏、Tab、筛选 Chip
- 列表项必须有清晰主信息和操作区
- 不使用大面积说明区

### 10.3 表单页

包括：

- 发布商品
- 编辑商品
- 发布活动
- 编辑活动
- 提现
- 配送设置
- 店铺资料

规则：

- 使用 `form-section`
- 一行一个字段，复杂字段拆子组件
- 数值输入使用 `number-cell`
- 选择字段使用 `picker-line`
- 图片 / 视频上传使用统一上传格
- 底部固定操作条

### 10.4 详情页

包括：

- 订单详情
- 活动详情
- 退款详情
- 物流发货
- 聊天详情

规则：

- 顶部必须有返回
- 首屏先给状态
- 信息按业务顺序排列
- 底部固定主要操作
- 不做 Banner / Hero

### 10.5 功能入口页

包括：

- 工作台
- 账号功能
- 帮助中心

规则：

- 入口只保留图标、功能名、必要数字或状态
- 不写长描述
- 一屏内尽量看完核心入口
- 功能入口要真实可跳转，不允许乱跳到无关页

---

## 11. 组件规范

### 11.1 页面根节点

所有商家页使用统一根类：

```xml
<view class="merchant-page">
  ...
</view>
```

底部有导航时：

```xml
<view class="merchant-page has-tabbar">
  ...
  <merchant-bottom-nav active="dashboard" />
</view>
```

底部有固定操作条时：

```xml
<view class="merchant-page has-bottom-actions">
  ...
  <view class="bottom-actions">...</view>
</view>
```

### 11.2 标题栏

二级页统一：

```xml
<view class="page-titlebar">
  <view class="titlebar-back" bindtap="goBack">
    <image class="icon" src="/assets/icons/back.svg" />
  </view>
  <view class="titlebar-title">页面标题</view>
  <view class="titlebar-action">保存</view>
</view>
```

规则：

- 左侧返回区宽度固定
- 标题居中或左对齐，但同一类页面要统一
- 右侧操作文字不超过 4 个汉字
- 不允许标题栏高度随页面变化

### 11.3 搜索栏

```xml
<view class="search-pill">
  <image class="search-icon" src="/assets/icons/search.svg" />
  <input class="search-input" placeholder="搜索订单号、商品、买家" />
</view>
```

规则：

- 高度固定 `72rpx`
- 圆角胶囊
- 输入框不贴边
- 不出现英文 placeholder

### 11.4 Tab 与筛选

状态 Tab：

```xml
<scroll-view scroll-x class="filter-tabs">
  <view class="filter-tab active">全部</view>
  <view class="filter-tab">待发货</view>
</scroll-view>
```

Chip 筛选：

```xml
<view class="filter-chip active">进行中</view>
<view class="filter-chip">未开始</view>
```

规则：

- Tab 表示一级状态
- Chip 表示二级筛选
- 不允许 Tab、Chip、按钮三套样式混用

### 11.5 状态标签

```xml
<view class="status-pill status-warning">待发货</view>
```

状态类：

```text
status-success
status-warning
status-danger
status-info
status-muted
status-accent
```

规则：

- 标签高度固定
- 文案中文
- 不超过 5 个汉字
- 不作为按钮使用

### 11.6 按钮

按钮尺寸：

| 类型 | 高度 | 用途 |
|---|---:|---|
| 小按钮 | `56rpx` | 卡片内操作 |
| 中按钮 | `72rpx` | 列表主要操作 |
| 大按钮 | `88rpx` | 底部主操作 |

按钮类型：

```text
btn-primary
btn-secondary
btn-ghost
btn-danger
btn-muted
```

规则：

- 按钮文字必须水平垂直居中
- 同一行多个按钮高度必须一致
- 不允许按钮内容溢出屏幕
- 主操作最多一个

### 11.7 全宽列表项

适用于消息、流水、通知、工作台入口。

```xml
<view class="list-row">
  <view class="row-left">...</view>
  <view class="row-main">...</view>
  <view class="row-right">...</view>
</view>
```

规则：

- 左中右对齐
- 左侧图标或头像固定宽度
- 右侧状态或箭头固定宽度
- 主内容允许换行，但不得挤压右侧操作

### 11.8 订单卡片

订单列表必须优先展示买家头像和商品图片。

结构：

```text
订单头：买家头像 + 买家昵称 + 时间 + 状态
商品行：商品图 + 商品名 + 规格 + 数量 + 金额
操作行：联系买家 / 查看详情 / 发货
```

规则：

- 买家头像必须在订单头出现
- 商品图必须固定宽高
- 状态放右上角
- 操作按钮放底部右侧
- 不使用表格形式

### 11.9 商品卡片

结构：

```text
商品图
商品名
价格 / 库存 / 状态
操作按钮
```

规则：

- 库存、审核、上下架状态必须中文
- “下架”等按钮不得超出屏幕
- 按钮组使用 flex 且允许换行或压缩

### 11.10 表单分区

```xml
<view class="form-section">
  <view class="form-section-title">基础信息</view>
  <view class="form-cell">
    <view class="form-label">商品标题</view>
    <input class="form-input" />
  </view>
</view>
```

规则：

- 一个分区只放同类字段
- 字段之间用分隔线，不要每行都套卡片
- 必填项可以用小红棕点标识，不大面积红色

### 11.11 选择器行

```xml
<picker mode="selector" range="{{categoryOptions}}" bindchange="onCategoryChange">
  <view class="picker-line">
    <view class="picker-label">商品分类</view>
    <view class="picker-value">{{categoryName || '请选择'}}</view>
    <image class="picker-arrow" src="/assets/icons/chevron-right.svg" />
  </view>
</picker>
```

规则：

- 时间、分类、快递公司、活动类型、成团方式都用选择器行
- 不使用纯按钮冒充选择器
- 选择器值为空时使用“请选择”

### 11.12 数值输入行

```xml
<view class="number-cell">
  <view class="number-label">秒杀价</view>
  <input class="number-input" type="digit" value="{{price}}" />
  <view class="number-unit">元</view>
</view>
```

规则：

- 金额使用 `type="digit"`
- 数量使用 `type="number"`
- 单位必须右侧固定
- 不允许金额、件数、人数混在一个输入框里

### 11.13 SKU 卡片

SKU 不使用横向拥挤表格，必须使用卡片式。

结构：

```text
规格名
规格值
价格
库存
预警
启用 / 停用
删除
```

规则：

- 支持删除规格组
- 支持删除规格值
- 支持删除 SKU 组合
- 支持停用 SKU
- 不允许编辑 SKU 时把多规格变成单规格

### 11.14 图片上传

```xml
<view class="upload-grid">
  <view class="upload-item" wx:for="{{images}}">
    <image src="{{item.url}}" mode="aspectFill" />
    <view class="upload-delete">删除</view>
  </view>
  <view class="upload-add" bindtap="chooseImage">添加图片</view>
</view>
```

规则：

- 上传格固定尺寸
- 图片使用 `mode="aspectFill"`
- 删除按钮必须可点
- 不叫“轮播图”，统一叫“商品图片”

### 11.15 视频上传

商品视频必须是上传组件，不允许只做开关。

结构：

```text
未上传：添加视频
已上传：视频封面 / 重传 / 删除
```

规则：

- 支持上传
- 支持重传
- 支持删除
- 可以有视频封面
- 视频不作为必填项

### 11.16 底部操作条

```xml
<view class="bottom-actions">
  <button class="btn btn-secondary">保存草稿</button>
  <button class="btn btn-primary">提交上架</button>
</view>
```

规则：

- 固定底部
- 考虑安全区
- 按钮高度一致
- 主按钮在右侧
- 页面内容底部必须留出空间

### 11.17 底部弹层

用于筛选、联系买家、选择操作。

规则：

- 遮罩点击关闭
- 顶部有标题
- 操作项高度固定
- 危险操作单独使用红棕色
- 不用弹窗展示大量表单

### 11.18 聊天输入栏

结构：

```text
左侧工具按钮 + 输入框 + 发送按钮
```

规则：
- 固定底部
- 三段垂直居中
- 输入框高度稳定
- 不允许输入栏和消息内容重叠
- 联系按钮必须有功能：电话、复制微信号、查看订单

---

## 12. 页面规范

### 12.1 首页 dashboard

首页不允许出现：

- Banner
- Hero
- 轮播宣传块
- 大段描述文案

首页必须包含：

- 店铺状态
- 经营数据
- 常用入口
- 待办事项
- 经营趋势图
- 底部导航

首页数据块只放商家关心的结果，不写解释性长句。

### 12.2 工作台 workbench

工作台是功能入口集合，不是说明页。

入口只允许：

- SVG 图标
- 功能名
- 必要数字 / 状态

不允许：

- “用于管理xxx”
- “点击进入xxx”
- “秒杀、拼团、满减优惠券、选品和草稿”这类说明

### 12.3 消息 messages

必须有：

- 全部
- 订单通知
- 官方通知
- 聊天会话

列表结构：

```text
头像 / 图标
标题
最后消息
时间
未读点
```

### 12.4 聊天详情 chat-detail

必须有：

- 返回
- 买家信息
- 联系按钮
- 消息气泡
- 底部输入栏
- 图片 / 工具入口
- 发送按钮

联系按钮必须弹出：

- 电话联系
- 复制微信号
- 查看订单

### 12.5 订单列表 orders

必须有：

- 搜索
- 状态 Tab
- 筛选
- 买家头像
- 商品图片
- 订单状态
- 操作按钮

不使用表格，不只显示订单号。

### 12.6 订单详情 order-detail

必须有：

- 订单状态
- 买家信息
- 收货地址
- 商品清单
- 金额明细
- 物流信息
- 售后信息
- 底部操作

订单详情可以保留原 TS，重写 WXML / LESS。

### 12.7 商品列表 products

必须有：

- 搜索
- 状态 Tab
- 商品图片
- 商品标题
- 库存
- 价格
- 审核状态
- 上架 / 下架 / 编辑

按钮不得溢出屏幕。

### 12.8 商品发布 / 编辑 publish / product-edit

必须有：

- 商品图片上传
- 商品视频上传
- 分类选择
- 标题
- 副标题
- 价格
- 库存
- 单规格 / 多规格
- 规格组
- SKU 组合
- 服务标签
- 产地
- 溯源
- 预售
- 保存草稿
- 提交上架

真实项目中 `products/edit/edit.ts` 不允许随便覆盖，只能重排 WXML / LESS。

### 12.9 商品草稿箱 product-drafts

必须有：

- 草稿商品图
- 商品标题
- 更新时间
- 完成度
- 继续编辑
- 删除
- 发布

继续编辑进入：

```text
/pages/merchant/products/edit/edit?draftId=xxx
```

### 12.10 活动列表 marketing

必须有：

- 发布活动按钮
- 活动类型 Tab
- 状态筛选
- 活动卡片
- 详情
- 编辑
- 数据
- 草稿箱入口

不允许出现旧的 `merchant-marketing__hero`。

### 12.11 发布活动 / 编辑活动

必须根据活动类型展示不同配置。

#### 限时秒杀

字段：

- 活动名称
- 开始时间
- 结束时间
- 活动商品
- 秒杀价
- 活动库存
- 每人限购
- 库存预警
- 扣减库存方式
- 售罄是否自动结束

#### 拼团活动

字段：

- 活动名称
- 开始时间
- 结束时间
- 活动商品
- 拼团价
- 成团人数
- 团有效期
- 每人限购
- 成团方式
- 是否允许分享

#### 满减优惠券

字段：

- 活动名称
- 领取时间
- 使用有效期
- 使用门槛
- 优惠金额
- 券库存
- 每人限领
- 适用范围

#### 预售活动

字段：

- 活动名称
- 预售时间
- 活动商品
- 预售价
- 定金
- 预售库存
- 每人限购
- 尾款开始
- 尾款结束
- 预计发货

### 12.12 活动选品

必须有：

- 搜索
- 商品多选
- 商品图
- 商品名
- 价格
- 库存
- 已选数量
- 底部确认按钮

确认按钮文字必须居中。

### 12.13 活动详情

必须有：

- 活动状态
- 活动类型
- 活动时间
- 商品数
- 成交数据
- 活动商品
- 操作按钮

### 12.14 活动数据

必须有：

- 浏览
- 成交
- 买家
- 转化
- 简单趋势图
- 商品效果列表

### 12.15 财务 finance

从账号页进入财务页时必须有返回键。

必须有：

- 可提现金额
- 近期待结算
- 资金流水
- 提现入口

### 12.16 提现 withdraw

必须有：

- 可提现金额
- 提现金额输入
- 手续费
- 到账账户
- 提交按钮
- 提现记录

### 12.17 配送 delivery

必须有：

- 发货地址
- 运费模板
- 配送范围
- 冷链提示
- 快递偏好
- 保存按钮

所有行必须左中右对齐。

### 12.18 店铺账号 shop

必须有：

- 店铺头像
- 店铺名称
- 状态
- 经营数据
- 功能入口
- 财务
- 配送
- 认证
- 安全
- 帮助

跳转必须准确，不允许配送跳财务、工作台跳商品。

---

## 13. 页面映射规则

### 13.1 设计稿到真实小程序路径

| 设计稿页面 | 小程序路径 | 处理方式 |
|---|---|---|
| dashboard | `/pages/merchant/dashboard/dashboard` | 保留并细调 |
| workbench | `/pages/merchant/workbench/workbench` | 新增 |
| messages | `/pages/merchant/messages/messages` | 补齐 WXML |
| chat-detail | `/pages/merchant/messages/detail/detail` | 新增或映射 |
| orders | `/pages/merchant/orders/orders` | 重排后接接口 |
| order-detail | `/pages/merchant/orders/detail/detail` | 保留 TS，重写 WXML/LESS |
| products | `/pages/merchant/products/products` | 重排后接接口 |
| product-edit | `/pages/merchant/products/edit/edit` | 保留 TS，重写 WXML/LESS |
| product-drafts | `/pages/merchant/products/drafts/drafts` | 新增 |
| finance | `/pages/merchant/finance/finance` | 重排后接接口 |
| withdraw | `/pages/merchant/withdraw/withdraw` | 重排后接接口 |
| marketing | `/pages/merchant/marketing/marketing` | 删除旧 hero，重做 |
| marketing-publish | `/pages/merchant/marketing/publish/publish` | 新增 |
| marketing-edit | `/pages/merchant/marketing/edit/edit` | 活动规则组件化 |
| marketing-products | `/pages/merchant/marketing/products/products` | 新增 |
| marketing-detail | `/pages/merchant/marketing/detail/detail` | 新增 |
| marketing-statistics | `/pages/merchant/marketing/statistics/statistics` | 新增 |
| marketing-drafts | `/pages/merchant/marketing/drafts/drafts` | 新增 |
| delivery | `/pages/merchant/delivery/delivery` | 新增 |
| certify | `/pages/merchant/profile/certify/certify` | 新增 |
| security | `/pages/merchant/profile/security/security` | 新增 |

### 13.2 真实业务 TS 保留规则

这些页面不允许直接用设计稿 TS 覆盖：

- `products/edit/edit.ts`
- `orders/detail/detail.ts`
- 已有真实订单处理逻辑的页面
- 已有真实上传逻辑的页面
- 已有真实聊天逻辑 of the page

正确做法：

```text
真实 TS 保留
WXML 重排
LESS 重写
字段名小范围适配
```

---

## 14. WXML / WXSS 转换规则

### 14.1 HTML 到 WXML

| HTML | WXML |
|---|---|
| `div` / `section` / `article` | `view` |
| `span` / `p` | `text` 或 `view` |
| `img` | `image` |
| `button` | `button` 或 `view role="button"` |
| `input type="number"` | `input type="number"` |
| `input type="datetime-local"` | `picker` |
| `select` | `picker` |
| `a href` | `navigator` |

### 14.2 不可直接搬的内容

HTML 里的：

- `data-*`
- `onclick`
- `class active` 静态切换
- `select`
- `datetime-local`

转小程序时要改成：

- `data-xxx`
- `bindtap`
- `wx:if / wx:for / class="{{...}}"`
- `picker`
- 页面 data + 事件函数

### 14.3 注释规则

设计稿允许 HTML / WXML 里保留中文注释，说明组件映射逻辑。

允许：

```xml
<!-- 活动类型切换：后续接 activityType 字段，规则区用 wx:if 控制 -->
```

不允许把注释变成页面可见文字。

---

## 15. 代码结构建议

建议拆分：

```text
styles/
  tokens.wxss
  components.wxss
  list.wxss
  form.wxss
  order.wxss
  product.wxss
  marketing.wxss
```

页面不要全部堆到一个 `common.less`。

### 15.1 禁止新写旧类

后续新页面不再使用：

- `merchant-shell`
- `merchant-panel`
- `merchant-titlebar`
- `merchant-section-head`
- `merchant-marketing__hero`
- `merchant-detail-banner`

可以短期保留兼容旧页面，但新页面不得继续增加。

### 15.2 推荐类名

```text
merchant-page
page-titlebar
search-pill
filter-tabs
filter-chip
status-pill
list-section
list-row
order-card
goods-row
metric-strip
form-section
form-cell
picker-line
number-cell
upload-grid
sku-card
bottom-actions
bottom-sheet
```

---

## 16. 交互规则

### 16.1 点击区域

所有可点击区域最小高度不低于 `64rpx`。

按钮最小高度：

- 小按钮：`56rpx`
- 普通按钮：`72rpx`
- 底部主按钮：`88rpx`

### 16.2 Toast

用于：

- 保存成功
- 删除成功
- 已复制
- 已发送
- 已加入活动
- 已选择商品

不用于复杂错误说明。

### 16.3 弹层

用于：

- 筛选
- 联系买家
- 选择快递
- 删除确认
- 活动操作

表单编辑不建议放入底部弹层，复杂表单应进入独立页面。

### 16.4 空状态

空状态允许使用 SVG 插画，但不写大段说明。

结构：

```text
插画
标题：暂无订单
按钮：去发布商品
```

不写：

```text
这里用于展示您的订单，订单产生后会显示在这里
```

---

## 17. 内容文案规则

### 17.1 文案原则

- 直接
- 中文
- 短句
- 操作导向
- 不解释产品

### 17.2 推荐写法

| 不推荐 | 推荐 |
|---|---|
| 点击进入编辑 | 编辑 |
| 按设计稿逐步补齐 | 删除 |
| status | 状态 |
| price | 价格 |
| stock | 库存 |
| Activity Type | 活动类型 |
| Marketing | 营销 |
| 商品轮播图 | 商品图片 |
| 创建一个可演示的营销活动 | 发布活动 |

### 17.3 描述性语句限制

首页、工作台、活动列表不允许使用描述性语句填充。

允许：

```text
订单
商品
营销活动
待发货 12
```

不允许：

```text
用于管理订单、售后、发货和买家联系
```

---

## 18. 后端数据与设计关系

设计稿可以补演示数据，但真实开发时不要把演示字段硬塞到后端。

### 18.1 仅前端展示即可

- SVG 图标
- 静态插画
- 页面空状态
- 本地占位商品图
- Tab 文案
- 筛选弹层 UI

### 18.2 需要后端支持

- 活动规则保存
- 活动选品
- 商品草稿箱
- 活动草稿箱
- SKU 独立编辑
- 售后列表
- 评价回复
- 配送设置
- 工作台统计趋势
- 订单列表商品图 / 买家头像

---

## 19. 页面迁移顺序

### 第一批：修一致性硬伤

1. 补 `messages.wxml`
2. 重做 `marketing.wxml / marketing.less`
3. 新增 `workbench`
4. 新增 `delivery`
5. 修 `shop` 跳转
6. 新增 `products/drafts`

### 第二批：保留功能改视觉

1. `products/edit` 保留 TS，重排 WXML / LESS
2. `orders/detail` 保留 TS，重排 WXML / LESS
3. `marketing/edit` 按活动类型重排规则区

### 第三批：静态设计页接真实接口

1. `orders` 接商家订单接口
2. `products` 接商家商品接口
3. `finance` 接钱包和流水
4. `withdraw` 接提现记录和创建提现
5. `shop` 接商家资料

---

## 20. 验收清单

每个页面提交前必须检查：

```text
1. 不出现 emoji
2. 不出现英文展示字段
3. 不出现描述性废话
4. 不出现大 Banner / Hero / 轮播宣传块
5. 商品图固定宽高
6. 头像固定宽高
7. 按钮文字居中
8. 按钮不溢出屏幕
9. 输入行左右对齐
10. 底部导航不遮挡内容
11. 底部操作条考虑安全区
12. 所有可点击项有 bindtap 或 navigator
13. 所有页面可返回
14. 真实 TS 功能没有被删
15. 页面路径跳转正确
16. 状态标签中文
17. 删除、停用、拒绝类操作有确认
18. 活动类型切换后配置区同步变化
19. SKU 支持新增、删除、停用
20. 商品视频支持上传、重传、删除
```

---

## 21. 最终约束

后续所有商家端页面都必须遵守：

```text
以 dashboard 新风格为基准
以 V10 设计稿为视觉源
以真实 TS 为功能源
以 WXML / WXSS 迁移为主要工作
不乱删功能
不乱改业务流
不 PC 后台化
不靠说明文案填页面
不使用 emoji
```

这份规范是商家端小程序后续设计与开发的统一依据。
