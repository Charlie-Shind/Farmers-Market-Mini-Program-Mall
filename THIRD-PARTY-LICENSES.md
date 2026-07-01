# 第三方依赖与协议声明

> 本项目严格使用**免费可商用**的开源图标与资源。
> 本文件是协议与来源的唯一权威声明，任何引入新图标库的行为都必须**先**追加到本文件，**后**在代码中引用。

---

## 1. 图标资源

### 1.1 Tabler Icons（主图源）

| 项 | 值 |
|---|---|
| 来源 | https://github.com/tabler/tabler-icons |
| 官网 | https://tabler.io/icons |
| 协议 | **MIT License** |
| 商用 | ✅ 免费商用（含商业产品） |
| 范围 | 全平台 C 端、B 端、Admin 后台的所有图标（除特别声明外） |
| 引入方式 | 精选 SVG 字符串内联（不打包整个字体库，按需引用） |

**MIT 协议摘要**（与 Apache 2.0 双向兼容）：

```
Copyright (c) 2020-2026 Paweł Kuna

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
```

### 1.2 双协议支持说明（MIT ↔ Apache 2.0）

| 协议 | 项目内使用情况 |
|---|---|
| **MIT** | 当前所有图标采用（Tabler Icons），MIT 协议允许在 Apache 2.0 项目中使用 |
| **Apache 2.0** | **预留支持位**——如未来引入 Google Material Symbols、Bootstrap Icons（双协议 MIT+CC）、Lucide 等任何 Apache 2.0 协议资源，可直接引入而无需重新授权 |

**协议兼容性事实**：
- MIT 与 Apache 2.0 **双向兼容**（Apache 2.3+ 官方明文确认）
- 本项目同时接受两种协议的资源
- 引入新资源时，在本文件追加子节，标明来源与协议

### 1.3 禁止引入的协议

以下协议的资源**不得**引入本项目：

- ❌ GPL / LGPL / AGPL（强传染性，商用受限）
- ❌ 商业付费图标库（Font Awesome Pro、Iconfinder 付费等）
- ❌ 来源不明、无协议声明的资源
- ❌ CC BY-NC（禁止商业使用）

---

## 2. 字体资源

| 资源 | 协议 | 用途 |
|---|---|---|
| 系统字体栈 | 系统自带 | 微信小程序、Admin 后台、桌面端统一使用 `PingFang SC` / `Hiragino Sans GB` / `Microsoft YaHei` / `sans-serif` |
| 暂未引入网络字体 | — | 如未来引入（例如阿里巴巴普惠体），必须先追加本节 |

---

## 3. 图片资源

| 资源 | 协议 | 用途 |
|---|---|---|
| 商品示例图（`/assets/images/`） | 自有 / CC0 | 来自 Unsplash CC0 或自绘，引用时标注 |
| 品牌 Logo | 自有 | 项目自绘（SVG） |
| 禁止引入付费图库 | — | 视觉中国、站酷海洛等付费图库不得引入 |

---

## 4. 代码依赖

详见 `package.json` 与 `wxapp/miniprogram/package.json` 中 `dependencies` 字段，每个依赖的协议以 npm 包自身声明为准。本节将定期同步：

- ✅ 允许：MIT、Apache 2.0、BSD、ISC、CC0、Public Domain
- ⚠️ 评审：MPL（弱传染，需逐项判断）
- ❌ 禁止：GPL 系、未声明协议的 npm 包

---

## 5. 变更记录

| 日期 | 变更人 | 变更 |
|---|---|---|
| 2026-06-10 | 总控智能体 | 初版：声明 Tabler Icons (MIT) 作为主图源；预留 Apache 2.0 协议位 |
