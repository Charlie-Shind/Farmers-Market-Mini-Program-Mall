"use strict";
// shared/icons — 统一图标注册表（单源）
// 协议：Tabler Icons MIT (https://github.com/tabler/tabler-icons)
// 详细协议声明见项目根 THIRD-PARTY-LICENSES.md
Object.defineProperty(exports, "__esModule", { value: true });
exports.allIcons = exports.iconCategories = exports.allIconNames = void 0;
exports.getIconSvg = getIconSvg;
exports.getIconPath = getIconPath;
exports.setIconUsageEnabled = setIconUsageEnabled;
exports.recordIconUsage = recordIconUsage;
exports.getIconUsage = getIconUsage;
exports.dumpIconUsage = dumpIconUsage;
exports.clearIconUsage = clearIconUsage;
const navigation_1 = require("./registry/navigation");
const action_1 = require("./registry/action");
const status_1 = require("./registry/status");
const business_1 = require("./registry/business");
const category_1 = require("./registry/category");
const order_1 = require("./registry/order");
const allIcons = {
    ...navigation_1.navigationIcons,
    ...action_1.actionIcons,
    ...status_1.statusIcons,
    ...business_1.businessIcons,
    ...category_1.categoryIcons,
    ...order_1.orderIcons,
};
exports.allIcons = allIcons;
// 完整 <svg> 字符串（24x24 viewBox / currentColor 描边）
function getIconSvg(name) {
    const body = allIcons[name];
    if (!body) {
        return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"></svg>';
    }
    return [
        '<svg xmlns="http://www.w3.org/2000/svg"',
        ' viewBox="0 0 24 24"',
        ' fill="none"',
        ' stroke="currentColor"',
        ' stroke-width="2"',
        ' stroke-linecap="round"',
        ' stroke-linejoin="round">',
        body,
        '</svg>',
    ].join('');
}
// 仅 SVG 内部 body（不含 <svg> 标签），用于 <image> 标签或自定义包装
function getIconPath(name) {
    return allIcons[name] || '';
}
// 所有图标 key 列表（用于生成图标库文档）
exports.allIconNames = Object.keys(allIcons);
// 分类下标（用于组件库展示）
exports.iconCategories = {
    navigation: Object.keys(navigation_1.navigationIcons),
    action: Object.keys(action_1.actionIcons),
    status: Object.keys(status_1.statusIcons),
    business: Object.keys(business_1.businessIcons),
    category: Object.keys(category_1.categoryIcons),
    order: Object.keys(order_1.orderIcons),
};
let usageEnabled = true;
const usageStore = {};
function setIconUsageEnabled(enabled) {
    usageEnabled = enabled;
}
function recordIconUsage(name) {
    if (!usageEnabled) {
        return;
    }
    usageStore[name] = (usageStore[name] || 0) + 1;
}
function getIconUsage() {
    return { ...usageStore };
}
function dumpIconUsage() {
    return Object.entries(usageStore)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);
}
function clearIconUsage() {
    for (const key of Object.keys(usageStore)) {
        delete usageStore[key];
    }
}
