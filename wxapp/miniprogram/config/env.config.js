"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.REQUEST_TIMEOUT = exports.QR_CODE_API_URL = exports.TRACE_BASE_URL = exports.API_BASE_URLS = void 0;
/**
 * 本地开发环境配置 - 实际值
 * 此文件不入版本控制，请勿提交
 * 真实部署时请修改为对应环境的 API 地址
 */
exports.API_BASE_URLS = {
    // dev: 'http://124.223.108.180:6002/api',
    // test: 'http://124.223.108.180:6002/api',
    // prod: 'http://124.223.108.180:6002/api',
    // dev: 'http://localhost:6007/api',
    // test: 'http://localhost:6007/api',
    // prod: 'http://localhost:6007/api',
    dev: 'https://xn--5mqs1ehx3beeb.cn/api',
    test: 'https://xn--5mqs1ehx3beeb.cn/api',
    prod: 'https://xn--5mqs1ehx3beeb.cn/api',    
};
exports.TRACE_BASE_URL = 'https://farm.example.com/trace';
exports.QR_CODE_API_URL = 'https://api.qrserver.com/v1/create-qr-code/';
exports.REQUEST_TIMEOUT = 10000;
