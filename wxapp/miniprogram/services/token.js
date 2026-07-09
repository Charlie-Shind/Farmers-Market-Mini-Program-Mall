"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setToken = setToken;
exports.setCurrentSub = setCurrentSub;
exports.getCurrentSub = getCurrentSub;
exports.clearCurrentSub = clearCurrentSub;
exports.setGuestMode = setGuestMode;
exports.getToken = getToken;
exports.getAuthTokenType = getAuthTokenType;
exports.removeToken = removeToken;
exports.setAvailableRoles = setAvailableRoles;
exports.getAvailableRoles = getAvailableRoles;
exports.setCurrentRole = setCurrentRole;
exports.getCurrentRole = getCurrentRole;
exports.hasToken = hasToken;
exports.isAccessSession = isAccessSession;
exports.isGuestSession = isGuestSession;
exports.getAuthUserRole = getAuthUserRole;
exports.isMerchantSession = isMerchantSession;
const TOKEN_KEY = 'farm_access_token';
const TOKEN_TYPE_KEY = 'farm_access_token_type';
const USER_ROLE_KEY = 'farm_user_role';
const USER_ROLES_KEY = 'farm_user_roles';
const CURRENT_SUB_KEY = 'farm_current_sub';
function updateAppToken(token, tokenType, userRole) {
    try {
        const app = getApp();
        app.globalData.accessToken = token;
        app.globalData.accessTokenType = tokenType || '';
        app.globalData.userRole = userRole || '';
    }
    catch (error) {
        // App not ready yet.
    }
}
function setToken(token, tokenType = 'access', userRole = '') {
    wx.setStorageSync(TOKEN_KEY, token);
    wx.setStorageSync(TOKEN_TYPE_KEY, tokenType);
    if (userRole) {
        wx.setStorageSync(USER_ROLE_KEY, userRole);
    }
    updateAppToken(token, tokenType, userRole);
}
function setCurrentSub(sub) {
    if (sub) {
        wx.setStorageSync(CURRENT_SUB_KEY, sub);
    }
    else {
        wx.removeStorageSync(CURRENT_SUB_KEY);
    }
}
function getCurrentSub() {
    return wx.getStorageSync(CURRENT_SUB_KEY) || '';
}
function clearCurrentSub() {
    wx.removeStorageSync(CURRENT_SUB_KEY);
}
function setGuestMode() {
    wx.removeStorageSync(TOKEN_KEY);
    wx.setStorageSync(TOKEN_TYPE_KEY, 'guest');
    wx.setStorageSync(USER_ROLE_KEY, 'GUEST');
    wx.removeStorageSync(CURRENT_SUB_KEY);
    updateAppToken(undefined, 'guest', 'GUEST');
}
function getToken() {
    return wx.getStorageSync(TOKEN_KEY) || '';
}
function getAuthTokenType() {
    const tokenType = wx.getStorageSync(TOKEN_TYPE_KEY);
    if (tokenType === 'access' || tokenType === 'guest') {
        return tokenType;
    }
    return getToken() ? 'access' : '';
}
function removeToken() {
    wx.removeStorageSync(TOKEN_KEY);
    wx.removeStorageSync(TOKEN_TYPE_KEY);
    wx.removeStorageSync(USER_ROLE_KEY);
    wx.removeStorageSync(USER_ROLES_KEY);
    wx.removeStorageSync(CURRENT_SUB_KEY);
    updateAppToken(undefined, undefined, undefined);
}
function setAvailableRoles(roles) {
    wx.setStorageSync(USER_ROLES_KEY, (roles || []).filter(Boolean));
}
function getAvailableRoles() {
    const roles = wx.getStorageSync(USER_ROLES_KEY);
    if (Array.isArray(roles)) {
        return roles.filter((r) => ['GUEST', 'USER', 'MERCHANT', 'ADMIN', 'LEADER'].includes(r));
    }
    return [];
}
function setCurrentRole(role) {
    if (role) {
        wx.setStorageSync(USER_ROLE_KEY, role);
    }
}
function getCurrentRole() {
    return getAuthUserRole();
}
function hasToken() {
    return Boolean(getToken());
}
function isAccessSession() {
    return getAuthTokenType() === 'access';
}
function isGuestSession() {
    return getAuthTokenType() === 'guest';
}
function getAuthUserRole() {
    const userRole = wx.getStorageSync(USER_ROLE_KEY);
    if (userRole === 'GUEST' || userRole === 'USER' || userRole === 'MERCHANT' || userRole === 'ADMIN' || userRole === 'LEADER') {
        return userRole;
    }
    if (isGuestSession()) {
        return 'GUEST';
    }
    return '';
}
function isMerchantSession() {
    return getAuthUserRole() === 'MERCHANT';
}
