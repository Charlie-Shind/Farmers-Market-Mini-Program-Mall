/**
 * Prisma seed — 一键生成农仓演示数据
 *
 * 用法：npx prisma db seed
 *
 * 生成内容：
 *   - 4 个角色 (GUEST, USER, MERCHANT, ADMIN)
 *   - 平台管理员账号
 *   - 平台官方商家 + 钱包
 *   - 普通商家 + 钱包
 *   - 2 个普通用户 + 收货地址
 *   - 4 个一级分类 + 子分类
 *   - 商品 + SKU + 库存 (来自 client_products.json)
 *   - Banner
 *   - 公告
 *   - 优惠券
 *   - 秒杀场次 + 秒杀商品
 *   - 拼团商品
 */

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { createHash, randomUUID } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

function loadLocalEnv() {
  const envPath = join(process.cwd(), '.env.local');
  if (!existsSync(envPath)) {
    return;
  }
  const content = readFileSync(envPath, 'utf8');
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const equalIndex = line.indexOf('=');
    if (equalIndex <= 0) continue;
    const key = line.slice(0, equalIndex).trim();
    const value = line.slice(equalIndex + 1).trim();
    if (key && process.env[key] == null) {
      process.env[key] = value;
    }
  }
}

loadLocalEnv();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is required');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg(connectionString),
});

function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex');
}

function buildPromotionWindow(baseTime = new Date()) {
  return {
    promotionStartAt: new Date(baseTime.getTime() - 24 * 60 * 60 * 1000),
    promotionEndAt: new Date(baseTime.getTime() + 7 * 24 * 60 * 60 * 1000),
  };
}

type SeedProductInput = {
  title: string;
  subtitle?: string;
  detailDesc?: string;
  categoryName: string;
  subCategoryName?: string;
  originPlace?: string;
  coverUrl?: string;
  skuName?: string;
  price: string | number;
  originalPrice?: string | number | null;
  stock?: number;
  merchantType?: 'platform' | 'normal';
  promotionPrice?: string | number | null;
};

async function generateAccountNo(scope: string): Promise<string> {
  const dateKey = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const serial = await prisma.accountSerial.upsert({
    where: { scope_dateKey: { scope, dateKey } },
    create: { scope, dateKey, lastValue: 1 },
    update: { lastValue: { increment: 1 } },
  });
  return `AC${dateKey}${String(serial.lastValue).padStart(4, '0')}`;
}

async function ensureRole(code: string, name: string) {
  const existing = await prisma.role.findUnique({ where: { code } });
  if (!existing) {
    await prisma.role.create({ data: { code, name } });
  }
}

async function ensureUserRole(userId: bigint, roleCode: string) {
  const role = await prisma.role.findUnique({ where: { code: roleCode } });
  if (!role) return;
  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId,
        roleId: role.id,
      },
    },
    create: {
      userId,
      roleId: role.id,
    },
    update: {},
  });
}

async function main() {
  console.log('🌱 农仓数据初始化中...');

  // 1. 角色
  await ensureRole('GUEST', '游客');
  await ensureRole('USER', '普通用户');
  await ensureRole('MERCHANT', '商家/农户');
  await ensureRole('ADMIN', '管理员');
  console.log('✅ 角色已就绪');

  // 2. 平台管理员
  const adminRole = await prisma.adminRole.upsert({
    where: { code: 'SUPER_ADMIN' },
    create: { code: 'SUPER_ADMIN', name: '超级管理员', permissionJson: { all: true }, status: 1 },
    update: { permissionJson: { all: true }, status: 1 },
  });
  const admin = await prisma.adminUser.upsert({
    where: { username: 'admin' },
    create: {
      username: 'admin',
      accountNo: await generateAccountNo('ADMIN'),
      passwordHash: hashPassword('admin123456'),
      nickname: '平台管理员',
      mobile: '13900000001',
      status: 1,
    },
    update: {
      passwordHash: hashPassword('admin123456'),
      nickname: '平台管理员',
      mobile: '13900000001',
      status: 1,
    },
  });
  await prisma.adminUserRole.upsert({
    where: {
      adminUserId_adminRoleId: {
        adminUserId: admin.id,
        adminRoleId: adminRole.id,
      },
    },
    create: { adminUserId: admin.id, adminRoleId: adminRole.id },
    update: {},
  });
  console.log('✅ 平台管理员已就绪 (admin / admin123456)');

  // 3. 普通用户
  const user1 = await prisma.user.upsert({
    where: { openid: 'seed_user_001' },
    create: {
      accountNo: await generateAccountNo('USER'),
      openid: 'seed_user_001',
      nickname: '陈女士',
      mobile: '13800008821',
      status: 1,
    },
    update: {
      nickname: '陈女士',
      mobile: '13800008821',
      status: 1,
      deletedAt: null,
    },
  });
  await ensureUserRole(user1.id, 'USER');
  const user1Address = await prisma.userAddress.findFirst({
    where: { userId: user1.id, deletedAt: null },
    orderBy: [{ isDefault: 'desc' }, { id: 'asc' }],
  });
  if (!user1Address) {
    await prisma.userAddress.create({
      data: {
        userId: user1.id,
        receiverName: '陈女士',
        receiverMobile: '13800008821',
        province: '广东',
        city: '深圳',
        district: '南山',
        detailAddress: '科技园路 168 号阳光花园 3 栋 502',
        isDefault: true,
      },
    });
  }

  const user2 = await prisma.user.upsert({
    where: { openid: 'seed_user_002' },
    create: {
      accountNo: await generateAccountNo('USER'),
      openid: 'seed_user_002',
      nickname: '李先生',
      mobile: '13900008822',
      status: 1,
    },
    update: {
      nickname: '李先生',
      mobile: '13900008822',
      status: 1,
      deletedAt: null,
    },
  });
  await ensureUserRole(user2.id, 'USER');
  const user2Address = await prisma.userAddress.findFirst({
    where: { userId: user2.id, deletedAt: null },
    orderBy: [{ isDefault: 'desc' }, { id: 'asc' }],
  });
  if (!user2Address) {
    await prisma.userAddress.create({
      data: {
        userId: user2.id,
        receiverName: '李先生',
        receiverMobile: '13900008822',
        province: '北京',
        city: '北京',
        district: '朝阳',
        detailAddress: '望京街 10 号院 1 号楼 1802',
        isDefault: true,
      },
    });
  }
  console.log('✅ 普通用户已就绪 (seed_user_001 / seed_user_002)');

  // 4. 平台官方商家
  await prisma.systemSetting.upsert({
    where: { key: 'platformSupportMerchantId' },
    create: { key: 'platformSupportMerchantId', value: '' },
    update: {},
  });

  let platformMerchant = await prisma.merchant.findFirst({
    where: { storeName: '湾源农仓·平台自营' },
  });
  if (!platformMerchant) {
    // 需要一个平台商家用户
    let platformUser = await prisma.user.findUnique({ where: { openid: 'seed_platform_merchant_user' } });
    if (!platformUser) {
      platformUser = await prisma.user.create({
        data: {
          accountNo: await generateAccountNo('USER'),
          openid: 'seed_platform_merchant_user',
          nickname: '平台官方客服',
          mobile: '13900000000',
          status: 1,
        },
      });
      const merchantRole = await prisma.role.findUnique({ where: { code: 'MERCHANT' } });
      if (merchantRole) {
        await prisma.userRole.create({ data: { userId: platformUser.id, roleId: merchantRole.id } });
      }
    }
    platformMerchant = await prisma.merchant.create({
      data: {
        userId: platformUser.id,
        storeName: '湾源农仓·平台自营',
        storeLogo: '',
        contactName: '平台客服',
        contactMobile: '13900000000',
        status: 1,
        settledAt: new Date(),
      },
    });
    await prisma.systemSetting.upsert({
      where: { key: 'platformSupportMerchantId' },
      create: { key: 'platformSupportMerchantId', value: String(platformMerchant.id) },
      update: { value: String(platformMerchant.id) },
    });
    console.log('✅ 平台官方商家已创建');
  }

  // 平台商家钱包
  await prisma.merchantWallet.upsert({
    where: { merchantId: platformMerchant.id },
    create: {
      merchantId: platformMerchant.id,
      availableBalance: 1832.50,
      frozenBalance: 500.00,
      totalIncome: 6200.00,
      totalWithdrawn: 4367.50,
    },
    update: {},
  });

  await prisma.systemSetting.upsert({
    where: { key: 'platformSupportMerchantId' },
    create: { key: 'platformSupportMerchantId', value: String(platformMerchant.id) },
    update: { value: String(platformMerchant.id) },
  });

  // 5. 普通商家
  let normalMerchant = await prisma.merchant.findFirst({
    where: { storeName: '绿野鲜踪·农户直供' },
  });
  if (!normalMerchant) {
    let merchantUser = await prisma.user.findUnique({ where: { openid: 'seed_normal_merchant_user' } });
    if (!merchantUser) {
      merchantUser = await prisma.user.create({
        data: {
          accountNo: await generateAccountNo('USER'),
          openid: 'seed_normal_merchant_user',
          nickname: '张农户',
          mobile: '13800009999',
          status: 1,
        },
      });
      const merchantRole = await prisma.role.findUnique({ where: { code: 'MERCHANT' } });
      if (merchantRole) {
        await prisma.userRole.create({ data: { userId: merchantUser.id, roleId: merchantRole.id } });
      }
    }
    normalMerchant = await prisma.merchant.create({
      data: {
        userId: merchantUser.id,
        storeName: '绿野鲜踪·农户直供',
        storeLogo: '',
        contactName: '张农户',
        contactMobile: '13800009999',
        status: 1,
        settledAt: new Date(),
      },
    });
    console.log('✅ 普通商家已创建 (13800009999)');
  }
  await prisma.merchantWallet.upsert({
    where: { merchantId: normalMerchant.id },
    create: {
      merchantId: normalMerchant.id,
      availableBalance: 800.00,
      frozenBalance: 120.00,
      totalIncome: 3200.00,
      totalWithdrawn: 2400.00,
    },
    update: {},
  });

  // 6. 分类 - 从后端现有 seed 创建
  const categoryCount = await prisma.category.count();
  if (categoryCount === 0) {
    const parents = [
      { name: '水果', sortOrder: 1 },
      { name: '蔬菜', sortOrder: 2 },
      { name: '粮油', sortOrder: 3 },
      { name: '肉禽', sortOrder: 4 },
      { name: '加工品', sortOrder: 5 },
      { name: '日用百货', sortOrder: 6 },
    ];
    const parentMap = new Map<string, bigint>();
    for (const p of parents) {
      const cat = await prisma.category.create({
        data: { name: p.name, sortOrder: p.sortOrder, status: 1 },
      });
      parentMap.set(p.name, cat.id);
    }
    const children = [
      { name: '柑橘类', parent: '水果', sortOrder: 1 },
      { name: '浆果类', parent: '水果', sortOrder: 2 },
      { name: '叶菜类', parent: '蔬菜', sortOrder: 1 },
      { name: '根茎类', parent: '蔬菜', sortOrder: 2 },
      { name: '米/面/杂粮', parent: '粮油', sortOrder: 1 },
      { name: '调味品', parent: '粮油', sortOrder: 2 },
      { name: '南北干货', parent: '粮油', sortOrder: 3 },
      { name: '鲜肉', parent: '肉禽', sortOrder: 1 },
      { name: '禽蛋', parent: '肉禽', sortOrder: 2 },
      { name: '腌制/发酵品', parent: '加工品', sortOrder: 1 },
      { name: '礼盒装', parent: '加工品', sortOrder: 2 },
    ];
    for (const c of children) {
      const parentId = parentMap.get(c.parent);
      if (parentId) {
        await prisma.category.create({
          data: { name: c.name, parentId, sortOrder: c.sortOrder, status: 1 },
        });
      }
    }
    console.log('✅ 商品分类已创建');
  }

  // 7. 商品 - 从 client_products.json 导入，归属平台商家
  const productCount = await prisma.product.count({ where: { deletedAt: null } });
  if (productCount === 0) {
    const jsonPath = join(process.cwd(), '../client_products.json');
    const fallbackProducts: SeedProductInput[] = [
      {
        title: '云南高山蓝莓',
        subtitle: '鲜果直发，颗颗饱满',
        detailDesc: '蓝莓果粒新鲜饱满，适合鲜食与酸奶搭配。',
        categoryName: '水果',
        originPlace: '云南澄江',
        skuName: '125g/盒',
        price: '29.90',
        originalPrice: '36.90',
        stock: 160,
        merchantType: 'platform',
        promotionPrice: '24.90',
      },
      {
        title: '赣南脐橙',
        subtitle: '产地直发，果香浓郁',
        detailDesc: '江西赣州核心产区直采，皮薄汁多。',
        categoryName: '水果',
        subCategoryName: '柑橘类',
        originPlace: '江西赣州',
        skuName: '2.5kg/箱',
        price: '39.90',
        originalPrice: '49.90',
        stock: 200,
        merchantType: 'platform',
      },
      {
        title: '东北有机黄瓜',
        subtitle: '脆嫩多汁，冷链到家',
        detailDesc: '大棚现摘黄瓜，适合凉拌与生食。',
        categoryName: '蔬菜',
        originPlace: '吉林松原',
        skuName: '2kg/箱',
        price: '18.80',
        originalPrice: '22.80',
        stock: 120,
        merchantType: 'normal',
      },
      {
        title: '山东寿光番茄',
        subtitle: '沙瓤饱满，儿时味道',
        detailDesc: '自然成熟的粉红番茄，适合生吃和炒菜。',
        categoryName: '蔬菜',
        subCategoryName: '叶菜类',
        originPlace: '山东寿光',
        skuName: '1.5kg/箱',
        price: '22.00',
        originalPrice: '28.00',
        stock: 150,
        merchantType: 'platform',
      },
      {
        title: '查干湖有机大米',
        subtitle: '新米上市，米香浓郁',
        detailDesc: '颗粒均匀，适合家庭日常蒸煮。',
        categoryName: '粮油',
        subCategoryName: '米/面/杂粮',
        originPlace: '吉林查干湖',
        skuName: '5kg/袋',
        price: '59.90',
        originalPrice: '69.90',
        stock: 96,
        merchantType: 'platform',
      },
      {
        title: '农户手作香菇酱',
        subtitle: '拌饭拌面都香',
        detailDesc: '普通商家自产调味酱，适合佐餐。',
        categoryName: '粮油',
        subCategoryName: '调味品',
        originPlace: '湖北随州',
        skuName: '230g/瓶',
        price: '15.90',
        originalPrice: '19.90',
        stock: 88,
        merchantType: 'normal',
        promotionPrice: '12.90',
      },
      {
        title: '汉中古法菜籽油',
        subtitle: '土榨工艺，醇香浓郁',
        detailDesc: '非转基因油菜籽，物理压榨。',
        categoryName: '粮油',
        originPlace: '陕西汉中',
        skuName: '1.8L/桶',
        price: '68.00',
        originalPrice: '78.00',
        stock: 60,
        merchantType: 'normal',
      },
      {
        title: '科尔沁草原牛肉',
        subtitle: '散养草饲，鲜嫩多汁',
        detailDesc: '内蒙古科尔沁草原放养，冷链直发。',
        categoryName: '肉禽',
        subCategoryName: '鲜肉',
        originPlace: '内蒙古通辽',
        skuName: '500g/袋',
        price: '89.00',
        originalPrice: '108.00',
        stock: 45,
        merchantType: 'platform',
        promotionPrice: '79.00',
      },
      {
        title: '土鸡蛋礼篮',
        subtitle: '散养土鸡蛋，蛋黄浓香',
        detailDesc: '林间散养，谷物喂养，新鲜直达。',
        categoryName: '肉禽',
        subCategoryName: '禽蛋',
        originPlace: '河北保定',
        skuName: '30枚装',
        price: '45.00',
        originalPrice: '55.00',
        stock: 80,
        merchantType: 'normal',
      },
      {
        title: '金华火腿切片',
        subtitle: '传统腌制，鲜香入味',
        detailDesc: '精选猪后腿，经冬腌夏晒而成。',
        categoryName: '加工品',
        subCategoryName: '腌制/发酵品',
        originPlace: '浙江金华',
        skuName: '200g/袋',
        price: '98.00',
        originalPrice: '118.00',
        stock: 35,
        merchantType: 'platform',
        promotionPrice: '88.00',
      },
      {
        title: '即食海参礼盒',
        subtitle: '送礼自用两相宜',
        detailDesc: '独立包装，即开即食。',
        categoryName: '加工品',
        subCategoryName: '礼盒装',
        originPlace: '大连',
        skuName: '6只装',
        price: '199.00',
        originalPrice: '239.00',
        stock: 42,
        merchantType: 'platform',
      },
      {
        title: '山野菌菇干货包',
        subtitle: '煲汤炒菜皆宜',
        detailDesc: '多种菌菇搭配，香气足。',
        categoryName: '粮油',
        subCategoryName: '南北干货',
        originPlace: '云南楚雄',
        skuName: '500g/袋',
        price: '46.00',
        originalPrice: '56.00',
        stock: 70,
        merchantType: 'normal',
      },
    ];
    const importedProducts: SeedProductInput[] = existsSync(jsonPath)
      ? JSON.parse(readFileSync(jsonPath, 'utf8'))
      : [];
    const products = importedProducts.length > 0 ? importedProducts : fallbackProducts;
    const promotionWindow = buildPromotionWindow();

    for (const [index, seed] of products.entries()) {
        const category = seed.subCategoryName
          ? await prisma.category.findFirst({ where: { name: seed.subCategoryName } })
          : null;
        const cat = category || (await prisma.category.findFirst({ where: { name: seed.categoryName } })) || (await prisma.category.findFirst());
        if (!cat) continue;
        const merchantId = seed.merchantType === 'normal' || index % 3 === 1 ? normalMerchant.id : platformMerchant.id;
        const promotionEnabled = seed.promotionPrice != null || index === 0 || index === 3;
        const priceText = String(seed.price ?? '0.00');
        const originalPriceText = seed.originalPrice != null ? String(seed.originalPrice) : null;
        const promotionPriceText = seed.promotionPrice != null
          ? String(seed.promotionPrice)
          : (promotionEnabled ? (Number(priceText) * 0.85).toFixed(2) : null);

        const p = await prisma.product.create({
          data: {
            merchantId,
            categoryId: cat.id,
            title: seed.title,
            subtitle: seed.subtitle || null,
            coverUrl: seed.coverUrl || '/assets/banner.jpg',
            detailDesc: seed.detailDesc || null,
            originPlace: seed.originPlace || '产地直供',
            status: 1,
            auditStatus: 2,
          },
        });
        await prisma.productSku.create({
          data: {
            productId: p.id,
            skuName: seed.skuName || '默认规格',
            skuCode: `SKU${String(index + 1).padStart(4, '0')}${Date.now()}`,
            price: priceText,
            originalPrice: originalPriceText,
            stock: seed.stock || 50,
            promotionPrice: promotionPriceText,
            promotionStartAt: promotionEnabled ? promotionWindow.promotionStartAt : null,
            promotionEndAt: promotionEnabled ? promotionWindow.promotionEndAt : null,
          },
        });
      }
      console.log(`✅ ${products.length} 件商品已创建`);
  }

  // 8. Banner
  const bannerCount = await prisma.banner.count();
  if (bannerCount === 0) {
    await prisma.banner.createMany({
      data: [
        { title: '时令果蔬尝鲜', imageUrl: '/assets/banner.jpg', linkType: 'category', linkId: 1, sortOrder: 1, status: 'ENABLED' },
        { title: '新农人秒杀', imageUrl: '/assets/banner.jpg', linkType: 'flashSale', linkId: 1, sortOrder: 2, status: 'ENABLED' },
      ],
    });
    console.log('✅ Banner 已创建');
  }

  // 9. 公告
  const msgCount = await prisma.systemMessage.count();
  if (msgCount === 0) {
    await prisma.systemMessage.create({
      data: {
        type: 'ANNOUNCE',
        title: '湾源农仓平台上线通知',
        summary: '欢迎来到湾源农仓，产地直供，新鲜到家。',
        contentType: 'JSON',
        contentJson: { body: '湾源农仓平台正式上线运营，所有商品均为产地直供，支持冷链配送。' },
        senderType: 'SYSTEM',
        bizType: 'SYSTEM',
        publishAt: new Date(),
        status: 'PUBLISHED',
      },
    });
    console.log('✅ 系统公告已创建');
  }

  // 10. 优惠券
  const couponCount = await prisma.coupon.count();
  if (couponCount === 0) {
    await prisma.coupon.createMany({
      data: [
        {
          name: '新人满50减10',
          type: 'NEW_USER',
          thresholdAmount: 50,
          discountAmount: 10,
          stock: 999,
          issuedStock: 0,
          perUserLimit: 1,
          scope: 'ALL',
          status: 'ENABLED',
        },
        {
          name: '满200减30',
          type: 'CASHBACK',
          thresholdAmount: 200,
          discountAmount: 30,
          stock: 500,
          issuedStock: 0,
          perUserLimit: 1,
          scope: 'ALL',
          status: 'ENABLED',
        },
      ],
    });
    console.log('✅ 优惠券已创建');
  }

  // 11. 秒杀场次 + 秒杀商品
  const flashWindowCount = await prisma.flashSaleWindow.count();
  if (flashWindowCount === 0) {
    const now = new Date();
    // 滚动生成：从当前整点 - 30min 开始，每 2h 一场，到次日 06:00 截止
    const firstStart = new Date(now);
    firstStart.setMinutes(0, 0, 0);
    firstStart.setMinutes(firstStart.getMinutes() - 30);
    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() + 1);
    cutoff.setHours(6, 0, 0, 0);

    let skipOffset = 0;
    let sortOrder = 1;
    let cursor = new Date(firstStart);
    while (cursor < cutoff) {
      const startAt = new Date(cursor);
      const endAt = new Date(cursor);
      endAt.setHours(endAt.getHours() + 2);
      const hh = String(startAt.getHours()).padStart(2, '0');

      const window = await prisma.flashSaleWindow.create({
        data: {
          label: `${hh}:00 限时秒杀`,
          startAt,
          endAt,
          sortOrder: sortOrder++,
          status: 'UPCOMING',
        },
      });

      const candidates = await prisma.product.findMany({
        where: { status: 1, auditStatus: 2, deletedAt: null },
        include: { skus: { orderBy: { id: 'asc' } } },
        take: 4,
        skip: skipOffset,
        orderBy: { id: 'asc' },
      });
      skipOffset += 4;

      for (const product of candidates) {
        const sku = product.skus[0];
        if (!sku || Number(sku.price) <= 0) continue;
        const originPrice = Number(sku.price);
        const totalStock = Math.min(sku.stock || 50, 100);
        await prisma.flashSaleItem.create({
          data: {
            windowId: window.id,
            productId: product.id,
            skuId: sku.id,
            flashPrice: (originPrice * 0.6).toFixed(2),
            originPrice: originPrice.toFixed(2),
            totalStock,
            stockLeft: totalStock,
            perUserLimit: 2,
          },
        });
      }

      cursor = endAt;
    }
    console.log('✅ 秒杀场次已创建');
  }

  // 12. 拼团商品
  const groupBuyCount = await prisma.groupBuy.count();
  if (groupBuyCount === 0) {
    const products = await prisma.product.findMany({
      where: { status: 1, auditStatus: 2, deletedAt: null },
      include: { skus: { orderBy: { id: 'asc' } } },
      take: 4,
      orderBy: { id: 'asc' },
    });

    // 需要拼团发起人
    const firstUser = await prisma.user.findFirst({ where: { deletedAt: null } });
    if (firstUser) {
      for (const product of products) {
        const sku = product.skus[0];
        if (!sku || Number(sku.price) <= 0) continue;
        const originPrice = Number(sku.price);
        await prisma.product.update({
          where: { id: product.id },
          data: { groupBuyConfig: { enabled: true, needed: 3, expireHours: 24, discountRate: 0.7 } },
        });
        await prisma.groupBuy.create({
          data: {
            groupNo: `GB${randomUUID().replace(/-/g, '').slice(0, 8)}`,
            inviteCode: Math.random().toString(36).slice(2, 8).toUpperCase(),
            productId: product.id,
            skuId: sku.id,
            initiatorId: firstUser.id,
            groupPrice: (originPrice * 0.7).toFixed(2),
            originPrice: originPrice.toFixed(2),
            needed: 3,
            status: 'OPEN',
            expireAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          },
        });
      }
    }
    console.log('✅ 拼团商品已创建');
  }

  console.log('🎉 数据初始化完毕！');
  console.log('---');
  console.log('平台管理员: admin');
  console.log('平台商家: 湾源农仓·平台自营 (13900000000)');
  console.log('普通商家: 绿野鲜踪·农户直供 (13800009999)');
  console.log('普通用户: 陈女士 (13800008821) / 李先生 (13900008822)');
}

main()
  .catch((e) => {
    console.error('Seed 失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
