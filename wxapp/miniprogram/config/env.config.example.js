"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.REQUEST_TIMEOUT = exports.QR_CODE_API_URL = exports.TRACE_BASE_URL = exports.API_BASE_URLS = void 0;
/**
 * 本地开发环境配置 - 模板文件
 * 实际配置请复制本文件为 `env.config.ts` 并填入真实值
 * `env.config.ts` 已加入 .gitignore
 *
 * 三个环境对应小程序运行环境:
 * - dev:  开发版 (wx.getAccountInfoSync().miniProgram.envVersion === 'develop')
 * - test: 体验版 ('trial')
 * - prod: 正式版 ('release')
 *
 * 开发调试时，dev 直接指向真实 /api 接口：
 * - http://YOUR_DEV_HOST:6002/api
 */
exports.API_BASE_URLS = {
    dev: 'http://YOUR_DEV_HOST:6002/api',
    test: 'https://test-api.your-domain.com/api',
    prod: 'https://api.your-domain.com/api',
};
/** 溯源页面 URL 前缀（用于生成溯源二维码） */
exports.TRACE_BASE_URL = 'https://farm.your-domain.com/trace';
/** 二维码生成 API（用于生成商品溯源二维码图片） */
exports.QR_CODE_API_URL = 'https://api.qrserver.com/v1/create-qr-code/';
/** 请求超时（毫秒） */
exports.REQUEST_TIMEOUT = 10000;
