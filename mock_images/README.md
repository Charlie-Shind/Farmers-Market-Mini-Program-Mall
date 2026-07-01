# 农仓平台测试图片资产指南 (Mock Images Guide)

本目录（`mock_images/`）存放了一套高质量、符合农产品与农仓平台调性的测试图片（Mock Images）。主要用于本地及测试环境下的 **API 上传测试**、**数据库 Seed 初始化**，以及**前端 UI 占位图替换**。

---

## 1. 图片资产列表与字段映射

| 文件名 | 物理分辨率 / 比例 | 推荐对应的数据库字段 | 功能与设计说明 |
| :--- | :--- | :--- | :--- |
| **`avatar_farmer.png`** | 1:1 (正方形) | `User.avatarUrl` <br> `Merchant.storeLogo` | 亲切的戴草帽的中年农夫头像，用于测试商家/农场主个人资料及店铺头像。 |
| **`logo_wanyan_farm.png`** | 1:1 (正方形) | `Merchant.storeLogo` | 绿金配色、质感高端的“湾源农仓”徽标，用于测试店铺默认标识。 |
| **`qual_business_license.png`** | 竖版 | `MerchantQualification.fileUrl` | 模拟营业执照/合作社证书版式，带红色圆印章，用于入驻资质审核上传测试。 |
| **`product_orange.png`** | 1:1 (正方形) | `Product.coverUrl` <br> `ProductImage.imageUrl` | 摆放在木筐里的新鲜赣南脐橙，用于高画质商品详情页与列表展示。 |
| **`product_egg.png`** | 1:1 (正方形) | `Product.coverUrl` <br> `ProductImage.imageUrl` | 巢穴干草中的散养土鸡蛋，用于高画质商品详情页与列表展示。 |
| **`banner_farm_fresh.png`** | 宽幅横图 | `Banner.imageUrl` | 清晨朝露中的翠绿农田与远山，用于测试首页滚动轮播图或预售 Banner。 |
| **`refund_damaged_box.png`** | 手机拍摄比例 | `RefundApply.applyImages` | 被挤压变形和撕裂的硬纸箱包裹，用于测试售后/退款凭证图片上传。 |

---

## 2. 快速接口测试：API 上传示例

后端提供了文件上传接口：`POST /files/upload`，多单部分表单字段名为 `file`。

你可以通过以下命令在命令行快速请求 API 进行文件上传测试：

### 示例 1: 上传商户头像 (Windows PowerShell)
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/files/upload" `
  -Method Post `
  -Form @{ file = Get-Item "H:\Project\gowork\farm\mock_images\avatar_farmer.png" }
```

### 示例 2: 上传商户头像 (curl - 适用于 Git Bash / Linux / macOS)
```bash
curl -X POST http://localhost:3000/files/upload \
  -F "file=@./mock_images/avatar_farmer.png"
```

### 示例 3: 上传营业执照以供资质审核
```bash
curl -X POST http://localhost:3000/files/upload \
  -F "file=@./mock_images/qual_business_license.png"
```

---

## 3. 数据库 Seed 脚本静态引用

如果需要通过 Prisma Seed 脚本预置一些精美数据，你可以先手动调用上传接口，将返回的 URL（例如：`http://localhost:3000/uploads/2026/06/xxx.png`）配置在 `seed.ts` 中；或者在后端将此目录挂载为静态资源直接引用。
