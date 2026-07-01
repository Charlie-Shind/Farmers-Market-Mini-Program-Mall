"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isMerchantRoute = void 0;
exports.buildLoginUrl = buildLoginUrl;
exports.buildProfileLoginUrl = buildProfileLoginUrl;
exports.isProfileRoute = isProfileRoute;
exports.resolveSafeLoginBackPath = resolveSafeLoginBackPath;
exports.resolveRedirectPath = resolveRedirectPath;
exports.navigateAfterLogin = navigateAfterLogin;
exports.navigateBackOrHome = navigateBackOrHome;
exports.navigateBackOrMerchantHome = navigateBackOrMerchantHome;
exports.buildMerchantLoginUrl = buildMerchantLoginUrl;
exports.ensureMerchantAccess = ensureMerchantAccess;
exports.ensureCustomerAccess = ensureCustomerAccess;
exports.redirectMerchantAwayFromCustomerRoute = redirectMerchantAwayFromCustomerRoute;
const token_1 = require("../services/token");
const merchant_1 = require("../config/merchant");
const TAB_BAR_ROUTES = new Set([
    '/pages/index/index',
    '/pages/category/category',
    '/pages/marketing/marketing',
    '/pages/cart/cart',
    '/pages/profile/profile',
]);
const PROFILE_ROUTES = new Set([
    '/pages/profile/profile',
    '/pages/profile/home/home',
    '/pages/profile/edit/edit',
]);
const INDEX_ROUTE = '/pages/index/index';
const PROFILE_HOME_ROUTE = '/pages/profile/home/home';
function normalizeRoute(route) {
    const [path] = route.split('?');
    return path.startsWith('/') ? path : `/${path}`;
}
function buildLoginUrl(redirectPath = '/pages/profile/profile') {
    return `/pages/login/login?redirect=${encodeURIComponent(redirectPath)}`;
}
var merchant_2 = require("../config/merchant");
Object.defineProperty(exports, "isMerchantRoute", { enumerable: true, get: function () { return merchant_2.isMerchantRoute; } });
function buildProfileLoginUrl(redirectPath = PROFILE_HOME_ROUTE) {
    return buildLoginUrl(redirectPath);
}
function isProfileRoute(route) {
    return PROFILE_ROUTES.has(normalizeRoute(route));
}
function resolveSafeLoginBackPath(rawPath) {
    const resolved = resolveRedirectPath(rawPath, INDEX_ROUTE);
    if (isProfileRoute(resolved)) {
        return INDEX_ROUTE;
    }
    return resolved;
}
function resolveRedirectPath(rawPath, fallbackPath = '/pages/profile/profile') {
    if (!rawPath) {
        return fallbackPath;
    }
    try {
        const decoded = decodeURIComponent(rawPath).trim();
        if (!decoded) {
            return fallbackPath;
        }
        return decoded.startsWith('/') ? decoded : `/${decoded}`;
    }
    catch {
        return fallbackPath;
    }
}
function navigateAfterLogin(redirectPath, fallbackPath = '/pages/profile/profile', role) {
    const targetPath = resolveRedirectPath(redirectPath, fallbackPath);
    const currentRole = role || (0, token_1.getAuthUserRole)();
    const normalizedTarget = normalizeRoute(targetPath);
    if (currentRole === 'GUEST' && isProfileRoute(normalizedTarget)) {
        const guestFallback = normalizeRoute(resolveRedirectPath(fallbackPath, INDEX_ROUTE));
        wx.reLaunch({
            url: isProfileRoute(guestFallback) ? INDEX_ROUTE : guestFallback,
        });
        return;
    }
    if ((0, merchant_1.isMerchantRoute)(normalizedTarget) && currentRole !== 'MERCHANT') {
        wx.reLaunch({
            url: resolveRedirectPath(fallbackPath, INDEX_ROUTE),
        });
        return;
    }
    if (currentRole === 'MERCHANT' && !(0, merchant_1.isMerchantRoute)(normalizedTarget)) {
        wx.reLaunch({
            url: merchant_1.merchantHomeRoute,
        });
        return;
    }
    if (TAB_BAR_ROUTES.has(normalizedTarget)) {
        wx.reLaunch({
            url: normalizedTarget,
        });
        return;
    }
    wx.redirectTo({
        url: targetPath,
    });
}
function navigateBackOrHome(delta = 1) {
    const pages = getCurrentPages();
    if (pages.length > delta) {
        wx.navigateBack({
            delta,
        });
        return;
    }
    wx.reLaunch({
        url: INDEX_ROUTE,
    });
}
function navigateBackOrMerchantHome(delta = 1) {
    const pages = getCurrentPages();
    if (pages.length > delta) {
        wx.navigateBack({
            delta,
        });
        return;
    }
    wx.reLaunch({
        url: merchant_1.merchantHomeRoute,
    });
}
function buildMerchantLoginUrl(redirectPath = merchant_1.merchantHomeRoute) {
    return buildLoginUrl(redirectPath);
}
function ensureMerchantAccess(redirectPath = merchant_1.merchantHomeRoute) {
    if ((0, token_1.isMerchantSession)() || (0, token_1.getAuthUserRole)() === 'MERCHANT') {
        return true;
    }
    wx.redirectTo({
        url: buildMerchantLoginUrl(redirectPath),
    });
    return false;
}
function ensureCustomerAccess(redirectPath) {
    if ((0, token_1.isMerchantSession)()) {
        wx.reLaunch({
            url: merchant_1.merchantHomeRoute,
        });
        return false;
    }
    if (!(0, token_1.isAccessSession)()) {
        wx.navigateTo({
            url: buildLoginUrl(redirectPath),
        });
        return false;
    }
    return true;
}
function redirectMerchantAwayFromCustomerRoute(rawRoute) {
    var _a;
    const role = (0, token_1.getAuthUserRole)();
    if (role !== 'MERCHANT') {
        return false;
    }
    const pages = getCurrentPages();
    const currentRoute = rawRoute || ((_a = pages[pages.length - 1]) === null || _a === void 0 ? void 0 : _a.route) || '';
    const normalizedRoute = normalizeRoute(currentRoute);
    if ((0, merchant_1.isMerchantRoute)(normalizedRoute)) {
        return false;
    }
    wx.reLaunch({
        url: merchant_1.merchantHomeRoute,
    });
    return true;
}
