<<<<<<< HEAD
# 浔源农仓（Farm）

> 面向农产品交易场景的多端业务系统，包含 C 端消费者小程序、B 端商家小程序、平台管理后台和 NestJS 后端 API。
>
> 本仓库当前目标是把“看商品、下单、支付、发货、收货、售后”这条核心链路跑通，并持续补齐营销、消息、搜索和后台运营能力。

---

## 项目简介

浔源农仓是一个农产品电商平台，核心目标是：

- 让消费者能方便地找到商品并完成购买
- 让商家能上架商品、处理订单、发货和售后
- 让平台运营能统一管理商品、活动、消息、Banner、订单和配置

平台目前采用三端协同模式：

- `backend`：后端 API，负责业务逻辑、鉴权、数据落库、支付与文件存储
- `admin`：平台管理后台，负责运营管理与审核配置
- `wxapp`：微信小程序，包含 C 端消费者流程和 B 端商家流程

---

## 主要能力

当前已覆盖或正在收口的能力包括：

- 首页展示
- 商品分类和商品列表
- 商品详情与溯源
- 搜索
- 购物车与结算
- 微信支付与订单状态流转
- 订单列表、订单详情、物流详情
- 售后申请与仲裁
- 收藏、浏览历史、消息中心
- 商家商品管理、订单处理、提现管理
- 平台后台的用户、商家、商品、活动、Banner、配置管理

---

## 技术栈

| 层 | 技术 |
|---|---|
| 后端 | NestJS、Prisma、PostgreSQL、Redis、MinIO |
| 管理后台 | Vue 3、Vite、TypeScript |
| 小程序 | 微信原生小程序、TypeScript、Less |
| 部署 | Docker、Nginx、PM2 |

---

## 仓库结构

```text
farm/
├── backend/         后端 API
├── admin/           平台管理后台
├── wxapp/           微信小程序
├── docs/            项目文档
├── shared/          共享类型与常量
├── base/            基础脚手架 (包含 docker-compose.yml)
├── mock_images/     测试图片素材
└── .env.example
```

### 目录说明

- `backend/`：NestJS 后端，包含鉴权、业务服务、Prisma、Redis、对象存储和种子数据
- `admin/`：平台运营后台，主要面向管理员
- `wxapp/`：微信小程序端，覆盖 C 端消费者和 B 端商家能力
- `docs/`：需求、接口、技术、数据、设计和进度记录
- `shared/`：前后端共享的枚举、类型和常量
- `base/`：本地基础设施编排与开发支撑配置
- `mock_images/`：本地开发和种子数据使用的图片素材
- `tmp/`：临时产物或本地调试文件，不作为正式文档入口

### 文档入口

- 首次接手：[`docs/上手指南/README.md`](./docs/%E4%B8%8A%E6%89%8B%E6%8C%87%E5%8D%97/README.md)
- 正式文档总览：[`docs/README.md`](./docs/README.md)
- 阶段记录：[`docs/进度记录/README.md`](./docs/%E8%BF%9B%E5%BA%A6%E8%AE%B0%E5%BD%95/README.md)

---

## 快速使用

### 1. 启动基础设施

```bash
docker compose -f base/docker-compose.yml --env-file .env.local up -d
```

基础设施默认包含：

- PostgreSQL
- Redis
- MinIO

### 2. 启动后端

```bash
cd backend
cp .env.example .env.local
npm install
npm run prisma:generate
npx prisma db push
npm run start:dev
```

后端默认监听：

- `http://localhost:6002`

### 3. 启动管理后台

```bash
cd admin
npm install
npm run dev
```

管理后台默认访问：

- `http://127.0.0.1:6007/admin/`

### 4. 打开微信小程序

```text
微信开发者工具 → 导入项目 → 目录选择 wxapp/
```

小程序运行配置使用当前工程内的 `ts` 模块导出方式管理，按本地环境修改对应配置即可。

---

## 本地配置

你通常只需要关注这几类配置：

- 根目录 `.env.local`
- `backend/.env.local`
- `admin` 的 Vite 环境变量
- `wxapp` 小程序内的本地配置模块

推荐先看：

- [根目录环境变量模板](./.env.example)
- [后端环境变量模板](./backend/.env.example)
- [本地开发环境搭建](./docs/%E4%B8%8A%E6%89%8B%E6%8C%87%E5%8D%97/03-%E6%9C%AC%E5%9C%B0%E5%BC%80%E5%8F%91%E7%8E%AF%E5%A2%83%E6%90%AD%E5%BB%BA.md)

---

## 当前进度

第一阶段目标是核心交易闭环跑通。

- 已完成基础设施与后端骨架
- 已完成管理后台基础页面
- 已完成小程序首页、分类、营销、个人中心、登录等基础页面
- 正在收口商品详情、结算、订单、支付、售后、消息和后台运营能力

详细进度见：

- [开发任务计划](./docs/13-%E5%BC%80%E5%8F%91%E4%BB%BB%E5%8A%A1%E8%AE%A1%E5%88%92.md)
- [设计稿落地完整方案](./docs/19-%E8%AE%BE%E8%AE%A1%E7%A8%BF%E8%90%BD%E5%9C%B0%E5%AE%8C%E6%95%B4%E6%96%B9%E6%A1%88.md)
- [接口契约核对](./docs/15-%E5%89%8D%E5%90%8E%E7%AB%AF%E6%8E%A5%E5%8F%A3%E5%A5%91%E7%BA%A6%E6%A0%B8%E5%AF%B9.md)

---

## 后续规划

后续会继续完善：

- 搜索与推荐
- 消息中心已读/未读状态
- 营销活动专区
- 热销榜单与首页运营位
- 订单支付失败后的续付能力
- 后台运营配置与审核流程
- 交易链路回归与联调验收

---

## 相关文档

- [文档总览](./docs/README.md)
- [上手指南](./docs/%E4%B8%8A%E6%89%8B%E6%8C%87%E5%8D%97/README.md)
- [需求文档](./docs/01-%E9%9C%80%E6%B1%82-%E5%86%9C%E4%BB%93%E5%B9%B3%E5%8F%B0.md)
- [技术总方案](./docs/03-%E6%8A%80%E6%9C%AF-%E6%80%BB%E6%96%B9%E6%A1%88.md)
- [接口总览](./docs/02-%E6%8E%A5%E5%8F%A3-%E6%80%BB%E8%A7%88.md)

=======
# xunyuan
>>>>>>> 44945c45d9ca096b96b455466e7a7f27375a1158
