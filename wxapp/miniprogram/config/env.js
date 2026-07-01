"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.REQUEST_TIMEOUT = exports.QR_CODE_API_URL = exports.TRACE_BASE_URL = exports.API_BASE = exports.API_BASE_MAP = exports.APP_ENV = exports.RUNTIME_ENV = void 0;
exports.getEnvLabel = getEnvLabel;
exports.getAppEnvLabel = getAppEnvLabel;
exports.buildTracePageUrl = buildTracePageUrl;
exports.buildQrCodeImageUrl = buildQrCodeImageUrl;
/**
 * 小程序环境配置入口
 *
 * 实际配置位于同级 env.config.ts（不入版本控制）
 * 如需新增配置项，请同时修改:
 *   - env.config.example.ts (模板)
 *   - env.config.ts (本地实际值)
 *   - 本文件 (类型声明 + 默认值)
 */
const env_config_1 = require("./env.config");
const DEFAULT_APP_ENV = 'dev';
function getMiniProgramRuntimeEnv() {
    try {
        return wx.getAccountInfoSync().miniProgram.envVersion;
    }
    catch (error) {
        return 'develop';
    }
}
exports.RUNTIME_ENV = getMiniProgramRuntimeEnv();
exports.APP_ENV = exports.RUNTIME_ENV === 'develop'
    ? 'dev'
    : exports.RUNTIME_ENV === 'trial'
        ? 'test'
        : 'prod';
/**
 * 三个环境的 API 地址
 * 由 env.config.ts 提供，本文件不内置任何 localhost / IP
 */
exports.API_BASE_MAP = env_config_1.API_BASE_URLS;
exports.API_BASE = exports.API_BASE_MAP[exports.APP_ENV] || exports.API_BASE_MAP[DEFAULT_APP_ENV];
/** 溯源页 URL 前缀 */
exports.TRACE_BASE_URL = env_config_1.TRACE_BASE_URL;
/** 二维码生成 API */
exports.QR_CODE_API_URL = env_config_1.QR_CODE_API_URL;
/** 请求超时（毫秒） */
exports.REQUEST_TIMEOUT = env_config_1.REQUEST_TIMEOUT;
function getEnvLabel(env = exports.RUNTIME_ENV) {
    if (env === 'develop')
        return '开发版';
    if (env === 'trial')
        return '体验版';
    return '正式版';
}
function getAppEnvLabel(env = exports.APP_ENV) {
    if (env === 'dev')
        return '开发环境';
    if (env === 'test')
        return '测试环境';
    return '生产环境';
}
/** 构造溯源页完整 URL */
function buildTracePageUrl(traceCode) {
    return `${exports.TRACE_BASE_URL}/${encodeURIComponent(traceCode)}`;
}
/** 构造二维码图片 URL */
function buildQrCodeImageUrl(data, size = 200) {
    const separator = exports.QR_CODE_API_URL.includes('?') ? '&' : '?';
    return `${exports.QR_CODE_API_URL}${separator}size=${size}x${size}&data=${encodeURIComponent(data)}`;
}
