"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.merchantNavItems = exports.merchantHomeRoute = void 0;
exports.isMerchantRoute = isMerchantRoute;
const icons_1 = require("./icons");
exports.merchantHomeRoute = '/pages/merchant/dashboard/dashboard';
//商户端导航配置
exports.merchantNavItems = [
    { key: 'home', label: '首页', icon: icons_1.iconPaths.home, url: '/pages/merchant/dashboard/dashboard' },
    { key: 'chat', label: '聊天', icon: icons_1.iconPaths.message, url: '/pages/merchant/messages/messages' },
    { key: 'orders', label: '订单', icon: icons_1.iconPaths.invoice, url: '/pages/merchant/orders/orders' },
    { key: 'inventory', label: '库存', icon: icons_1.iconPaths.package, url: '/pages/merchant/products/products' },
    { key: 'account', label: '账号', icon: icons_1.iconPaths.profile, url: '/pages/merchant/shop/shop' },
];
function isMerchantRoute(route) {
    return route.startsWith('/pages/merchant/');
}
