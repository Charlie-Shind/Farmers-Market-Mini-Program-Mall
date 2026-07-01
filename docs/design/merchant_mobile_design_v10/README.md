# 湾源农仓商家端 HTML 设计稿 V10

V10 是活动配置最终补齐版，重点补齐发布活动和编辑活动中的类型切换、数值配置、时间配置、选择器组件和设计注释。

## 本版重点

- 发布活动：四种活动类型可切换，并显示对应配置。
- 编辑活动：基础、规则、选品、预览四段保留，规则配置跟随活动类型变化。
- 配置字段：金额、库存、限购、人数、小时、券库存、尾款时间、发货时间等均补齐。
- 选择器组件：使用统一 `picker-line`，后续可映射为微信小程序 `picker`。
- 数值组件：使用统一 `number-cell`，后续可映射为小程序数字输入组件。
- 页面内仅保留中文可见文案；设计说明使用 HTML 注释，不占页面。

## 重点查看

- pages/marketing-publish.html
- pages/marketing-edit.html
- styles/components.css
- scripts/prototype.js
- DESIGN.md
