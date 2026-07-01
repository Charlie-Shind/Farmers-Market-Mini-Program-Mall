"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.request = request;
exports.upload = upload;
exports.get = get;
exports.post = post;
exports.del = del;
const index_1 = require("../config/index");
const logger_1 = require("../utils/logger");
const auth_route_1 = require("../utils/auth-route");
const auth_1 = require("./auth");
const token_1 = require("./token");
function resolveUrl(url) {
    if (/^https?:\/\//i.test(url)) {
        return url;
    }
    return `${index_1.API_BASE}${url.startsWith('/') ? url : `/${url}`}`;
}
function parseEnvelope(payload) {
    if (!payload || typeof payload !== 'object') {
        return null;
    }
    return payload;
}
function getAuthBootstrapReady() {
    var _a;
    try {
        const app = getApp();
        return ((_a = app.globalData) === null || _a === void 0 ? void 0 : _a.authBootstrapReady) || Promise.resolve();
    }
    catch {
        return Promise.resolve();
    }
}
function getErrorMessage(payload, fallback) {
    if (!payload) {
        return fallback;
    }
    return payload.message || fallback;
}
function redirectToLoginPage() {
    var _a;
    try {
        const pages = getCurrentPages();
        const currentRoute = ((_a = pages[pages.length - 1]) === null || _a === void 0 ? void 0 : _a.route) ? `/${pages[pages.length - 1].route}` : '';
        const loginUrl = currentRoute && (0, auth_route_1.isMerchantRoute)(currentRoute)
            ? (0, auth_route_1.buildMerchantLoginUrl)(currentRoute)
            : (0, auth_route_1.buildProfileLoginUrl)(currentRoute || '/pages/index/index');
        if (currentRoute.includes('/pages/login/login')) {
            return;
        }
        wx.redirectTo({
            url: loginUrl,
        });
    }
    catch {
        wx.reLaunch({
            url: '/pages/login/login',
        });
    }
}
async function request(options) {
    const { auth = true, timeout = index_1.REQUEST_TIMEOUT, header = {} } = options;
    if (auth && !(0, token_1.getToken)()) {
        await getAuthBootstrapReady();
    }
    const token = (0, token_1.getToken)();
    return new Promise((resolve, reject) => {
        wx.request({
            url: resolveUrl(options.url),
            method: options.method || 'GET',
            data: options.data,
            timeout,
            header: {
                'content-type': 'application/json',
                ...(auth && token ? { Authorization: `Bearer ${token}` } : {}),
                ...header,
            },
            success: (res) => {
                const envelope = parseEnvelope(res.data);
                logger_1.logger.debug('request success', {
                    url: options.url,
                    statusCode: res.statusCode,
                    envelope,
                });
                if (res.statusCode === 401) {
                    (0, auth_1.clearUserLocalState)();
                    redirectToLoginPage();
                    reject(new Error(getErrorMessage(envelope, '登录已失效，请重新登录')));
                    return;
                }
                if (res.statusCode < 200 || res.statusCode >= 300) {
                    reject(new Error(getErrorMessage(envelope, `请求失败：${res.statusCode}`)));
                    return;
                }
                if (envelope && envelope.success === false) {
                    reject(new Error(getErrorMessage(envelope, '请求失败')));
                    return;
                }
                resolve((envelope && envelope.data != null ? envelope.data : null));
            },
            fail: (error) => {
                logger_1.logger.error('request fail', {
                    url: options.url,
                    error,
                });
                reject(new Error('网络请求失败，请稍后重试'));
            },
        });
    });
}
async function upload(options) {
    const { auth = true, timeout = index_1.REQUEST_TIMEOUT, header = {} } = options;
    if (auth && !(0, token_1.getToken)()) {
        await getAuthBootstrapReady();
    }
    const token = (0, token_1.getToken)();
    return new Promise((resolve, reject) => {
        wx.uploadFile({
            url: resolveUrl(options.url),
            filePath: options.filePath,
            name: options.name || 'file',
            formData: options.formData,
            timeout,
            header: {
                ...(auth && token ? { Authorization: `Bearer ${token}` } : {}),
                ...header,
            },
            success: (res) => {
                let payload = null;
                try {
                    payload = res.data ? JSON.parse(res.data) : null;
                }
                catch {
                    payload = null;
                }
                const envelope = parseEnvelope(payload);
                logger_1.logger.debug('upload success', {
                    url: options.url,
                    statusCode: res.statusCode,
                    envelope,
                });
                if (res.statusCode === 401) {
                    (0, auth_1.clearUserLocalState)();
                    redirectToLoginPage();
                    reject(new Error(getErrorMessage(envelope, '登录已失效，请重新登录')));
                    return;
                }
                if (res.statusCode < 200 || res.statusCode >= 300) {
                    reject(new Error(getErrorMessage(envelope, `上传失败：${res.statusCode}`)));
                    return;
                }
                if (envelope && envelope.success === false) {
                    reject(new Error(getErrorMessage(envelope, '上传失败')));
                    return;
                }
                resolve((envelope && envelope.data != null ? envelope.data : null));
            },
            fail: (error) => {
                logger_1.logger.error('upload fail', {
                    url: options.url,
                    error,
                });
                reject(new Error('上传失败，请稍后重试'));
            },
        });
    });
}
function get(url, data, options) {
    return request({
        url,
        data,
        method: 'GET',
        ...options,
    });
}
function post(url, data, options) {
    return request({
        url,
        data,
        method: 'POST',
        ...options,
    });
}
function del(url, data, options) {
    return request({
        url,
        data,
        method: 'DELETE',
        ...options,
    });
}
