"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapCategoryToEntry = mapCategoryToEntry;
exports.buildFallbackCategories = buildFallbackCategories;
const CATEGORY_IMAGE_POOL = [
    '/assets/category/orange.jpg',
    '/assets/category/egg.jpg',
    '/assets/category/fruit-1.jpg',
    '/assets/category/fruit-2.jpg',
    '/assets/category/fruit-3.jpg',
    '/assets/category/fruit-4.jpg',
    '/assets/category/fruit-5.jpg',
    '/assets/category/fruit-6.jpg',
    '/assets/category/fruit-7.jpg',
    '/assets/category/fruit-8.jpg',
    '/assets/category/fruit-9.jpg',
    '/assets/category/fruit-10.jpg',
];
const FALLBACK_CATEGORY_DATA = [
    { name: '时令果蔬', children: ['橙子', '苹果', '葡萄', '猕猴桃', '蓝莓', '草莓', '番茄', '西蓝花'] },
    { name: '肉禽蛋奶', children: ['土鸡蛋', '鲜牛奶', '牛肉', '猪肉', '鸡肉', '鸭蛋', '羊肉', '鸽子蛋'] },
    { name: '粮油干货', children: ['大米', '面粉', '食用油', '杂粮', '红枣', '菌菇', '干货', '调味'] },
    { name: '特产礼盒', children: ['伴手礼', '企业礼盒', '节日礼盒', '土特产', '水果礼盒', '年货礼盒', '滋补礼盒', '组合装'] },
    { name: '有机认证', children: ['有机蔬菜', '有机水果', '有机粮油', '有机蛋奶', '认证基地', '无公害', '绿色认证', '可追溯'] },
    { name: '产地直供', children: ['源头直发', '基地直采', '当天采摘', '农户直供', '冷链直达', '合作社', '溯源查询', '产地专供'] },
    { name: '预售商品', children: ['预售水果', '预售礼盒', '锁鲜发货', '批次到货', '限时预订', '预约发货', '排期商品', '首发新品'] },
    { name: '同城配送', children: ['当日达', '次日达', '社区团购', '同城鲜配', '仓配到家', '极速送达', '同城专送', '门店自提'] },
];
function pickCategoryImage(index) {
    return CATEGORY_IMAGE_POOL[index % CATEGORY_IMAGE_POOL.length] || CATEGORY_IMAGE_POOL[0];
}
function mapCategoryChildren(children, parentIndex) {
    const sortedChildren = [...children].sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);
    if (sortedChildren.length === 0) {
        return [];
    }
    return sortedChildren.map((child, childIndex) => {
        var _a;
        return ({
            id: child.id,
            name: child.name,
            imageUrl: pickCategoryImage(parentIndex + childIndex + 1),
            sortOrder: (_a = child.sortOrder) !== null && _a !== void 0 ? _a : childIndex + 1,
        });
    });
}
function mapCategoryToEntry(item, index) {
    var _a;
    return {
        id: item.id,
        name: item.name,
        imageUrl: pickCategoryImage(index),
        sortOrder: (_a = item.sortOrder) !== null && _a !== void 0 ? _a : index + 1,
        children: mapCategoryChildren(item.children, index),
    };
}
function buildFallbackCategories() {
    return FALLBACK_CATEGORY_DATA.map((item, index) => ({
        id: index + 1,
        name: item.name,
        imageUrl: pickCategoryImage(index),
        sortOrder: index + 1,
        children: item.children.map((name, childIndex) => ({
            id: (index + 1) * 100 + childIndex + 1,
            name,
            imageUrl: pickCategoryImage(index + childIndex + 1),
            sortOrder: childIndex + 1,
        })),
    }));
}
