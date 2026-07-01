# 商家端 B 端微信小程序设计稿转换版

来源：`merchant_mobile_design_v10` HTML 设计稿。

本包是独立微信小程序设计稿工程，入口页面：

```text
pages/merchant-design/dashboard/dashboard
```

## 内容

- 共转换 37 个页面。
- HTML 的页面结构已转换为 `WXML`。
- CSS 变量和组件样式已转换为 `WXSS`，并按小程序尺寸改为 `rpx`。
- `icons.svg` 已拆成独立 SVG 图标，放在 `miniprogram/assets/icons/`。
- 商品图、头像、插画保留在 `miniprogram/assets/`。
- 内联 SVG 图表已转成静态 SVG 图片，放在 `assets/generated/`。
- 页面提供基础原型交互：返回、页面跳转、电话、Toast、底部弹层、活动类型配置切换。

## 集成方式

1. 复制 `miniprogram/pages/merchant-design` 到你的小程序 `pages` 下。
2. 复制 `miniprogram/styles` 到小程序根目录。
3. 复制 `miniprogram/assets` 到小程序根目录。
4. 把 `miniprogram/app-json-pages.fragment.json` 里的路径追加进你现有 `app.json` 的 `pages`。
5. 先用 `pages/merchant-design/dashboard/dashboard` 作为预览入口，不要直接覆盖原 merchant 页面。

## 注意

这是设计稿小程序版，不直接接真实 API。后续接业务时，把静态字段替换成 `data`，把按钮的 `handleToast` 替换成真实事件即可。
