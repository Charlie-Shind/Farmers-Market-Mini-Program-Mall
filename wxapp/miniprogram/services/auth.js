"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.refreshSessionToken = void 0;
exports.fetchAuthStatus = fetchAuthStatus;
exports.fetchAnonymousSession = fetchAnonymousSession;
exports.fetchCurrentUser = fetchCurrentUser;
exports.loginWithWechatCode = loginWithWechatCode;
exports.bindWechatPhone = bindWechatPhone;
exports.loginWithWechatPhone = loginWithWechatPhone;
exports.loginWithWechatSms = loginWithWechatSms;
exports.refreshToken = refreshToken;
exports.switchRole = switchRole;
exports.clearUserLocalState = clearUserLocalState;
const request_1 = require("./request");
const token_1 = require("./token");
const app_1 = require("./app");
const profile_1 = require("./profile");
function fetchAuthStatus() {
    return (0, request_1.get)('/identity/auth/status', undefined, {
        auth: false,
    });
}
function fetchAnonymousSession() {
    return (0, request_1.get)('/identity/auth/anonymous', undefined, {
        auth: false,
    }).then((session) => {
        if (session && session.accessToken && !(0, token_1.getToken)()) {
            applySession(session);
        }
        return session;
    });
}
function fetchCurrentUser() {
    return (0, request_1.get)('/identity/auth/me');
}
function loginWithWechatCode(payload) {
    return (0, request_1.post)('/identity/auth/wechat/login', payload, {
        auth: false,
    }).then((session) => {
        if (session && session.accessToken) {
            applySession(session);
        }
        return session;
    });
}
function bindWechatPhone(payload) {
    return (0, request_1.post)('/identity/auth/wechat/phone-bind', payload, {
        auth: false,
    }).then((session) => {
        if (session && session.accessToken) {
            applySession(session);
        }
        return session;
    });
}
function loginWithWechatPhone(payload) {
    return (0, request_1.post)('/identity/auth/wechat/phone-login', payload, {
        auth: false,
    }).then((session) => {
        if (session && session.accessToken) {
            applySession(session);
        }
        return session;
    });
}
function loginWithWechatSms(payload) {
    return (0, request_1.post)('/identity/auth/wechat/sms-login', payload, {
        auth: false,
    }).then((session) => {
        if (session && session.accessToken) {
            applySession(session);
        }
        return session;
    });
}
function refreshToken() {
    return (0, request_1.post)('/identity/auth/refresh', {}).then((session) => {
        if (session && session.accessToken) {
            applySession(session);
        }
        return session;
    });
}
function switchRole(role) {
    return (0, request_1.post)('/identity/auth/switch-role', { role }, {
        auth: true,
    }).then((session) => {
        if (session && session.accessToken) {
            applySession(session);
        }
        return session;
    });
}
function applySession(session) {
    var _a, _b, _c;
    const oldSub = (0, token_1.getCurrentSub)();
    const newSub = (_a = session.user) === null || _a === void 0 ? void 0 : _a.sub;
    const switched = Boolean(oldSub && newSub && oldSub !== newSub);
    if (switched) {
        clearUserLocalState();
    }
    (0, token_1.setToken)(session.accessToken, session.tokenType === 'guest' ? 'guest' : 'access', ((_b = session.user) === null || _b === void 0 ? void 0 : _b.role) || '');
    (0, token_1.setAvailableRoles)(((_c = session.user) === null || _c === void 0 ? void 0 : _c.roles) || []);
    (0, token_1.setCurrentRole)((session.user && session.user.role) || '');
    if (newSub) {
        (0, token_1.setCurrentSub)(newSub);
    }
}
const USER_PROFILE_CACHE_KEY = 'farm_user_profile_cache';
function clearUserLocalState() {
    var _a, _b;
    (0, token_1.removeToken)();
    (0, app_1.invalidateCartItemCount)();
    try {
        wx.removeStorageSync(USER_PROFILE_CACHE_KEY);
    }
    catch (error) {
        // storage may not be available; ignore
    }
    try {
        (0, profile_1.clearProfileDraft)();
    }
    catch (error) {
        // ignore
    }
    try {
        const app = getApp();
        (_b = (_a = app === null || app === void 0 ? void 0 : app.eventBus) === null || _a === void 0 ? void 0 : _a.emit) === null || _b === void 0 ? void 0 : _b.call(_a, 'user:switched');
    }
    catch (error) {
        // event bus not ready; ignore
    }
}
exports.refreshSessionToken = refreshToken;
