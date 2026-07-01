"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const node_crypto_1 = require("node:crypto");
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const prisma = new client_1.PrismaClient();
async function generateAccountNo(scope) {
    const dateKey = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const serial = await prisma.accountSerial.upsert({
        where: { scope_dateKey: { scope, dateKey } },
        create: { scope, dateKey, lastValue: 1 },
        update: { lastValue: { increment: 1 } },
    });
    return `AC${dateKey}${String(serial.lastValue).padStart(4, '0')}`;
}
async function ensureRole(code, name) {
    const existing = await prisma.role.findUnique({ where: { code } });
    if (!existing) {
        await prisma.role.create({ data: { code, name } });
    }
}
async function main() {
    console.log('🌱 农仓数据初始化中...');
    await ensureRole('GUEST', '游客');
    await ensureRole('USER', '普通用户');
    await ensureRole('MERCHANT', '商家/农户');
    await ensureRole('ADMIN', '管理员');
    console.log('✅ 角色已就绪');
    const adminCount = await prisma.adminUser.count();
    if (adminCount === 0) {
        const adminRole = await prisma.adminRole.upsert({
            where: { code: 'SUPER_ADMIN' },
            create: { code: 'SUPER_ADMIN', name: '超级管理员', permissionJson: { all: true }, status: 1 },
            update: {},
        });
        const admin = await prisma.adminUser.create({
            data: {
                username: 'admin',
                accountNo: await generateAccountNo('ADMIN'),
                passwordHash: '$2b$10$placeholder_hash_for_dev_only',
                nickname: '平台管理员',
                mobile: '13900000001',
                status: 1,
            },
        });
        await prisma.adminUserRole.create({
            data: { adminUserId: admin.id, adminRoleId: adminRole.id },
        });
        console.log('✅ 平台管理员已创建 (admin / 密码见环境变量)');
    }
    const userCount = await prisma.user.count({ where: { deletedAt: null } });
    if (userCount === 0) {
        const user1 = await prisma.user.create({
            data: {
                accountNo: await generateAccountNo('USER'),
                openid: 'seed_user_001',
                nickname: '陈女士',
                mobile: '13800008821',
                status: 1,
            },
        });
        const userRole = await prisma.role.findUnique({ where: { code: 'USER' } });
        if (userRole) {
            await prisma.userRole.create({ data: { userId: user1.id, roleId: userRole.id } });
        }
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
        const user2 = await prisma.user.create({
            data: {
                accountNo: await generateAccountNo('USER'),
                openid: 'seed_user_002',
                nickname: '李先生',
                mobile: '13900008822',
                status: 1,
            },
        });
        if (userRole) {
            await prisma.userRole.create({ data: { userId: user2.id, roleId: userRole.id } });
        }
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
        console.log('✅ 普通用户已创建 (13800008821 / 13900008822)');
    }
    const platformSetting = await prisma.systemSetting.upsert({
        where: { key: 'platformSupportMerchantId' },
        create: { key: 'platformSupportMerchantId', value: '' },
        update: {},
    });
    let platformMerchant = await prisma.merchant.findFirst({
        where: { storeName: '湾源农仓·平台自营' },
    });
    if (!platformMerchant) {
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
        await prisma.merchantWallet.create({
            data: {
                merchantId: normalMerchant.id,
                availableBalance: 800.00,
                frozenBalance: 120.00,
                totalIncome: 3200.00,
                totalWithdrawn: 2400.00,
            },
        });
        console.log('✅ 普通商家已创建 (13800009999)');
    }
    const categoryCount = await prisma.category.count();
    if (categoryCount === 0) {
        const parents = [
            { name: '时令果蔬', sortOrder: 1 },
            { name: '日用百货', sortOrder: 2 },
            { name: '粮油干货', sortOrder: 3 },
            { name: '特产礼盒', sortOrder: 4 },
        ];
        const parentMap = new Map();
        for (const p of parents) {
            const cat = await prisma.category.create({
                data: { name: p.name, sortOrder: p.sortOrder, status: 1 },
            });
            parentMap.set(p.name, cat.id);
        }
        const children = [
            { name: '调味品', parent: '粮油干货', sortOrder: 1 },
            { name: '米/面/粉/杂粮', parent: '粮油干货', sortOrder: 2 },
            { name: '南北干货', parent: '粮油干货', sortOrder: 3 },
            { name: '即食海参', parent: '特产礼盒', sortOrder: 1 },
            { name: '查干臻品', parent: '特产礼盒', sortOrder: 2 },
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
    const productCount = await prisma.product.count({ where: { deletedAt: null } });
    if (productCount === 0) {
        const jsonPath = (0, node_path_1.join)(process.cwd(), '../client_products.json');
        if ((0, node_fs_1.existsSync)(jsonPath)) {
            const products = JSON.parse((0, node_fs_1.readFileSync)(jsonPath, 'utf8'));
            for (const seed of products) {
                const category = seed.subCategoryName
                    ? await prisma.category.findFirst({ where: { name: seed.subCategoryName } })
                    : null;
                const cat = category || (await prisma.category.findFirst({ where: { name: seed.categoryName } })) || (await prisma.category.findFirst());
                if (!cat)
                    continue;
                const p = await prisma.product.create({
                    data: {
                        merchantId: platformMerchant.id,
                        categoryId: cat.id,
                        title: seed.title,
                        subtitle: seed.subtitle || null,
                        coverUrl: seed.coverUrl || null,
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
                        skuCode: `SKU${seed.price}${Date.now()}`,
                        price: seed.price || '0.00',
                        originalPrice: seed.originalPrice || null,
                        stock: seed.stock || 50,
                    },
                });
            }
            console.log(`✅ ${products.length} 件商品已创建`);
        }
    }
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
    const flashWindowCount = await prisma.flashSaleWindow.count();
    if (flashWindowCount === 0) {
        const now = new Date();
        const windowLabels = [
            { label: '10:00 限时秒杀', hour: 10 },
            { label: '14:00 限时秒杀', hour: 14 },
            { label: '20:00 限时秒杀', hour: 20 },
        ];
        let skipOffset = 0;
        for (const w of windowLabels) {
            const startAt = new Date(now);
            startAt.setHours(w.hour, 0, 0, 0);
            const endAt = new Date(startAt);
            endAt.setHours(startAt.getHours() + 2);
            if (endAt < now) {
                startAt.setTime(now.getTime() - 30 * 60 * 1000);
                endAt.setTime(now.getTime() + 90 * 60 * 1000);
            }
            const window = await prisma.flashSaleWindow.create({
                data: { label: w.label, startAt, endAt, sortOrder: w.hour / 2, status: 'UPCOMING' },
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
                if (!sku || Number(sku.price) <= 0)
                    continue;
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
        }
        console.log('✅ 秒杀场次已创建');
    }
    const groupBuyCount = await prisma.groupBuy.count();
    if (groupBuyCount === 0) {
        const products = await prisma.product.findMany({
            where: { status: 1, auditStatus: 2, deletedAt: null },
            include: { skus: { orderBy: { id: 'asc' } } },
            take: 4,
            orderBy: { id: 'asc' },
        });
        const firstUser = await prisma.user.findFirst({ where: { deletedAt: null } });
        if (firstUser) {
            for (const product of products) {
                const sku = product.skus[0];
                if (!sku || Number(sku.price) <= 0)
                    continue;
                const originPrice = Number(sku.price);
                await prisma.product.update({
                    where: { id: product.id },
                    data: { groupBuyConfig: { enabled: true, needed: 3, expireHours: 24, discountRate: 0.7 } },
                });
                await prisma.groupBuy.create({
                    data: {
                        groupNo: `GB${(0, node_crypto_1.randomUUID)().replace(/-/g, '').slice(0, 8)}`,
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
//# sourceMappingURL=seed.js.map